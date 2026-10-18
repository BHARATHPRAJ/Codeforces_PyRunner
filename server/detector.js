import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Asynchronously check if a command is executable and get its version output.
 */
async function testCmd(cmd, args = ['--version']) {
  try {
    const { stdout, stderr } = await execAsync(`${cmd} ${args.join(' ')}`, {
      timeout: 2000,
      encoding: 'utf-8',
      windowsHide: true
    });
    return (stdout || stderr || '').trim();
  } catch {
    return null;
  }
}

/**
 * Asynchronously detect available Python and PyPy runtimes on the host machine.
 */
export async function detectRuntimes() {
  const runtimes = [];

  const candidates = [
    { name: 'Python (Default)', cmd: 'python' },
    { name: 'PyPy 3', cmd: 'pypy3' },
    { name: 'PyPy', cmd: 'pypy' },
    { name: 'Python 3', cmd: 'python3' },
    { name: 'Python Launcher', cmd: 'py' }
  ];

  // Test standard candidates in parallel
  const candidateResults = await Promise.all(
    candidates.map(async (c) => {
      const ver = await testCmd(c.cmd);
      return ver ? { ...c, version: ver, available: true } : null;
    })
  );

  for (const res of candidateResults) {
    if (res && !runtimes.some((r) => r.cmd === res.cmd)) {
      runtimes.push({
        id: res.cmd,
        name: res.name,
        cmd: res.cmd,
        version: res.version,
        available: true
      });
    }
  }

  // Common Windows PyPy directory scan
  const commonPaths = [
    'C:\\pypy3\\pypy3.exe',
    'C:\\pypy\\pypy3.exe',
    'C:\\Program Files\\PyPy\\pypy3.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Python') : null
  ].filter(Boolean);

  const pathResults = await Promise.all(
    commonPaths.map(async (p) => {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        const ver = await testCmd(`"${p}"`);
        return ver ? { path: p, version: ver } : null;
      }
      return null;
    })
  );

  for (const res of pathResults) {
    if (res && !runtimes.some((r) => r.cmd === res.path)) {
      runtimes.push({
        id: res.path,
        name: `PyPy at ${path.basename(path.dirname(res.path))}`,
        cmd: res.path,
        version: res.version,
        available: true
      });
    }
  }

  // Fallback if none detected
  if (runtimes.length === 0) {
    runtimes.push({
      id: 'python',
      name: 'Python (Fallback)',
      cmd: 'python',
      version: 'Unknown',
      available: false
    });
  }

  return runtimes;
}

