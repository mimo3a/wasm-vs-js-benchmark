// Benchmark in Node.js: node node/run.mjs
// Laedt die von Emscripten erzeugten Module ueber den JavaScript glue code (.mjs).
import createModuleO3 from '../build/bench.mjs';
import createModuleO0 from '../build/bench_O0.mjs';
import { runAll, toMarkdown, RUNS } from '../js/runner.js';

const moduleO3 = await createModuleO3();
const moduleO0 = await createModuleO0();

console.log(`Node.js ${process.version} – Median aus ${RUNS} Läufen\n`);

const rows = await runAll({ 'Wasm -O3': moduleO3, 'Wasm -O0': moduleO0 }, (row) => {
  const o3 = row.wasm['Wasm -O3'];
  const o0 = row.wasm['Wasm -O0'];
  console.log(
    `${row.name.padEnd(22)} JS ${row.jsMs.toFixed(1).padStart(8)} ms | ` +
      `Wasm -O3 ${o3.ms.toFixed(1).padStart(8)} ms (${o3.speedup.toFixed(2)}×) | ` +
      `Wasm -O0 ${o0.ms.toFixed(1).padStart(8)} ms (${o0.speedup.toFixed(2)}×)` +
      (o3.correct && o0.correct ? '' : '  ⚠ Ergebnis weicht ab!'),
  );
});

console.log('\nMarkdown für das README:\n');
console.log(toMarkdown(rows));
