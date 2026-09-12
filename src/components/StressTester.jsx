import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Flame, Play, CheckCircle2, AlertOctagon, PlusCircle, RefreshCw, Cpu } from 'lucide-react';

export default function StressTester({ solutionCode, onAddTestCase, runtime }) {
  const [genCode, setGenCode] = useState(`import random

def solve():
    # Generate random test input
    n = random.randint(1, 10)
    arr = [random.randint(1, 20) for _ in range(n)]
    print(n)
    print(*arr)

if __name__ == '__main__':
    solve()
`);

  const [bruteCode, setBruteCode] = useState(`import sys

def solve():
    input = sys.stdin.read
    data = input().split()
    if not data:
        return
    # Simple brute force solution logic
    n = int(data[0])
    arr = [int(x) for x in data[1:n+1]]
    print(sum(arr))

if __name__ == '__main__':
    solve()
`);

  const [activeTab, setActiveTab] = useState('gen'); // 'gen' or 'brute'
  const [isRunning, setIsRunning] = useState(false);
  const [maxIterations, setMaxIterations] = useState(50);
  const [stressResult, setStressResult] = useState(null);

  const runStressTest = useCallback(async () => {
    setIsRunning(true);
    setStressResult(null);

    try {
      const res = await fetch('/api/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solutionCode,
          generatorCode: genCode,
          bruteCode,
          runtimeCmd: runtime,
          timeoutMs: 2000,
          maxIterations: Number(maxIterations) || 50
        })
      });

      const data = await res.json();
      setStressResult(data);
    } catch (err) {
      setStressResult({
        success: false,
        error: err.message || 'Failed to execute stress test server call'
      });
    } finally {
      setIsRunning(false);
    }
  }, [solutionCode, genCode, bruteCode, runtime, maxIterations]);

  const handleImportCounterExample = useCallback(() => {
    if (!stressResult || !stressResult.counterExampleFound) return;
    const newTC = {
      id: 'tc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      input: stressResult.input,
      expectedOutput: stressResult.bruteOutput || '',
      disabled: false
    };
    onAddTestCase(newTC);
  }, [stressResult, onAddTestCase]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-200 text-sm">Stress Tester (Generator vs Brute Force)</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Iterations:</span>
            <input
              type="number"
              min={5}
              max={200}
              value={maxIterations}
              onChange={(e) => setMaxIterations(e.target.value)}
              className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={runStressTest}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg shadow-lg shadow-amber-500/20 transition"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isRunning ? 'Stress Testing...' : 'Start Stress Test'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Code Editors on Left, Results on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[350px]">
        {/* Generator & Brute Force Editor Pane */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60">
            <button
              onClick={() => setActiveTab('gen')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
                activeTab === 'gen'
                  ? 'border-amber-500 text-amber-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Generator (gen.py)
            </button>
            <button
              onClick={() => setActiveTab('brute')}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
                activeTab === 'brute'
                  ? 'border-amber-500 text-amber-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Brute Force Solution (brute.py)
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative min-h-[280px]">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={activeTab === 'gen' ? genCode : bruteCode}
              onChange={(val) => {
                if (activeTab === 'gen') setGenCode(val || '');
                else setBruteCode(val || '');
              }}
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', monospace",
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
              }}
            />
          </div>
        </div>

        {/* Stress Test Output / Counter-Example Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between overflow-y-auto">
          {isRunning ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-200">Running random test suite...</p>
              <p className="text-xs text-slate-400">Comparing solution vs brute force outputs up to {maxIterations} tests</p>
            </div>
          ) : stressResult ? (
            stressResult.counterExampleFound ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-rose-950/40 border border-rose-800/60 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <AlertOctagon className="w-5 h-5" />
                    <span>Counter-Example Found! (Test #{stressResult.iteration})</span>
                  </div>
                  <button
                    onClick={handleImportCounterExample}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-slate-950 rounded transition shadow"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add to Test Cases</span>
                  </button>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="block text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Failing Test Input:
                    </label>
                    <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {stressResult.input}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-sans font-semibold uppercase tracking-wider text-rose-400 mb-1">
                        Solution Output ({stressResult.solutionStatus}):
                      </label>
                      <pre className="p-2.5 bg-slate-950 border border-rose-950 text-rose-300 rounded-lg whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {stressResult.solutionOutput || stressResult.solutionStderr || '[Empty]'}
                      </pre>
                    </div>
                    <div>
                      <label className="block text-[10px] font-sans font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                        Brute Force Output (Expected):
                      </label>
                      <pre className="p-2.5 bg-slate-950 border border-emerald-950 text-emerald-300 rounded-lg whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {stressResult.bruteOutput || '[Empty]'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : stressResult.success ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 p-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <h4 className="text-base font-bold text-slate-200">No Counter-Examples Found!</h4>
                <p className="text-xs text-slate-400">{stressResult.message}</p>
              </div>
            ) : (
              <div className="p-4 bg-rose-950/30 border border-rose-800 rounded-lg text-xs text-rose-300">
                <p className="font-bold">Error executing stress test:</p>
                <p className="mt-1">{stressResult.error}</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
              <Cpu className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">Click "Start Stress Test" to automatically find input cases where your main code fails or gives Wrong Answer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
