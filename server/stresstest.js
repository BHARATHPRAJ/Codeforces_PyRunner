import fs from 'fs';
import path from 'path';
import os from 'os';
import { runSingleTestCaseWithFile, normalizeOutput } from './runner.js';

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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-stress-'));
  const genFile = path.join(tempDir, 'generator.py');
  const solFile = path.join(tempDir, 'solution.py');
  const bruteFile = path.join(tempDir, 'brute.py');

  try {
    fs.writeFileSync(genFile, generatorCode, 'utf-8');
    fs.writeFileSync(solFile, solutionCode, 'utf-8');
    fs.writeFileSync(bruteFile, bruteCode, 'utf-8');

    for (let i = 1; i <= maxIterations; i++) {
      // 1. Generate test case input
      const genRes = await runSingleTestCaseWithFile({
        scriptPath: genFile,
        input: `${i} ${Date.now()}`,
        expectedOutput: '',
        runtimeCmd,
        timeoutMs: 5000
      });

      if (genRes.status === 'RTE' || genRes.status === 'TLE') {
        return {
          success: false,
          error: `Generator failed at iteration ${i}: ${genRes.stderr || 'Runtime/Time Limit Error'}`
        };
      }

      const testInput = genRes.stdout;

      // 2. Run Solution Code
      const solRes = await runSingleTestCaseWithFile({
        scriptPath: solFile,
        input: testInput,
        expectedOutput: '',
        runtimeCmd,
        timeoutMs
      });

      // 3. Run Brute Force Code
      const bruteRes = await runSingleTestCaseWithFile({
        scriptPath: bruteFile,
        input: testInput,
        expectedOutput: '',
        runtimeCmd,
        timeoutMs: timeoutMs * 2 // allow slightly more time for brute force
      });

      const solOut = normalizeOutput(solRes.stdout);
      const bruteOut = normalizeOutput(bruteRes.stdout);

      // Check if solution failed or outputs mismatch
      const isMismatch = solOut !== bruteOut;
      const isError = solRes.status === 'RTE' || solRes.status === 'TLE';

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

