import type { LanguageId } from './types';

/**
 * Runs code in the browser. JavaScript and TypeScript run in a Web Worker, Python in Pyodide inside a worker,
 * and SQL in SQLite (sql.js). Everything executes on the user's machine, is cut off after a time limit, and
 * never touches the network from our servers. The interpreters are fetched from a CDN the first time they are
 * used, so nothing is added to the app bundle.
 */

export interface ResultTable {
  columns: string[];
  rows: (string | number | null)[][];
}

export interface RunResult {
  ok: boolean;
  /** Everything printed, in order. */
  output: string;
  tables?: ResultTable[];
  error?: string;
  ms: number;
  /** A plain-language note about how this language runs. */
  note?: string;
}

export const RUNNABLE: LanguageId[] = ['javascript', 'typescript', 'python', 'sql'];
export const canRun = (language: LanguageId) => RUNNABLE.includes(language);

const SQLJS = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3';
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full';
const TYPESCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/typescript/5.4.5/typescript.min.js';

const loading = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loading.delete(src);
      reject(new Error('Could not download the interpreter. Check your connection and try again.'));
    };
    document.head.appendChild(el);
  });
  loading.set(src, p);
  return p;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ── workers ── */

const JS_WORKER = `
self.onmessage = async (e) => {
  const logs = [];
  const show = (v) => {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.stack || String(v);
    try { return JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? x.toString() + 'n' : x instanceof Map ? Object.fromEntries(x) : x instanceof Set ? [...x] : x), 2); } catch (_) { return String(v); }
  };
  const put = (prefix) => (...a) => logs.push(prefix + a.map(show).join(' '));
  const c = { log: put(''), info: put(''), debug: put(''), table: put(''), warn: put('warn: '), error: put('error: ') };
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const result = await new AsyncFunction('console', e.data.code)(c);
    if (result !== undefined) logs.push('=> ' + show(result));
    self.postMessage({ ok: true, output: logs.join('\\n') });
  } catch (err) {
    self.postMessage({ ok: false, output: logs.join('\\n'), error: String((err && err.stack) || err).split('\\n').slice(0, 5).join('\\n') });
  }
};`;

const PY_WORKER = `
importScripts('${PYODIDE}/pyodide.js');
let py = null;
self.onmessage = async (e) => {
  const out = [];
  try {
    if (!py) py = await loadPyodide({ indexURL: '${PYODIDE}/' });
    py.setStdout({ batched: (s) => out.push(s) });
    py.setStderr({ batched: (s) => out.push(s) });
    const r = await py.runPythonAsync(e.data.code);
    if (r !== undefined && r !== null) out.push('=> ' + String(r));
    self.postMessage({ ok: true, output: out.join('\\n') });
  } catch (err) {
    self.postMessage({ ok: false, output: out.join('\\n'), error: String((err && err.message) || err).split('\\n').slice(-7).join('\\n') });
  }
};`;

interface Pooled {
  worker: Worker;
  ready: boolean;
}
const pool: Partial<Record<'js' | 'py', Pooled>> = {};

function workerFor(kind: 'js' | 'py'): Pooled {
  let p = pool[kind];
  if (!p) {
    const url = URL.createObjectURL(new Blob([kind === 'js' ? JS_WORKER : PY_WORKER], { type: 'text/javascript' }));
    p = { worker: new Worker(url), ready: false };
    pool[kind] = p;
  }
  return p;
}

function runInWorker(kind: 'js' | 'py', code: string, limitMs: number): Promise<Omit<RunResult, 'ms'>> {
  return new Promise(resolve => {
    const pooled = workerFor(kind);
    const first = !pooled.ready;
    const timer = setTimeout(() => {
      pooled.worker.terminate();
      delete pool[kind];
      resolve({ ok: false, output: '', error: `Stopped after ${Math.round(limitMs / 1000)} seconds. Is there an infinite loop?` });
    }, first && kind === 'py' ? Math.max(limitMs, 45_000) : limitMs);
    pooled.worker.onmessage = ev => {
      clearTimeout(timer);
      pooled.ready = true;
      resolve(ev.data);
    };
    pooled.worker.onerror = ev => {
      clearTimeout(timer);
      pooled.worker.terminate();
      delete pool[kind];
      resolve({ ok: false, output: '', error: ev.message || 'The worker failed to start.' });
    };
    pooled.worker.postMessage({ code });
  });
}

/* ── SQL ── */

interface SqlDb {
  exec: (sql: string) => { columns: string[]; values: (string | number | null | Uint8Array)[][] }[];
  close: () => void;
}
interface SqlJs {
  Database: new () => SqlDb;
}

async function runSql(code: string): Promise<Omit<RunResult, 'ms'>> {
  await loadScript(`${SQLJS}/sql-wasm.js`);
  const init = (window as unknown as { initSqlJs: (o: { locateFile: (f: string) => string }) => Promise<SqlJs> }).initSqlJs;
  const SQL = await init({ locateFile: f => `${SQLJS}/${f}` });
  const db = new SQL.Database();
  try {
    const sets = db.exec(code);
    const tables: ResultTable[] = sets.map(s => ({
      columns: s.columns,
      rows: s.values.slice(0, 200).map(r => r.map(v => (v instanceof Uint8Array ? `<${v.length} bytes>` : v))),
    }));
    return {
      ok: true,
      tables,
      output: tables.length ? tables.map(t => `${t.columns.join(' | ')}\n${t.rows.map(r => r.join(' | ')).join('\n')}`).join('\n\n') : 'Statements ran. Nothing returned rows.',
      note: 'SQL runs on SQLite in your browser. Postgres-only syntax such as interval, ILIKE or DATE_TRUNC may not work here.',
    };
  } catch (e) {
    return { ok: false, output: '', error: e instanceof Error ? e.message : String(e), note: 'SQL runs on SQLite in your browser. Postgres-only syntax may not work here.' };
  } finally {
    db.close();
  }
}

/* ── TypeScript ── */

async function toJavaScript(code: string): Promise<string> {
  await loadScript(TYPESCRIPT);
  const ts = (window as unknown as { ts: { transpileModule: (c: string, o: unknown) => { outputText: string } } }).ts;
  return ts.transpileModule(code, { compilerOptions: { target: 99, module: 0, strict: false } }).outputText;
}

/** Runs the code and returns what it printed. Never throws. */
export async function runCode(language: LanguageId, code: string): Promise<RunResult> {
  const start = now();
  const done = (r: Omit<RunResult, 'ms'>): RunResult => ({ ...r, ms: Math.round(now() - start) });
  if (!code.trim()) return done({ ok: false, output: '', error: 'There is nothing to run yet.' });
  try {
    if (language === 'javascript') return done(await runInWorker('js', code, 6000));
    if (language === 'typescript') return done(await runInWorker('js', await toJavaScript(code), 6000));
    if (language === 'python') return done({ ...(await runInWorker('py', code, 10_000)), note: 'Python runs in your browser with Pyodide. The first run downloads the interpreter and can take a few seconds.' });
    if (language === 'sql') return done(await runSql(code));
    return done({ ok: false, output: '', error: 'Running is available for JavaScript, TypeScript, Python and SQL.' });
  } catch (e) {
    return done({ ok: false, output: '', error: e instanceof Error ? e.message : 'The run failed.' });
  }
}

/** The output as one block of text, trimmed, for models and copying. */
export function resultText(r: RunResult, max = 3000): string {
  const parts = [r.output.trim(), r.error ? `Error: ${r.error}` : ''].filter(Boolean).join('\n');
  return (parts || '(no output)').slice(0, max);
}
