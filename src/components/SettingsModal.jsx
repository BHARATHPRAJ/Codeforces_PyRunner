import React, { useState } from 'react';
import { X, Settings, Terminal, Check } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  runtimes,
  selectedRuntime,
  setSelectedRuntime,
  timeoutMs,
  setTimeoutMs,
  memoryLimitMb,
  setMemoryLimitMb
}) {
  const [customPath, setCustomPath] = useState('');

  if (!isOpen) return null;

  const handleSelectRuntime = (cmd) => {
    setSelectedRuntime(cmd);
  };

  const handleSaveCustomPath = () => {
    if (customPath.trim()) {
      setSelectedRuntime(customPath.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100">Interpreter & Runner Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Runtime Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Python / PyPy Runtime Environment
            </label>
            <div className="space-y-2">
              {runtimes.map((r) => {
                const isSelected = selectedRuntime === r.cmd;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRuntime(r.cmd)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-slate-100'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.version || r.cmd}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Path Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Or Specify Custom Binary Executable Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. C:\PyPy3\pypy3.exe or /usr/local/bin/pypy3"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSaveCustomPath}
                className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition cursor-pointer"
              >
                Use Path
              </button>
            </div>
          </div>

          {/* Timeout Config */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Time Limit Threshold (ms)
            </label>
            <input
              type="number"
              min={500}
              max={10000}
              step={500}
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Processes running longer than this threshold will be terminated and marked as TLE. Default Codeforces limit is 2000 ms (2.0s).
            </p>
          </div>

          {/* Memory Limit Config */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Memory Limit (MB)
            </label>
            <input
              type="number"
              min={16}
              max={2048}
              step={64}
              value={memoryLimitMb}
              onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Peak memory usage above this limit will be marked as MLE. Default Codeforces limit is 512 MB.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-lg transition cursor-pointer"
          >
            Done (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

