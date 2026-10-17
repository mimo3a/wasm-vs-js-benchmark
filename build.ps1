# Kompiliert den C-Code mit Emscripten (Docker-Image emscripten/emsdk) zu WebAssembly.
# Voraussetzung: Docker Desktop laeuft.
# Aufruf in PowerShell im Projektordner:  .\build.ps1
# (falls Skripte blockiert sind: powershell -ExecutionPolicy Bypass -File .\build.ps1)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path build | Out-Null

function Invoke-Emcc([string[]]$EmccArgs) {
    Write-Host "emcc $($EmccArgs -join ' ')"
    # --rm: Container nach dem Lauf loeschen, -v: Projektordner nach /src mounten
    docker run --rm -v "${PWD}:/src" -w /src emscripten/emsdk emcc @EmccArgs
    if ($LASTEXITCODE -ne 0) { throw "emcc fehlgeschlagen" }
}

# Kommas muessen in Anfuehrungszeichen stehen, sonst macht PowerShell daraus ein Array.
$benchExports = "-sEXPORTED_FUNCTIONS=_bubble_sort_bench,_count_primes,_fib,_matmul_bench"
$mathExports  = "-sEXPORTED_FUNCTIONS=_add,_subtract"

# Benchmark: optimiert (-O3) und unoptimiert (-O0), jeweils .wasm + JavaScript glue code (.mjs)
Invoke-Emcc @("src/bench.c", "-O3", "-o", "build/bench.mjs", $benchExports)
Invoke-Emcc @("src/bench.c", "-O0", "-o", "build/bench_O0.mjs", $benchExports)

# Einstiegsbeispiel: einmal mit glue code, einmal als reine .wasm-Datei
Invoke-Emcc @("example/math.c", "-O2", "-o", "build/math.mjs", $mathExports)
Invoke-Emcc @("example/math.c", "-O2", "-o", "build/math_standalone.wasm", "--no-entry", $mathExports)
Write-Host "`nFertig. Dateien in .\build:"
Get-ChildItem build | Format-Table Name, Length
