import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, Copy, Check, Zap, RotateCcw, ChevronDown } from 'lucide-react';

export default function CodeEditor({ code, setCode, onRun, isRunning, runtime, onResetDefault }) {
  const [copied, setCopied] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsTemplateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
  };

  const applyTemplate = (templateType) => {
    let snippet = '';
    if (templateType === 'fast_readline' || templateType === 'default') {
      snippet = `import sys
input = sys.stdin.readline

def solve():
    t = int(input())
    for _ in range(t):
        # your code here
        pass

if __name__ == "__main__":
    solve()
`;
    } else if (templateType === 'fast_io') {
      snippet = `import sys

def solve():
    input = sys.stdin.read
    data = input().split()
    if not data:
        return
    
    # Write solution here
    
if __name__ == '__main__':
    solve()
`;
    } else if (templateType === 'recursion_boost') {
      snippet = `import sys
import threading

# Increase recursion depth limit for PyPy/Python DFS
sys.setrecursionlimit(200000)

def solve():
    pass

if __name__ == '__main__':
    # Increase stack size for Windows/PyPy
    threading.stack_size(67108864) # 64MB stack
    sys.setrecursionlimit(300000)
    solve()
`;
    } else if (templateType === 'testcases_loop') {
      snippet = `import sys

def solve():
    input = sys.stdin.read
    data = input().split()
    if not data:
        return
    
    t = int(data[0])
    idx = 1
    out = []
    
    for _ in range(t):
        n = int(data[idx])
        idx += 1
        # Process query
        out.append(str(n))
        
    print('\\n'.join(out))

if __name__ == '__main__':
    solve()
`;
    }

    if (snippet) {
      setCode(snippet);
    }
    setIsTemplateMenuOpen(false);
  };

  const lineCount = (code || '').split('\n').length;
  const charCount = (code || '').length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Editor Header / Action Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-slate-200 text-sm tracking-wide">Solution.py</span>
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-cyan-300 border border-slate-700">
            {runtime ? runtime.toUpperCase() : 'PYTHON'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preset Templates */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Templates</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isTemplateMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-30">
                <button
                  onClick={() => applyTemplate('fast_readline')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between cursor-pointer font-medium"
                >
                  <span>Standard Fast I/O (readline)</span>
                </button>
                <button
                  onClick={() => applyTemplate('fast_io')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between cursor-pointer"
                >
                  <span>Bulk sys.stdin.read</span>
                </button>
                <button
                  onClick={() => applyTemplate('recursion_boost')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center justify-between cursor-pointer"
                >
                  <span>Recursion & Stack Boost</span>
                </button>
              </div>
            )}
          </div>

          {onResetDefault && (
            <button
              onClick={onResetDefault}
              className="p-1 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-md transition cursor-pointer"
              title="Reset to Starter Code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition cursor-pointer"
            title="Copy Solution Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="flex-1 relative min-h-[350px]">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
          }}
          onMount={(editor) => {
            editor.onKeyDown((e) => handleEditorKeyDown(e));
          }}
        />
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-400">
        <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-cyan-400">Ctrl + Enter</kbd> to run tests</span>
        <span className="font-mono text-[11px] text-slate-500">
          {lineCount} lines • {charCount} chars
        </span>
      </div>
    </div>
  );
}

