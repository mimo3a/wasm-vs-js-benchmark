/*
 * bench.js - dieselben Algorithmen wie in src/bench.c, in reinem JavaScript.
 *
 * Um identische Ergebnisse zu bekommen, wird 32-Bit-Integer-Arithmetik
 * nachgebildet: Math.imul (32-Bit-Multiplikation) und ">>> 0" (unsigned 32 Bit).
 */

const MAX_SORT = 20000;
const MAX_MAT = 400;

const sortBuf = new Int32Array(MAX_SORT);
const matA = new Float64Array(MAX_MAT * MAX_MAT);
const matB = new Float64Array(MAX_MAT * MAX_MAT);
const matC = new Float64Array(MAX_MAT * MAX_MAT);

// 1) Bubble Sort
export function bubbleSortBench(n, repeats, seed) {
  if (n > MAX_SORT) n = MAX_SORT;
  let state = seed >>> 0;
  let checksum = 0;

  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < n; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      sortBuf[i] = ((state >>> 8) % 100000);
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        if (sortBuf[j] > sortBuf[j + 1]) {
          const tmp = sortBuf[j];
          sortBuf[j] = sortBuf[j + 1];
          sortBuf[j + 1] = tmp;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      checksum = (Math.imul(checksum, 31) + sortBuf[i]) >>> 0;
    }
  }
  return checksum | 0; // als signed int32, wie der Rueckgabewert der C-Funktion
}

// 2) Primzahlen zaehlen
export function countPrimes(limit) {
  let count = 0;
  for (let n = 2; n < limit; n++) {
    let isPrime = 1;
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) {
        isPrime = 0;
        break;
      }
    }
    count += isPrime;
  }
  return count;
}

// 3) Fibonacci rekursiv
export function fib(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

// 4) Matrixmultiplikation
export function matmulBench(n, repeats) {
  if (n > MAX_MAT) n = MAX_MAT;
  const size = n * n;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      matA[i * n + j] = ((i * n + j) % 7) * 0.5;
      matB[i * n + j] = ((i + 2 * j) % 5) * 0.25;
    }
  }

  let checksum = 0.0;
  for (let r = 0; r < repeats; r++) {
    matA[r % size] += 1.0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0.0;
        for (let k = 0; k < n; k++) {
          sum += matA[i * n + k] * matB[k * n + j];
        }
        matC[i * n + j] = sum;
      }
    }
    for (let i = 0; i < n; i++) {
      checksum += matC[i * n + i];
    }
  }
  return checksum;
}
