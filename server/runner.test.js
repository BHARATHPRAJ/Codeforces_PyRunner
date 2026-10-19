import assert from 'node:assert/strict';
import test from 'node:test';
import { detectRuntimes } from './detector.js';
import { runAllTestCases } from './runner.js';
import { validateExecutionConfig } from './sandbox-executor.js';
import { runStressTest } from './stresstest.js';

const environmentKeys = [
  'NODE_ENV',
  'EXECUTION_MODE',
  'VERCEL_TOKEN',
  'VERCEL_TEAM_ID',
  'VERCEL_PROJECT_ID'
];

function saveEnvironment() {
  return Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(saved) {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test('local mode runs Python and returns test results', async (context) => {
  const savedEnvironment = saveEnvironment();
  process.env.NODE_ENV = 'test';
  process.env.EXECUTION_MODE = 'local';

  try {
    const runtime = (await detectRuntimes()).find((candidate) => candidate.available);
    if (!runtime) {
      context.skip('Python or PyPy is not installed on this machine.');
      return;
    }

    const results = await runAllTestCases({
      code: 'print(input().strip())',
      testCases: [{ id: 'smoke', input: 'sandbox-check\n', expectedOutput: 'sandbox-check' }],
      runtimeCmd: runtime.cmd,
      timeoutMs: 2000,
      memoryLimitMb: 512
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'AC');
  } finally {
    restoreEnvironment(savedEnvironment);
  }
});

test('production execution requires Sandbox credentials', () => {
  const savedEnvironment = saveEnvironment();
  process.env.NODE_ENV = 'production';
  delete process.env.EXECUTION_MODE;
  delete process.env.VERCEL_TOKEN;
  delete process.env.VERCEL_TEAM_ID;
  delete process.env.VERCEL_PROJECT_ID;

  try {
    assert.throws(validateExecutionConfig, /Missing sandbox configuration/);
  } finally {
    restoreEnvironment(savedEnvironment);
  }
});

test('local stress tests run generator, solution, and brute programs', async (context) => {
  const savedEnvironment = saveEnvironment();
  process.env.NODE_ENV = 'test';
  process.env.EXECUTION_MODE = 'local';

  try {
    const runtime = (await detectRuntimes()).find((candidate) => candidate.available);
    if (!runtime) {
      context.skip('Python or PyPy is not installed on this machine.');
      return;
    }

    const result = await runStressTest({
      solutionCode: 'print(input().strip())',
      generatorCode: 'print("matching-output")',
      bruteCode: 'print(input().strip())',
      runtimeCmd: runtime.cmd,
      timeoutMs: 1000,
      maxIterations: 1
    });

    assert.equal(result.success, true);
    assert.equal(result.counterExampleFound, false);
    assert.equal(result.iterationsPassed, 1);
  } finally {
    restoreEnvironment(savedEnvironment);
  }
});