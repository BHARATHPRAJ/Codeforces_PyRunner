import React, { useState, useEffect } from 'react';
import { X, Clipboard, Plus, AlertCircle } from 'lucide-react';

export default function BatchPasteModal({ isOpen, onClose, onAddTestCases }) {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState('separate'); // 'separate' or 'raw'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImportSeparate = () => {
    if (!inputText.trim()) return;

    const newTC = {
      id: 'tc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      input: inputText.trim(),
      expectedOutput: outputText.trim(),
      disabled: false,
    };

    onAddTestCases([newTC]);
    setInputText('');
    setOutputText('');
    onClose();
  };

  const handleImportRaw = () => {
    if (!rawText.trim()) return;

    const text = rawText.replace(/\r\n/g, '\n');

    // Parse multi-block Codeforces sample boxes ("Input\n...\nOutput\n...")
    const blockRegex = /(?:input|Input):\s*\n?([\s\S]*?)(?:output|Output):\s*\n?([\s\S]*?)(?=(?:input|Input):|$)/gi;
    const matches = [...text.matchAll(blockRegex)];

    if (matches.length > 0) {
      const parsedTCs = matches.map((m) => ({
        id: 'tc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        input: m[1].trim(),
        expectedOutput: m[2].trim(),
        disabled: false,
      }));
      onAddTestCases(parsedTCs);
    } else {
      // Single block fallback
      const inputMatch = text.match(/(?:input|Input):\s*\n?([\s\S]*?)(?=(?:output|Output):|$)/i);
      const outputMatch = text.match(/(?:output|Output):\s*\n?([\s\S]*?)$/i);

      let inputPart = '';
      let outputPart = '';

      if (inputMatch && outputMatch) {
        inputPart = inputMatch[1].trim();
        outputPart = outputMatch[1].trim();
      } else {
        inputPart = text.trim();
      }

      const newTC = {
        id: 'tc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        input: inputPart,
        expectedOutput: outputPart,
        disabled: false,
      };

      onAddTestCases([newTC]);
    }

    setRawText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100">Batch Paste Test Case</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-3 gap-4 text-sm font-medium">
          <button
            onClick={() => setMode('separate')}
            className={`pb-2 border-b-2 transition cursor-pointer ${
              mode === 'separate'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Input & Output Separately
          </button>
          <button
            onClick={() => setMode('raw')}
            className={`pb-2 border-b-2 transition cursor-pointer ${
              mode === 'raw'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Raw Sample Block
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {mode === 'separate' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Sample Input (Copied from Codeforces)
                </label>
                <textarea
                  rows={5}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste input lines here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Expected Output (Copied from Codeforces)
                </label>
                <textarea
                  rows={4}
                  value={outputText}
                  onChange={(e) => setOutputText(e.target.value)}
                  placeholder="Paste expected output lines here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-800/50 p-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  You can copy single or multiple sample boxes from Codeforces (including "input" & "output" headers) and paste them below.
                </span>
              </div>
              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Example:\ninput\n6\n1 2 3\noutput\n6`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/60 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            Cancel (Esc)
          </button>
          <button
            onClick={mode === 'separate' ? handleImportSeparate : handleImportRaw}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Test Case</span>
          </button>
        </div>
      </div>
    </div>
  );
}

