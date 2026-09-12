import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Copy, Eye, EyeOff, Clipboard, FileText, CheckCircle2, XCircle, Clock, AlertTriangle, Check, SlidersHorizontal } from 'lucide-react';
import BatchPasteModal from './BatchPasteModal.jsx';

export default function TestCaseManager({ testCases, setTestCases, results, onOpenBatchModal }) {
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const addEmptyTestCase = useCallback(() => {
    const newTC = {
      id: 'tc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      input: '',
      expectedOutput: '',
      disabled: false,
    };
    setTestCases((prev) => [...prev, newTC]);
  }, [setTestCases]);

  const updateTestCase = useCallback((id, field, value) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  }, [setTestCases]);

  const deleteTestCase = useCallback((id) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  }, [setTestCases]);

  const toggleTestCase = useCallback((id) => {
    setTestCases((prev) =>
      prev.map((tc) =>
        tc.id === id ? { ...tc, disabled: !tc.disabled } : tc
      )
    );
  }, [setTestCases]);

  const cloneTestCase = useCallback((tc) => {
    const cloned = {
      ...tc,
      id: 'tc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    };
    setTestCases((prev) => [...prev, cloned]);
  }, [setTestCases]);

  const handleAddBatchTestCases = useCallback((newTCs) => {
    setTestCases((prev) => [...prev, ...newTCs]);
  }, [setTestCases]);

  const clearAllTestCases = useCallback(() => {
    if (window.confirm('Are you sure you want to remove all test cases?')) {
      setTestCases([]);
    }
  }, [setTestCases]);

  const toggleAllTestCases = useCallback(() => {
    const allDisabled = testCases.every((tc) => tc.disabled);
    setTestCases((prev) =>
      prev.map((tc) => ({ ...tc, disabled: !allDisabled }))
    );
  }, [testCases, setTestCases]);

  const copyToClipboard = useCallback((text, key) => {
    navigator.clipboard.writeText(text || '');
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  }, []);

  const getResultForTc = useCallback((tcId) => {
    if (!results || !Array.isArray(results)) return null;
    return results.find((r) => r.id === tcId) ?? null;
  }, [results]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-slate-200 text-sm">
            Test Cases ({testCases.filter((tc) => !tc.disabled).length} active / {testCases.length} total)
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {testCases.length > 0 && (
            <>
              <button
                onClick={toggleAllTestCases}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
                title={testCases.every((tc) => tc.disabled) ? "Enable All Test Cases" : "Disable All Test Cases"}
              >
                {testCases.every((tc) => tc.disabled) ? "Enable All" : "Disable All"}
              </button>
              <button
                onClick={clearAllTestCases}
                className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/50 rounded-lg transition"
                title="Clear All Test Cases"
              >
                Clear All
              </button>
            </>
          )}

          <button
            onClick={onOpenBatchModal || (() => setIsBatchOpen(true))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg transition cursor-pointer"
            title="Paste Sample Cases (Ctrl+B / Ctrl+Shift+V)"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste Sample (CF)</span>
          </button>
          <button
            onClick={addEmptyTestCase}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Test Case</span>
          </button>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {testCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl text-center">
            <Clipboard className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">No test cases added yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Click "Paste Sample (CF)" to paste inputs and expected outputs directly from Codeforces, or click "New Test Case".
            </p>
          </div>
        ) : (
          testCases.map((tc, index) => {
            const res = getResultForTc(tc.id);
            return (
              <div
                key={tc.id}
                className={`bg-slate-900 border rounded-xl overflow-hidden transition ${
                  tc.disabled
                    ? 'border-slate-800/60 opacity-60'
                    : res
                    ? res.status === 'AC'
                      ? 'border-emerald-500/40 shadow-emerald-950/20'
                      : res.status === 'WA'
                      ? 'border-rose-500/40 shadow-rose-950/20'
                      : res.status === 'TLE'
                      ? 'border-amber-500/40'
                      : 'border-purple-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Test case bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-300">
                      #{index + 1}
                    </span>

                    {/* Result Badge */}
                    {res && !tc.disabled && (
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
                          res.status === 'AC'
                            ? 'badge-ac'
                            : res.status === 'WA'
                            ? 'badge-wa'
                            : res.status === 'TLE'
                            ? 'badge-tle'
                            : 'badge-rte'
                        }`}
                      >
                        {res.status === 'AC' && <CheckCircle2 className="w-3 h-3" />}
                        {res.status === 'WA' && <XCircle className="w-3 h-3" />}
                        {res.status === 'TLE' && <Clock className="w-3 h-3" />}
                        {res.status === 'RTE' && <AlertTriangle className="w-3 h-3" />}
                        <span>{res.status}</span>
                        <span className="text-[10px] opacity-75 font-sans ml-1">
                          ({res.executionTimeMs} ms)
                        </span>
                      </span>
                    )}

                    {tc.disabled && (
                      <span className="badge-skipped px-2 py-0.5 rounded font-mono text-[10px]">
                        DISABLED
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleTestCase(tc.id)}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
                      title={tc.disabled ? 'Enable Test Case' : 'Disable Test Case'}
                    >
                      {tc.disabled ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </button>
                    <button
                      onClick={() => cloneTestCase(tc)}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTestCase(tc.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Test case body (Inputs & Outputs) */}
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Input
                      </label>
                      {tc.input && (
                        <button
                          onClick={() => copyToClipboard(tc.input, `in_${tc.id}`)}
                          className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1"
                        >
                          {copiedField === `in_${tc.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === `in_${tc.id}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={tc.input}
                      onChange={(e) =>
                        updateTestCase(tc.id, 'input', e.target.value)
                      }
                      placeholder="Enter sample input..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Expected Output
                      </label>
                      {tc.expectedOutput && (
                        <button
                          onClick={() => copyToClipboard(tc.expectedOutput, `out_${tc.id}`)}
                          className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1"
                        >
                          {copiedField === `out_${tc.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === `out_${tc.id}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={tc.expectedOutput}
                      onChange={(e) =>
                        updateTestCase(tc.id, 'expectedOutput', e.target.value)
                      }
                      placeholder="Enter expected output..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Batch paste modal */}
      <BatchPasteModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onAddTestCases={handleAddBatchTestCases}
      />
    </div>
  );
}

