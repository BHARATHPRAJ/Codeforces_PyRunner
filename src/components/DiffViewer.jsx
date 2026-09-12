import React, { useMemo } from 'react';
import { GitCompare, CheckCircle2, AlertOctagon } from 'lucide-react';

// Module-level: stable singleton, never re-allocated on render
// Mirrors the backend normalizeOutput: trimEnd each line, strip trailing blank lines
function normalizeForDiff(text) {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
    .split('\n');
}

export default function DiffViewer({ expected, actual }) {

  const { diffLines, hasDiffs } = useMemo(() => {
    const normExpected = normalizeForDiff(expected);
    const normActual = normalizeForDiff(actual);

    const maxLines = Math.max(normExpected.length, normActual.length);
    const lines = [];

    for (let i = 0; i < maxLines; i++) {
      const expLine = normExpected[i] !== undefined ? normExpected[i] : null;
      const actLine = normActual[i] !== undefined ? normActual[i] : null;

      let isMatch = false;
      let isMismatch = false;
      let isExtraActual = false;
      let isMissingActual = false;

      if (expLine !== null && actLine !== null) {
        if (expLine === actLine) {
          isMatch = true;
        } else {
          isMismatch = true;
        }
      } else if (expLine === null && actLine !== null) {
        isExtraActual = true;
      } else if (expLine !== null && actLine === null) {
        isMissingActual = true;
      }

      lines.push({
        lineNum: i + 1,
        expected: expLine,
        actual: actLine,
        isMatch,
        isMismatch,
        isExtraActual,
        isMissingActual
      });
    }

    return {
      diffLines: lines,
      hasDiffs: lines.some((d) => !d.isMatch)
    };
  }, [expected, actual]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs font-mono shadow-inner">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-cyan-400" />
          <span className="font-sans font-semibold text-slate-200 text-sm">Visual Output Diff</span>
        </div>
        {hasDiffs ? (
          <span className="flex items-center gap-1 text-amber-400 font-sans font-semibold text-[11px] bg-amber-950/40 border border-amber-800/50 px-2.5 py-0.5 rounded-full">
            <AlertOctagon className="w-3 h-3" />
            <span>Output Mismatch Detected</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-400 font-sans font-semibold text-[11px] bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            <span>Exact Match</span>
          </span>
        )}
      </div>

      {/* Grid Diff View */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2 mb-2 font-sans text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="px-2">Expected Output</div>
          <div className="px-2">Actual Output (Solution)</div>
        </div>

        <div className="space-y-1">
          {diffLines.map((row) => (
            <div key={row.lineNum} className="grid grid-cols-2 gap-2 rounded overflow-hidden">
              {/* Expected Column */}
              <div
                className={`p-2 border-l-2 flex items-start gap-2 ${
                  row.isMatch
                    ? 'bg-slate-950/40 border-slate-700 text-slate-300'
                    : row.isMismatch || row.isMissingActual
                    ? 'diff-added border-emerald-500'
                    : 'bg-slate-950/20 border-slate-800 text-slate-600'
                }`}
              >
                <span className="text-slate-500 font-mono text-[10px] select-none w-6 text-right shrink-0">
                  {row.lineNum}
                </span>
                <span className="whitespace-pre-wrap break-all">
                  {row.expected !== null ? row.expected : <i className="text-slate-600 font-sans text-[10px]">[No Line]</i>}
                </span>
              </div>

              {/* Actual Column */}
              <div
                className={`p-2 border-l-2 flex items-start gap-2 ${
                  row.isMatch
                    ? 'bg-slate-950/40 border-slate-700 text-slate-300'
                    : row.isMismatch || row.isExtraActual
                    ? 'diff-removed border-rose-500'
                    : 'bg-slate-950/20 border-slate-800 text-slate-600'
                }`}
              >
                <span className="text-slate-500 font-mono text-[10px] select-none w-6 text-right shrink-0">
                  {row.lineNum}
                </span>
                <span className="whitespace-pre-wrap break-all">
                  {row.actual !== null ? row.actual : <i className="text-slate-600 font-sans text-[10px]">[Missing]</i>}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

