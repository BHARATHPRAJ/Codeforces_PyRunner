import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, timingSafeEqual } from 'node:crypto';
import { runAllTestCases } from './runner.js';
import { detectRuntimes } from './detector.js';
import { runStressTest } from './stresstest.js';
import { isSandboxExecutionEnabled, validateExecutionConfig } from './sandbox-executor.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MAX_CONCURRENT_EXECUTIONS = 3;
const MAX_CODE_LENGTH = 100_000;
const MAX_CASE_TEXT_LENGTH = 64_000;
let activeExecutions = 0;
const clientDistPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

class RequestValidationError extends Error {
  statusCode = 400;
}

function boundedInteger(value, fallback, min, max, name) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new RequestValidationError(`${name} must be an integer between ${min} and ${max}.`);
  }
  return number;
}

function validateCode(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new RequestValidationError(`${name} is required.`);
  }
  if (value.length > MAX_CODE_LENGTH) {
    throw new RequestValidationError(`${name} must be at most ${MAX_CODE_LENGTH} characters.`);
  }
}

function hasValidAccessPassword(authorization) {
  if (!authorization?.startsWith('Basic ')) return false;

  let suppliedPassword;
  try {
    const credentials = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
    const separator = credentials.indexOf(':');
    if (separator < 0) return false;
    suppliedPassword = credentials.slice(separator + 1);
  } catch {
    return false;
  }

  const expectedHash = createHash('sha256').update(process.env.APP_ACCESS_PASSWORD).digest();
  const suppliedHash = createHash('sha256').update(suppliedPassword).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

function requireAppAccess(req, res, next) {
  if (req.path === '/api/health') return next();
  if (hasValidAccessPassword(req.headers.authorization)) return next();

  res.set('WWW-Authenticate', 'Basic realm="PyRunner", charset="UTF-8"');
  res.status(401).send('Authentication required.');
}

function limitConcurrentExecutions(handler) {
  return (req, res, next) => {
    if (activeExecutions >= MAX_CONCURRENT_EXECUTIONS) {
      res.set('Retry-After', '5');
      return res.status(429).json({
        success: false,
        error: 'Runner is busy. Please try again in a few seconds.'
      });
    }

    activeExecutions += 1;
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next)
      .finally(() => {
        activeExecutions -= 1;
      });
  };
}

if (process.env.NODE_ENV === 'production') {
  if (!process.env.APP_ACCESS_PASSWORD || process.env.APP_ACCESS_PASSWORD.length < 16) {
    throw new Error('Set APP_ACCESS_PASSWORD to a value at least 16 characters long in production.');
  }
  app.use(requireAppAccess);
}

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true });
});

// 1. Detect runtimes
app.get('/api/runtimes', async (req, res) => {
  try {
    if (isSandboxExecutionEnabled()) {
      return res.json({
        success: true,
        runtimes: [{
          id: 'python3',
          name: 'Python 3 (Isolated Sandbox)',
          cmd: 'python3',
          version: 'Python 3.14',
          available: true
        }]
      });
    }

    const runtimes = await detectRuntimes();
    res.json({ success: true, runtimes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Execute code on testcases
app.post('/api/run', limitConcurrentExecutions(async (req, res) => {
  try {
    const body = req.body || {};
    const { code, testCases, runtimeCmd } = body;
    validateCode(code, 'Code content');
    const sandboxMode = isSandboxExecutionEnabled();
    const maximumTestCases = sandboxMode ? 15 : 100;
    if (!Array.isArray(testCases) || testCases.length > maximumTestCases) {
      throw new RequestValidationError(`testCases must be an array with at most ${maximumTestCases} entries.`);
    }

    const normalizedTestCases = testCases.map((testCase, index) => {
      if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
        throw new RequestValidationError(`Test case ${index + 1} is invalid.`);
      }
      const input = testCase.input ?? '';
      const expectedOutput = testCase.expectedOutput ?? '';
      if (typeof input !== 'string' || typeof expectedOutput !== 'string' ||
          input.length > MAX_CASE_TEXT_LENGTH || expectedOutput.length > MAX_CASE_TEXT_LENGTH) {
        throw new RequestValidationError(`Test case ${index + 1} input and output must be strings up to ${MAX_CASE_TEXT_LENGTH} characters.`);
      }
      return {
        id: String(testCase.id ?? index + 1).slice(0, 100),
        input,
        expectedOutput,
        disabled: testCase.disabled === true
      };
    });

    const timeoutMs = boundedInteger(body.timeoutMs, 2000, 100, sandboxMode ? 5000 : 10_000, 'timeoutMs');
    const memoryLimitMb = boundedInteger(body.memoryLimitMb, 512, 16, 1024, 'memoryLimitMb');
    const results = await runAllTestCases({
      code,
      testCases: normalizedTestCases,
      runtimeCmd: runtimeCmd || 'python',
      timeoutMs,
      memoryLimitMb
    });

    res.json({ success: true, results });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}));

// 3. Stress test counter-example generator
app.post('/api/stress-test', limitConcurrentExecutions(async (req, res) => {
  try {
    const body = req.body || {};
    const { solutionCode, generatorCode, bruteCode, runtimeCmd } = body;
    validateCode(solutionCode, 'solutionCode');
    validateCode(generatorCode, 'generatorCode');
    validateCode(bruteCode, 'bruteCode');

    const timeoutMs = boundedInteger(body.timeoutMs, 2000, 100, 5000, 'timeoutMs');
    const maxIterations = boundedInteger(body.maxIterations, 50, 1, 200, 'maxIterations');

    const result = await runStressTest({
      solutionCode,
      generatorCode,
      bruteCode,
      runtimeCmd: runtimeCmd || 'python',
      timeoutMs,
      maxIterations
    });

    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.status === 413 || err.statusCode === 413) {
    return res.status(413).json({ success: false, error: 'Request body exceeds the 2 MB limit.' });
  }
  if (err.status === 400 || err.statusCode === 400) {
    return res.status(400).json({ success: false, error: 'Invalid JSON request body.' });
  }
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

validateExecutionConfig();

app.listen(PORT, () => {
  console.log(`⚡ Codeforces PyRunner server running on http://localhost:${PORT}`);
});
