import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createSandboxExecutor, isSandboxExecutionEnabled } from './sandbox-executor.js';

const MAX_BUFFER_SIZE = 1024 * 1024; // 1 MB buffer safety cap

/**
 * Clean and normalize text output for competitive programming comparisons.
 * Ignores trailing whitespace per line and trailing blank lines, handles \r\n vs \n.
 */
export function normalizeOutput(text) {
  if (text === null || text === undefined) return '';
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

function cleanupDir(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Helper Python wrapper code to track peak memory allocations via tracemalloc.
 */
export const WRAPPER_CODE = `import sys, runpy, tracemalloc

tracemalloc.start()
try:
    runpy.run_path(sys.argv[1], run_name='__main__')
finally:
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    sys.stderr.write(f"\\n__CF_MEM_BYTES__:{peak}\\n")
`;

/**
 * Execute Python/PyPy code given a pre-created script file path and optional wrapper.
 */
export function runSingleTestCaseWithFile({ scriptPath, wrapperPath, input, expectedOutput, runtimeCmd, timeoutMs, memoryLimitMb = 512 }) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    let stdoutData = '';
    let stderrData = '';
    let isTimedOut = false;
    let isFinished = false;

    const cmd = runtimeCmd || 'python';
    const args = wrapperPath ? [wrapperPath, scriptPath] : [scriptPath];

    let child;
    try {
      child = spawn(cmd, args, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      return resolve({
        status: 'RTE',
        stdout: '',
        stderr: `Failed to spawn executable "${cmd}": ${err.message}`,
        executionTimeMs: 0,
        peakMemoryMb: 0,
        outputMatches: false,
      });
    }

    const timer = setTimeout(() => {
      if (!isFinished) {
        isTimedOut = true;
        try {
          if (os.platform() === 'win32') {
            spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
          } else {
            child.kill('SIGKILL');
          }
        } catch (e) {
          // ignore kill errors
        }
      }
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      if (stdoutData.length < MAX_BUFFER_SIZE) {
        stdoutData += data.toString('utf-8');
        if (stdoutData.length >= MAX_BUFFER_SIZE) {
          stdoutData += '\n[Output truncated: Exceeded 1MB limit]';
        }
      }
    });

    child.stderr.on('data', (data) => {
      if (stderrData.length < MAX_BUFFER_SIZE) {
        stderrData += data.toString('utf-8');
        if (stderrData.length >= MAX_BUFFER_SIZE) {
          stderrData += '\n[Stderr truncated: Exceeded 1MB limit]';
        }
      }
    });

    child.on('error', (err) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timer);
      const endTime = process.hrtime.bigint();
      const executionTimeMs = Number(endTime - startTime) / 1e6;

      resolve({
        status: 'RTE',
        stdout: stdoutData,
        stderr: err.message || 'Execution Error',
        executionTimeMs: Math.round(executionTimeMs),
        peakMemoryMb: 0,
        outputMatches: false
      });
    });

    child.on('close', (codeExit) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timer);
      const endTime = process.hrtime.bigint();
      const executionTimeMs = Number(endTime - startTime) / 1e6;

      // Extract peak memory marker from stderr
      let peakMemoryMb = 0.1;
      const memMatch = stderrData.match(/__CF_MEM_BYTES__:(\d+)/);
      if (memMatch) {
        const peakBytes = parseInt(memMatch[1], 10);
        peakMemoryMb = Math.round((peakBytes / (1024 * 1024)) * 10) / 10;
        stderrData = stderrData.replace(/\n?__CF_MEM_BYTES__:\d+\n?/, '').trim();
      }

      if (isTimedOut) {
        return resolve({
          status: 'TLE',
          stdout: stdoutData,
          stderr: `Time Limit Exceeded (${timeoutMs} ms)`,
          executionTimeMs: timeoutMs,
          peakMemoryMb,
          outputMatches: false
        });
      }

      // Check Memory Limit Exceeded (MLE)
      if (memoryLimitMb && peakMemoryMb > memoryLimitMb) {
        return resolve({
          status: 'MLE',
          stdout: stdoutData,
          stderr: `Memory Limit Exceeded (${peakMemoryMb} MB > ${memoryLimitMb} MB limit)\n${stderrData}`,
          executionTimeMs: Math.round(executionTimeMs),
          peakMemoryMb,
          outputMatches: false
        });
      }

      if (codeExit !== 0) {
        return resolve({
          status: 'RTE',
          stdout: stdoutData,
          stderr: stderrData || `Process exited with error code ${codeExit}`,
          executionTimeMs: Math.round(executionTimeMs),
          peakMemoryMb,
          outputMatches: false
        });
      }

      const normalizedActual = normalizeOutput(stdoutData);
      const normalizedExpected = normalizeOutput(expectedOutput);

      let status = 'AC';
      let outputMatches = true;

      if (expectedOutput !== undefined && expectedOutput !== null && expectedOutput !== '') {
        if (normalizedActual !== normalizedExpected) {
          status = 'WA';
          outputMatches = false;
        }
      }

      resolve({
        status,
        stdout: stdoutData,
        stderr: stderrData,
        executionTimeMs: Math.round(executionTimeMs),
        peakMemoryMb,
        outputMatches,
        normalizedActual,
        normalizedExpected
      });
    });

    try {
      if (input) {
        child.stdin.write(input);
      }
      child.stdin.end();
    } catch (e) {
      // ignore stdin write errors
    }
  });
}

