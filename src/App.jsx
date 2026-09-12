import React, { useState, useEffect, useCallback } from 'react';
import { Play, Settings, CheckCircle2, Flame, FileText, Zap, RefreshCw, Cpu } from 'lucide-react';
import CodeEditor from './components/CodeEditor.jsx';
import TestCaseManager from './components/TestCaseManager.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import StressTester from './components/StressTester.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import BatchPasteModal from './components/BatchPasteModal.jsx';

const DEFAULT_PYTHON_CODE = `import sys
input = sys.stdin.readline

def solve():
    t = int(input())
    for _ in range(t):
        # your code here
        pass

if __name__ == "__main__":
    solve()
`;

const INITIAL_TEST_CASES = [
  {
    id: 'tc_1',
    input: `3\n1\n5\n10`,
    expectedOutput: `2\n10\n20`,
    disabled: false
  },
  {
    id: 'tc_2',
    input: `2\n0\n100`,
    expectedOutput: `0\n200`,
    disabled: false
  }
];

export default function App() {
  const [code, setCode] = useState(() => {
    return localStorage.getItem('cf_code') || DEFAULT_PYTHON_CODE;
  });
  
  const [testCases, setTestCases] = useState(() => {
    try {
      const saved = localStorage.getItem('cf_test_cases');
      return saved ? JSON.parse(saved) : INITIAL_TEST_CASES;
    } catch {
      return INITIAL_TEST_CASES;
    }
  });

  const [selectedRuntime, setSelectedRuntime] = useState(() => {
    return localStorage.getItem('cf_runtime') || 'python';
  });

  const [timeoutMs, setTimeoutMs] = useState(() => {
    const saved = localStorage.getItem('cf_timeout');
    return saved ? Number(saved) : 2000;
  });

  const [memoryLimitMb, setMemoryLimitMb] = useState(() => {
    const saved = localStorage.getItem('cf_memory_limit');
    return saved ? Number(saved) : 512;
  });

  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('testcases'); // 'testcases', 'results', 'stresstest'
  
  // Modals & Settings
  const [runtimes, setRuntimes] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('cf_code', code);
  }, [code]);

  useEffect(() => {
    localStorage.setItem('cf_test_cases', JSON.stringify(testCases));
  }, [testCases]);

  useEffect(() => {
    localStorage.setItem('cf_runtime', selectedRuntime);
  }, [selectedRuntime]);

  useEffect(() => {
    localStorage.setItem('cf_timeout', timeoutMs.toString());
  }, [timeoutMs]);

  useEffect(() => {
    localStorage.setItem('cf_memory_limit', memoryLimitMb.toString());
  }, [memoryLimitMb]);

  // Fetch detected runtimes on mount cleanly
  useEffect(() => {
    let isMounted = true;
    fetch('/api/runtimes')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.runtimes) {
          setRuntimes(data.runtimes);
          setServerOnline(true);
          if (data.runtimes.length > 0) {
            const hasMatch = data.runtimes.some((r) => r.cmd === selectedRuntime);
            if (!hasMatch) {
              const pypy = data.runtimes.find((r) => r.cmd.includes('pypy'));
              setSelectedRuntime(pypy ? pypy.cmd : data.runtimes[0].cmd);
            }
          }
        }
      })
      .catch(() => {
        if (isMounted) setServerOnline(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRunTests = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveRightTab('results');

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          testCases,
          runtimeCmd: selectedRuntime,
          timeoutMs,
          memoryLimitMb
        })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        setServerOnline(true);
      } else {
        alert(`Execution Error: ${data.error}`);
      }
    } catch (err) {
      setServerOnline(false);
      alert(`Backend Error: Could not connect to runner server.`);
    } finally {
      setIsRunning(false);
    }
  }, [code, testCases, selectedRuntime, timeoutMs, memoryLimitMb, isRunning]);

  const handleAddNewTestCase = useCallback(() => {
    const newTC = {
      id: 'tc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      input: '',
      expectedOutput: '',
      disabled: false,
    };
    setTestCases((prev) => [...prev, newTC]);
    setActiveRightTab('testcases');
  }, []);

  const handleAddBatchTestCases = useCallback((newTCs) => {
    setTestCases((prev) => [...prev, ...newTCs]);
    setActiveRightTab('testcases');
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + Enter: Run Solution
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        handleRunTests();
      }
      // Ctrl + B or Ctrl + Shift + V: Open Batch Paste Modal
      else if ((isCmdOrCtrl && (e.key === 'b' || e.key === 'B')) || (isCmdOrCtrl && e.shiftKey && (e.key === 'v' || e.key === 'V'))) {
        e.preventDefault();
        setIsBatchOpen(true);
      }
      // Ctrl + Alt + N: Add New Test Case
      else if (isCmdOrCtrl && e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleAddNewTestCase();
      }
      // Ctrl + , (Comma): Open Settings Modal
      else if (isCmdOrCtrl && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      // Alt + 1: Switch to Test Cases tab
      else if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveRightTab('testcases');
      }
      // Alt + 2: Switch to Results & Diff tab
      else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveRightTab('results');
      }
      // Alt + 3: Switch to Stress Tester tab
      else if (e.altKey && e.key === '3') {
        e.preventDefault();
        setActiveRightTab('stresstest');
      }
      // Esc: Close Modals
      else if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsBatchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunTests, handleAddNewTestCase]);

  const handleAddTestCaseFromStress = useCallback((newTC) => {
    setTestCases((prev) => [...prev, newTC]);
    setActiveRightTab('testcases');
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Top Application Bar */}
      <header className="flex flex-wrap items-center justify-between px-6 py-3 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md z-20 gap-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <Zap className="w-5 h-5 text-slate-950 fill-current" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide flex items-center gap-2">
              <span className="text-cyan-400">Codeforces</span>
              <span className="text-slate-100">PyRunner Pro</span>
            </h1>
            <p className="text-[11px] text-slate-400">Fast Python & PyPy Local Test Engine</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Runtime Selector pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedRuntime}
              onChange={(e) => setSelectedRuntime(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              {runtimes.length > 0 ? (
                runtimes.map((r) => (
                  <option key={r.id} value={r.cmd} className="bg-slate-900 text-slate-200">
                    {r.name} ({r.cmd})
                  </option>
                ))
              ) : (
                <>
                  <option value="python" className="bg-slate-900">Python 3 (python)</option>
                  <option value="pypy3" className="bg-slate-900">PyPy 3 (pypy3)</option>
                  <option value="pypy" className="bg-slate-900">PyPy (pypy)</option>
                </>
              )}
            </select>
          </div>

          {/* Settings Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition cursor-pointer"
            title="Configure Runtimes & Time Limits (Ctrl+,)"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Main Run Button */}
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="glow-btn flex items-center gap-2 px-5 py-2 font-semibold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 rounded-xl shadow-lg transition transform active:scale-95 cursor-pointer"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isRunning ? 'Running Tests...' : 'Run Solution (Ctrl+Enter)'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Split Grid) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Side: Code Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
          <CodeEditor
            code={code}
            setCode={setCode}
            onRun={handleRunTests}
            isRunning={isRunning}
            runtime={selectedRuntime}
            onResetDefault={() => setCode(DEFAULT_PYTHON_CODE)}
          />
        </div>

        {/* Right Side: Tabbed Interface for Testcases, Results & Stress Tester (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl">
          {/* Tab Header */}
          <div className="flex border-b border-slate-800 bg-slate-950/80 px-2 pt-2 gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveRightTab('testcases')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg transition border-b-2 cursor-pointer ${
                activeRightTab === 'testcases'
                  ? 'bg-slate-900 border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
              title="Test Cases Tab (Alt+1)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Test Cases ({testCases.length})</span>
            </button>

            <button
              onClick={() => setActiveRightTab('results')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg transition border-b-2 cursor-pointer ${
                activeRightTab === 'results'
                  ? 'bg-slate-900 border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
              title="Results & Output Diff Tab (Alt+2)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Results & Diff</span>
              {results.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveRightTab('stresstest')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg transition border-b-2 cursor-pointer ${
                activeRightTab === 'stresstest'
                  ? 'bg-slate-900 border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
              title="Stress Tester Tab (Alt+3)"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Stress Tester</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeRightTab === 'testcases' && (
              <TestCaseManager
                testCases={testCases}
                setTestCases={setTestCases}
                results={results}
                onOpenBatchModal={() => setIsBatchOpen(true)}
              />
            )}

            {activeRightTab === 'results' && (
              <ResultsPanel
                results={results}
                testCases={testCases}
                onRun={handleRunTests}
                isRunning={isRunning}
              />
            )}

            {activeRightTab === 'stresstest' && (
              <StressTester
                solutionCode={code}
                onAddTestCase={handleAddTestCaseFromStress}
                runtime={selectedRuntime}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="flex items-center justify-between px-6 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{serverOnline ? 'Runner API Online (localhost:5000)' : 'Runner API Offline'}</span>
          </span>
          <span>•</span>
          <span>Time Limit: {timeoutMs} ms</span>
          <span>•</span>
          <span>Memory Limit: {memoryLimitMb} MB</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-[10px] text-slate-500 font-mono">
            Shortcuts: <kbd className="text-slate-400">Ctrl+Enter</kbd> Run • <kbd className="text-slate-400">Ctrl+B</kbd> Paste • <kbd className="text-slate-400">Alt+1/2/3</kbd> Tabs
          </span>
          <span>Python / PyPy Codeforces Runner</span>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        runtimes={runtimes}
        selectedRuntime={selectedRuntime}
        setSelectedRuntime={setSelectedRuntime}
        timeoutMs={timeoutMs}
        setTimeoutMs={setTimeoutMs}
        memoryLimitMb={memoryLimitMb}
        setMemoryLimitMb={setMemoryLimitMb}
      />

      <BatchPasteModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onAddTestCases={handleAddBatchTestCases}
      />
    </div>
  );
}


