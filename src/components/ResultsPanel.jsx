import React, { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Play, ChevronRight, GitCompare, Terminal } from 'lucide-react';
import DiffViewer from './DiffViewer.jsx';

export default function ResultsPanel({ results, testCases, onRun, isRunning }) {
  const [selectedTcId, setSelectedTcId] = useState(null);

  if (isRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="relative flex items-center justify-center w-14 h-14 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <Play className="w-6 h-6 text-cyan-400 animate-pulse ml-0.5" />
        </div>
        <h4 className="text-base font-bold text-slate-200">Executing Solution...</h4>
        <p className="text-xs text-slate-400 mt-1">Running python/pypy process against test cases</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-900 border border-slate-800 rounded-xl text-center">
        <Terminal className="w-10 h-10 text-slate-600 mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">No Execution Results Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-400">Ctrl + Enter</kbd> or click "Run Tests" in the top bar to execute your Python/PyPy solution.
        </p>
        <button
          onClick={onRun}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-lg shadow-cyan-500/20 transition"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Run Tests Now</span>
        </button>
      </div>
    );
  }

  const { acCount, waCount, tleCount, rteCount, mleCount, activeResults } = useMemo(() => {
    const active = results.filter((r) => !r.disabled);
    return active.reduce(
      (acc, r) => {
        if (r.status === 'AC') acc.acCount++;
        else if (r.status === 'WA') acc.waCount++;
        else if (r.status === 'TLE') acc.tleCount++;
        else if (r.status === 'MLE') acc.mleCount++;
        else if (r.status === 'RTE') acc.rteCount++;
        return acc;
      },
      { acCount: 0, waCount: 0, tleCount: 0, rteCount: 0, mleCount: 0, activeResults: active }
    );
  }, [results]);

  const currentResult = results.find((r) => r.id === selectedTcId) || results[0];
  const currentTc = testCases.find((tc) => tc.id === (currentResult ? currentResult.id : null));

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Overview Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          {acCount === activeResults.length && activeResults.length > 0 ? (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>ACCEPTED (All {activeResults.length} Passed)</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-2 font-bold text-sm">
              <span>Results Summary:</span>
            </div>
          )}
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 text-xs font-mono font-semibold">
          <span className="badge-ac px-2.5 py-1 rounded-md">{acCount} AC</span>
          {waCount > 0 && <span className="badge-wa px-2.5 py-1 rounded-md">{waCount} WA</span>}
          {tleCount > 0 && <span className="badge-tle px-2.5 py-1 rounded-md">{tleCount} TLE</span>}
          {mleCount > 0 && <span className="badge-tle px-2.5 py-1 rounded-md">{mleCount} MLE</span>}
          {rteCount > 0 && <span className="badge-rte px-2.5 py-1 rounded-md">{rteCount} RTE</span>}
        </div>
      </div>

      {/* Main Grid: Testcase list sidebar + Detailed Output & Diff viewer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[300px]">
        {/* Testcase selector sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 overflow-y-auto space-y-2 max-h-[450px]">
          {results.map((res, idx) => {
            const tc = testCases.find((t) => t.id === res.id);
            const isSelected = (currentResult && currentResult.id === res.id);

            return (
              <button
                key={res.id}
                onClick={() => setSelectedTcId(res.id)}
                className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 text-slate-100 shadow-md'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-xs">#{idx + 1}</span>
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono font-semibold text-[10px] ${
                      res.disabled
                        ? 'badge-skipped'
                        : res.status === 'AC'
                        ? 'badge-ac'
                        : res.status === 'WA'
                        ? 'badge-wa'
                        : res.status === 'TLE'
                        ? 'badge-tle'
                        : 'badge-rte'
                    }`}
                  >
                    {res.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{res.executionTimeMs} ms</span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Test Case Details & Output Diff */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          {currentResult && (
            <>
              {/* Output / Stderr Display */}
              {currentResult.status === 'RTE' ? (
                <div className="bg-slate-900 border border-purple-900/60 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Runtime Error Traceback</span>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-purple-950 rounded-lg text-xs font-mono text-purple-300 overflow-x-auto whitespace-pre-wrap">
                    {currentResult.stderr || currentResult.stdout || 'Execution Failed.'}
                  </pre>
                </div>
              ) : currentResult.status === 'TLE' ? (
                <div className="bg-slate-900 border border-amber-900/60 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>Time Limit Exceeded</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    The solution exceeded the allowed execution time threshold ({currentResult.executionTimeMs} ms). Check for infinite loops or inefficient algorithms.
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-[280px]">
                  <DiffViewer
                    expected={currentTc ? currentTc.expectedOutput : ''}
                    actual={currentResult.stdout}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
