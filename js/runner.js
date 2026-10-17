/*
 * runner.js - gemeinsame Benchmark-Logik fuer Browser (web/index.html) und Node.js (node/run.mjs).
 *
 * Ablauf pro Test und Variante:
 *   1. ein Aufwaermlauf (JIT von JavaScript / Kompilierung von Wasm im Browser)
 *   2. RUNS gemessene Laeufe mit performance.now()
 *   3. Median der Laufzeiten als Ergebnis (robust gegen Ausreisser)
 */
import { bubbleSortBench, countPrimes, fib, matmulBench } from './bench.js';

export const RUNS = 5;

// Parameter so gewaehlt, dass ein JS-Lauf grob 50-500 ms dauert.
export const TESTS = [
  {
    name: 'Bubble Sort',
    params: 'n = 5000, 10 Wiederholungen',
    js: () => bubbleSortBench(5000, 10, 42),
    wasm: (m) => m._bubble_sort_bench(5000, 10, 42),
  },
  {
    name: 'Primzahlen zählen',
    params: 'alle Primzahlen < 2 000 000',
    js: () => countPrimes(2_000_000),
    wasm: (m) => m._count_primes(2_000_000),
  },
  {
    name: 'Fibonacci rekursiv',
    params: 'fib(35)',
    js: () => fib(35),
    wasm: (m) => m._fib(35),
  },
  {
    name: 'Matrixmultiplikation',
    params: '200 × 200, 10 Wiederholungen',
    js: () => matmulBench(200, 10),
    wasm: (m) => m._matmul_bench(200, 10),
  },
];

const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function measure(fn) {
  const result = fn(); // Aufwaermlauf
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    await pause(); // UI im Browser kurz freigeben
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return { result, ms: median(times) };
}

/**
 * Fuehrt alle Tests aus.
 * @param {Object<string, object>} variants  z.B. { 'Wasm -O3': moduleO3, 'Wasm -O0': moduleO0 }
 * @param {(row: object) => void} onRow      Callback pro fertigem Test
 * @returns {Promise<object[]>}
 */
export async function runAll(variants, onRow = () => {}) {
  const rows = [];
  for (const test of TESTS) {
    const js = await measure(test.js);
    const row = { name: test.name, params: test.params, jsMs: js.ms, wasm: {} };

    for (const [label, module] of Object.entries(variants)) {
      const w = await measure(() => test.wasm(module));
      row.wasm[label] = {
        ms: w.ms,
        speedup: js.ms / w.ms,
        correct: w.result === js.result,
      };
    }
    rows.push(row);
    onRow(row);
  }
  return rows;
}

/** Ergebnis als Markdown-Tabelle (zum Einfuegen ins README). */
export function toMarkdown(rows) {
  const labels = Object.keys(rows[0]?.wasm ?? {});
  const header = ['Test', 'Parameter', 'JavaScript', ...labels.map((l) => `${l}`), ...labels.map((l) => `Speedup ${l}`)];
  const lines = [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
  ];
  for (const r of rows) {
    const cells = [
      r.name,
      r.params,
      `${r.jsMs.toFixed(1)} ms`,
      ...labels.map((l) => `${r.wasm[l].ms.toFixed(1)} ms${r.wasm[l].correct ? '' : ' ⚠'}`),
      ...labels.map((l) => `${r.wasm[l].speedup.toFixed(2)}×`),
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}
