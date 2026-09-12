# Codeforces PyRunner Pro

A local test environment and stress testing tool for Codeforces Python and PyPy programmers.

Running Python solutions directly on Codeforces sample cases can be tedious, and debugging wrong answers on hidden test cases is frustrating. PyRunner Pro lets you run solutions against multiple sample test cases locally, inspect output diffs side-by-side, and run stress tests against a brute-force solver to find counter-examples automatically.

---

## Features

- **Parallel Execution**: Executes test cases concurrently using Node child processes to minimize test run time.
- **Python & PyPy Support**: Automatically detects installed `python`, `pypy3`, `pypy`, and `python3` executables on your system. You can also specify a custom interpreter path.
- **Time Limit Enforcement (TLE)**: Kills processes that exceed the configured time limit and reports them as `TLE`. Default is **2000 ms**, matching the standard Codeforces limit.
- **Memory Limit Enforcement (MLE)**: Tracks peak memory usage via Python's `tracemalloc`. Processes exceeding the configured memory cap are flagged as `MLE`. Default is **512 MB**.
- **Visual Output Diff**: Normalizes whitespace and trailing newlines, then highlights exact line mismatches between your solution output and the expected sample output.
- **Stress Tester**: Runs an automated generator against your solution and a brute-force reference code to catch failing test inputs.
- **Codeforces Batch Paste**: Copy-paste raw sample test blocks directly from Codeforces problem pages into the app.
- **Monaco Code Editor**: VS Code editor core with syntax highlighting, template snippets (Fast I/O, recursion limits, multi-test loops), and line stats.
- **Auto-Save**: Solution code, test cases, runtime, time limit, and memory limit all persist automatically in your browser's local storage.
- **Keyboard Shortcuts**: Use `Ctrl + Enter` (or `Cmd + Enter`) to run tests from anywhere in the app.

---

## Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide React
- **Backend**: Node.js, Express, `child_process` execution engine

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python 3](https://www.python.org/) and/or [PyPy 3](https://www.pypy.org/) added to system PATH

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Codeforces_app

# Install dependencies
npm install
```

### Running Locally

To run both the Express backend server (port 5000) and the Vite frontend (port 3000) together:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts backend API runner and Vite dev server concurrently |
| `npm run server` | Starts only the Node/Express backend runner on port 5000 |
| `npm run client` | Starts only the frontend Vite dev server on port 3000 |
| `npm run build` | Compiles the production frontend bundle into `dist/` |

---

## How to Stress Test

1. Switch to the **Stress Tester** tab in the right pane.
2. Provide a **Generator (`gen.py`)** that prints random valid test cases.
3. Provide a **Brute Force (`brute.py`)** solution that computes the correct output (even if slow).
4. Click **Start Stress Test**.
5. If the outputs mismatch or your solution errors out, the app flags the exact test case and lets you import it into your test cases with one click.

---

## Time & Memory Limits

PyRunner Pro enforces the same constraints Codeforces uses, so verdicts on your machine closely reflect what the judge will give.

| Verdict | Meaning | Default Threshold |
| :--- | :--- | :--- |
| `AC` | Accepted — output matches expected | — |
| `WA` | Wrong Answer — output does not match | — |
| `TLE` | Time Limit Exceeded — process killed after timeout | 2000 ms |
| `MLE` | Memory Limit Exceeded — peak heap usage above limit | 512 MB |
| `RTE` | Runtime Error — non-zero exit code or crash | — |
| `SKIPPED` | Test case is disabled | — |

To change the thresholds for a specific problem, open **Settings** (`Ctrl + ,`) and adjust **Time Limit Threshold** and **Memory Limit**. Both values are saved to local storage and sent to the backend on every run.

> **Note:** Memory tracking uses Python's built-in `tracemalloc` module and measures the peak traced heap allocation. It does not include interpreter overhead, so the reported value will be slightly lower than what Codeforces measures. Add ~10–20 MB of headroom when comparing against a 256 MB or 512 MB Codeforces limit.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run solution against all active test cases |
| `Ctrl + B` or `Ctrl + Shift + V` | Open Codeforces Batch Sample Paste modal |
| `Ctrl + Alt + N` | Add a new empty test case |
| `Ctrl + ,` / `Cmd + ,` | Open Interpreter & Runner Settings modal |
| `Alt + 1` | Switch to **Test Cases** tab |
| `Alt + 2` | Switch to **Results & Output Diff** tab |
| `Alt + 3` | Switch to **Stress Tester** tab |
| `Esc` | Close any open modal window |

---

## Python Template

Python may not always be the fastest choice on Codeforces, but the right template gets you most of the way there.

```python
import sys
input = sys.stdin.readline

def solve():
    t = int(input())
    for _ in range(t):
        # your code here
        pass

if __name__ == "__main__":
    solve()
```

---

## A Note About AI

AI can be useful while learning, but AI assistance is not allowed during Codeforces contests. When you enter a contest, solve the problems on your own.

The goal is not just to get Accepted. It is about getting comfortable with:

- Reading the problem statement carefully
- Understanding the constraints
- Finding patterns and thinking about edge cases
- Coming up with your own approach
- Learning from Wrong Answers and failed attempts

I learned this the hard way. I used AI in a contest once and all my submissions got skipped. The worst part was that I had already solved 2 problems on my own — then used AI for 4 more. All of it was invalidated. That stung.

After that, no AI in contests. It is harder, but I feel like I am improving faster. The struggle is the point.

A failed submission is still part of learning. Do not worry too much about your rating. Focus on improving your problem-solving skills.

---

## Getting Started with Competitive Programming

If you are new to competitive programming, do not overthink it. Learn the basics of a language, pick a platform like Codeforces, and start solving problems.

[Errichto](https://www.youtube.com/errichto) is a great resource for learning algorithms and problem-solving.

> "Just practice. Solve problems, solve problems and solve some more problems." — Errichto

You do not need to know everything before starting.

Solve. Fail. Learn. Improve. Repeat.

---

## Final Note

Do not worry about becoming a Grandmaster immediately.

Be better than you were yesterday.

Keep solving. Keep learning. Keep improving.