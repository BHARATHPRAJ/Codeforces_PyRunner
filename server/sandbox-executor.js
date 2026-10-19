import { Sandbox } from '@vercel/sandbox';
import { Readable, Writable } from 'node:stream';

const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_SANDBOX_SESSION_MS = 120_000;
const SANDBOX_CREDENTIALS = ['VERCEL_TOKEN', 'VERCEL_TEAM_ID', 'VERCEL_PROJECT_ID'];

function getCredentials() {
  const missing = SANDBOX_CREDENTIALS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing sandbox configuration: ${missing.join(', ')}`);
  }

  return {
    token: process.env.VERCEL_TOKEN,
    teamId: process.env.VERCEL_TEAM_ID,
    projectId: process.env.VERCEL_PROJECT_ID
  };
}

export function getExecutionMode() {
  const configuredMode = process.env.EXECUTION_MODE;

  if (configuredMode === 'local') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Local code execution is disabled in production.');
    }
    return 'local';
  }

  if (configuredMode && configuredMode !== 'sandbox') {
    throw new Error(`Unsupported EXECUTION_MODE: ${configuredMode}`);
  }

  return process.env.NODE_ENV === 'production' || configuredMode === 'sandbox'
    ? 'sandbox'
    : 'local';
}

export function validateExecutionConfig() {
  if (getExecutionMode() === 'sandbox') getCredentials();
}

export function isSandboxExecutionEnabled() {
  return getExecutionMode() === 'sandbox';
}

function createOutputCapture() {
  const chunks = [];
  let capturedBytes = 0;
  let truncated = false;

  const stream = new Writable({
    write(chunk, encoding, callback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      const remaining = MAX_OUTPUT_BYTES - capturedBytes;
      if (remaining > 0) {
        const captured = buffer.subarray(0, remaining);
        chunks.push(captured);
        capturedBytes += captured.length;
      }
      if (buffer.length > remaining) truncated = true;
      callback();
    }
  });

  return {
    stream,
    getOutput() {
      const output = Buffer.concat(chunks).toString('utf8');
      return truncated ? `${output}\n[Output truncated: Exceeded 1MB limit]` : output;
    }
  };
}

function normalizeOutput(text) {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function buildResult({ exitCode, stdout, stderr, executionTimeMs, timeoutMs, memoryLimitMb, expectedOutput }) {
  let peakMemoryMb = 0.1;
  const memoryMatch = stderr.match(/__CF_MEM_BYTES__:(\d+)/);
  if (memoryMatch) {
    peakMemoryMb = Math.round((Number(memoryMatch[1]) / (1024 * 1024)) * 10) / 10;
    stderr = stderr.replace(/\n?__CF_MEM_BYTES__:\d+\n?/, '').trim();
  }

  const outputMatches = expectedOutput === undefined || expectedOutput === null || expectedOutput === '' ||
    normalizeOutput(stdout) === normalizeOutput(expectedOutput);
  let status = outputMatches ? 'AC' : 'WA';

  if (exitCode === 124 || (exitCode === 137 && executionTimeMs >= timeoutMs)) {
    status = 'TLE';
    stderr = `Time Limit Exceeded (${timeoutMs} ms)`;
  } else if (exitCode === 137) {
    status = 'MLE';
    stderr = `Memory Limit Exceeded (${memoryLimitMb} MB limit)`;
  } else if (memoryLimitMb && peakMemoryMb > memoryLimitMb) {
    status = 'MLE';
    stderr = `Memory Limit Exceeded (${peakMemoryMb} MB > ${memoryLimitMb} MB limit)\n${stderr}`.trim();
  } else if (exitCode !== 0) {
    status = 'RTE';
    stderr ||= `Process exited with error code ${exitCode}`;
  }

  return {
    status,
    stdout,
    stderr,
    executionTimeMs,
    peakMemoryMb,
    outputMatches: status === 'AC',
    normalizedActual: normalizeOutput(stdout),
    normalizedExpected: normalizeOutput(expectedOutput)
  };
}

export async function createSandboxExecutor() {
  const sandbox = await Sandbox.create({
    ...getCredentials(),
    image: 'vercel/sandbox/universal',
    networkPolicy: 'deny-all',
    persistent: false,
    resources: { vcpus: 1 },
    timeout: MAX_SANDBOX_SESSION_MS
  });

  try {
    const runner = await sandbox.createUser('runner');

    return {
      async run({ fileName, code, wrapperCode, input = '', expectedOutput = '', timeoutMs = 2000, memoryLimitMb = 512 }) {
        if (!/^[a-zA-Z0-9_.-]+$/.test(fileName)) {
          throw new Error('Invalid internal sandbox file name.');
        }

        const files = [{ path: fileName, content: Buffer.from(code, 'utf8') }];
        if (wrapperCode) {
          files.push({ path: 'wrapper.py', content: Buffer.from(wrapperCode, 'utf8') });
        }
        await runner.writeFiles(files);

        const stdout = createOutputCapture();
        const stderr = createOutputCapture();
        const startedAt = process.hrtime.bigint();
        const pythonArgs = wrapperCode ? ['wrapper.py', fileName] : [fileName];
        const timeoutSeconds = Math.max(0.1, timeoutMs / 1000).toFixed(3);
        const command = `ulimit -v ${memoryLimitMb * 1024} && exec timeout --signal=TERM --kill-after=1 ${timeoutSeconds}s python3 ${pythonArgs.join(' ')}`;
        let result;

        try {
          result = await runner.runCommand({
            cmd: 'bash',
            args: ['-c', command],
            stdin: Readable.from([input]),
            stdout: stdout.stream,
            stderr: stderr.stream,
            timeoutMs: timeoutMs + 1500
          });
        } catch (error) {
          const elapsed = Number(process.hrtime.bigint() - startedAt) / 1e6;
          const errorOutput = `${stderr.getOutput()}\n${error.message || ''}`.trim();
          const timedOut = /timed?\s*out|timeout/i.test(error.message || '');
          return buildResult({
            exitCode: timedOut ? 124 : 1,
            stdout: stdout.getOutput(),
            stderr: errorOutput,
            executionTimeMs: Math.round(elapsed),
            timeoutMs,
            memoryLimitMb,
            expectedOutput
          });
        }

        const elapsed = Number(process.hrtime.bigint() - startedAt) / 1e6;
        return buildResult({
          exitCode: result.exitCode,
          stdout: stdout.getOutput(),
          stderr: stderr.getOutput(),
          executionTimeMs: Math.round(result.durationMs ?? elapsed),
          timeoutMs,
          memoryLimitMb,
          expectedOutput
        });
      },
      async close() {
        await sandbox.delete();
      }
    };
  } catch (error) {
    await sandbox.delete().catch(() => {});
    throw error;
  }
}