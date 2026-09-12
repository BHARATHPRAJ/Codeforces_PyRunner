import express from 'express';
import cors from 'cors';
import { runAllTestCases } from './runner.js';
import { detectRuntimes } from './detector.js';
import { runStressTest } from './stresstest.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Detect runtimes
app.get('/api/runtimes', async (req, res) => {
  try {
    const runtimes = await detectRuntimes();
    res.json({ success: true, runtimes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Execute code on testcases
app.post('/api/run', async (req, res) => {
  try {
    const { code, testCases, runtimeCmd, timeoutMs, memoryLimitMb } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code content is required.' });
    }
    if (!testCases || !Array.isArray(testCases)) {
      return res.status(400).json({ success: false, error: 'testCases array is required.' });
    }

    const results = await runAllTestCases({
      code,
      testCases,
      runtimeCmd: runtimeCmd || 'python',
      timeoutMs: Number(timeoutMs) || 2000,
      memoryLimitMb: Number(memoryLimitMb) || 512
    });

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Stress test counter-example generator
app.post('/api/stress-test', async (req, res) => {
  try {
    const { solutionCode, generatorCode, bruteCode, runtimeCmd, timeoutMs, maxIterations } = req.body;

    if (!solutionCode || !generatorCode || !bruteCode) {
      return res.status(400).json({
        success: false,
        error: 'solutionCode, generatorCode, and bruteCode are all required.'
      });
    }

    const result = await runStressTest({
      solutionCode,
      generatorCode,
      bruteCode,
      runtimeCmd: runtimeCmd || 'python',
      timeoutMs: Number(timeoutMs) || 2000,
      maxIterations: Number(maxIterations) || 50
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ Codeforces PyRunner server running on http://localhost:${PORT}`);
});
