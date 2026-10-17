#!/usr/bin/env sh
# Kompiliert den C-Code mit Emscripten (Docker-Image emscripten/emsdk) zu WebAssembly.
# Aufruf (Linux/macOS/Git Bash):  ./build.sh
# Ist emcc lokal installiert, wird es direkt verwendet, sonst Docker.
set -e
mkdir -p build

emcc_run() {
  echo "emcc $*"
  if command -v emcc >/dev/null 2>&1; then
    emcc "$@"
  else
    docker run --rm -v "$(pwd):/src" -w /src emscripten/emsdk emcc "$@"
  fi
}

BENCH_EXPORTS="-sEXPORTED_FUNCTIONS=_bubble_sort_bench,_count_primes,_fib,_matmul_bench"
MATH_EXPORTS="-sEXPORTED_FUNCTIONS=_add,_subtract"

emcc_run src/bench.c -O3 -o build/bench.mjs    "$BENCH_EXPORTS"
emcc_run src/bench.c -O0 -o build/bench_O0.mjs "$BENCH_EXPORTS"

emcc_run example/math.c -O2 -o build/math.mjs             "$MATH_EXPORTS"
emcc_run example/math.c -O2 -o build/math_standalone.wasm "$MATH_EXPORTS"

echo
echo "Fertig:"
ls -l build