/**
 * Execute Python/PyPy code against a single test case (creates temp file and cleans up).
 */
export async function runSingleTestCase({ code, input, expectedOutput, runtimeCmd, timeoutMs, memoryLimitMb = 512 }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-py-'));
  const tempFile = path.join(tempDir, 'solution.py');
  const wrapperFile = path.join(tempDir, 'wrapper.py');
  try {
    fs.writeFileSync(tempFile, code, 'utf-8');
    fs.writeFileSync(wrapperFile, WRAPPER_CODE, 'utf-8');
    return await runSingleTestCaseWithFile({
      scriptPath: tempFile,
      wrapperPath: wrapperFile,
      input,
      expectedOutput,
      runtimeCmd,
      timeoutMs,
      memoryLimitMb
    });
  } finally {
    cleanupDir(tempDir);
  }
}

/**
 * Run solution against multiple test cases concurrently using single-write batch execution.
 */
export async function runAllTestCases({ code, testCases, runtimeCmd, timeoutMs = 2000, memoryLimitMb = 512 }) {
  if (isSandboxExecutionEnabled()) {
    const executor = await createSandboxExecutor();
    try {
      const results = [];
      for (const testCase of testCases) {
        if (testCase.disabled) {
          results.push({
            id: testCase.id,
            status: 'SKIPPED',
            stdout: '',
            stderr: '',
            executionTimeMs: 0,
            peakMemoryMb: 0,
            disabled: true
          });
          continue;
        }

        const result = await executor.run({
          fileName: 'solution.py',
          code,
          wrapperCode: WRAPPER_CODE,
          input: testCase.input || '',
          expectedOutput: testCase.expectedOutput || '',
          timeoutMs,
          memoryLimitMb
        });
        results.push({ id: testCase.id, ...result });
      }
      return results;
    } finally {
      await executor.close();
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-batch-'));
  const tempFile = path.join(tempDir, 'solution.py');
  const wrapperFile = path.join(tempDir, 'wrapper.py');
  fs.writeFileSync(tempFile, code, 'utf-8');
  fs.writeFileSync(wrapperFile, WRAPPER_CODE, 'utf-8');

  try {
    const promises = testCases.map(async (tc) => {
      if (tc.disabled) {
        return {
          id: tc.id,
          status: 'SKIPPED',
          stdout: '',
          stderr: '',
          executionTimeMs: 0,
          peakMemoryMb: 0,
          disabled: true
        };
      }

      const res = await runSingleTestCaseWithFile({
        scriptPath: tempFile,
        wrapperPath: wrapperFile,
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || '',
        runtimeCmd,
        timeoutMs,
        memoryLimitMb
      });

      return {
        id: tc.id,
        ...res
      };
    });

    return await Promise.all(promises);
  } finally {
    cleanupDir(tempDir);
  }
}


