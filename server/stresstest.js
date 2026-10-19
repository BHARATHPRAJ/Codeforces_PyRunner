import fs from 'fs';
import path from 'path';
import os from 'os';
import { runSingleTestCaseWithFile, normalizeOutput } from './runner.js';
import { createSandboxExecutor, isSandboxExecutionEnabled } from './sandbox-executor.js';

const MAX_STRESS_DURATION_MS = 60_000;

function cleanupDir(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Execute stress testing loop until counter-example is found or max iterations reached.
 */
export async function runStressTest({
  solutionCode,
  generatorCode,
  bruteCode,
  runtimeCmd,
  timeoutMs = 2000,
  maxIterations = 50
}) {
  let counterExampleFound = false;
  let result = null;

  const sandboxExecutor = isSandboxExecutionEnabled() ? await createSandboxExecutor() : null;
  const tempDir = sandboxExecutor ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'cf-stress-'));
  const genFile = tempDir ? path.join(tempDir, 'generator.py') : null;
  const solFile = tempDir ? path.join(tempDir, 'solution.py') : null;
  const bruteFile = tempDir ? path.join(tempDir, 'brute.py') : null;
  const startedAt = Date.now();

  try {
    if (!sandboxExecutor) {
      fs.writeFileSync(genFile, generatorCode, 'utf-8');
      fs.writeFileSync(solFile, solutionCode, 'utf-8');
      fs.writeFileSync(bruteFile, bruteCode, 'utf-8');
    }

    const runProgram = ({ fileName, scriptPath, code, input, timeoutMs }) => {
      if (sandboxExecutor) {
        return sandboxExecutor.run({
          fileName,
          code,
          input,
          expectedOutput: '',
          timeoutMs,
          memoryLimitMb: 512
        });
      }

      return runSingleTestCaseWithFile({
        scriptPath,
        input,
        expectedOutput: '',
        runtimeCmd,
        timeoutMs
      });
    };

    for (let i = 1; i <= maxIterations; i++) {
      if (Date.now() - startedAt >= MAX_STRESS_DURATION_MS) {
        return {
          success: false,
          error: `Stress test stopped after reaching the ${MAX_STRESS_DURATION_MS / 1000}-second time limit.`
        };
      }

      // 1. Generate test case input
      const genRes = await runProgram({
        fileName: 'generator.py',
        scriptPath: genFile,
        code: generatorCode,
        input: `${i} ${Date.now()}`,
        timeoutMs: 5000
      });

      if (['RTE', 'TLE', 'MLE'].includes(genRes.status)) {
        return {
          success: false,
          error: `Generator failed at iteration ${i}: ${genRes.stderr || 'Runtime/Time Limit Error'}`
        };
      }

      const testInput = genRes.stdout;

      // 2. Run Solution Code
      const solRes = await runProgram({
        fileName: 'solution.py',
        scriptPath: solFile,
        code: solutionCode,
        input: testInput,
        timeoutMs
      });

      // 3. Run Brute Force Code
      const bruteRes = await runProgram({
        fileName: 'brute.py',
        scriptPath: bruteFile,
        code: bruteCode,
        input: testInput,
        timeoutMs: timeoutMs * 2 // allow slightly more time for brute force
      });

      const solOut = normalizeOutput(solRes.stdout);
      const bruteOut = normalizeOutput(bruteRes.stdout);

      if (['RTE', 'TLE', 'MLE'].includes(bruteRes.status)) {
        return {
          success: false,
          error: `Brute-force program failed at iteration ${i}: ${bruteRes.stderr || bruteRes.status}`
        };
      }

      // Check if solution failed or outputs mismatch
      const isMismatch = solOut !== bruteOut;
      const isError = ['RTE', 'TLE', 'MLE'].includes(solRes.status);

      if (isMismatch || isError) {
        counterExampleFound = true;
        result = {
          iteration: i,
          input: testInput,
          solutionStatus: solRes.status,
          solutionOutput: solRes.stdout,
          solutionStderr: solRes.stderr,
          solutionTimeMs: solRes.executionTimeMs,
          bruteStatus: bruteRes.status,
          bruteOutput: bruteRes.stdout,
          bruteStderr: bruteRes.stderr,
          bruteTimeMs: bruteRes.executionTimeMs,
          reason: isError ? `Solution returned ${solRes.status}` : 'Output mismatch'
        };
        break;
      }
    }
  } finally {
    cleanupDir(tempDir);
    await sandboxExecutor?.close();
  }

  if (counterExampleFound) {
    return {
      success: true,
      counterExampleFound: true,
      ...result
    };
  }

  return {
    success: true,
    counterExampleFound: false,
    iterationsPassed: maxIterations,
    message: `All ${maxIterations} tests passed! No counter-examples found.`
  };
}

