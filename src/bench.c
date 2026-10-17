/*
 * bench.c - rechenintensive Funktionen fuer den Vergleich WebAssembly vs. JavaScript.
 *
 * Jede Funktion liefert eine Pruefsumme zurueck. Damit
 *   1) der Compiler die Berechnung nicht als "toten Code" entfernt und
 *   2) im Benchmark geprueft werden kann, dass Wasm und JS dasselbe Ergebnis liefern.
 *
 * Die Eingabedaten werden innerhalb der Funktion mit einem deterministischen
 * Zufallsgenerator (LCG) erzeugt. Es werden also keine grossen Arrays zwischen
 * JS und Wasm kopiert - gemessen wird nur die eigentliche Berechnung.
 *
 * Die exakt gleichen Algorithmen sind in js/bench.js implementiert.
 */
#include <stdint.h>

#define MAX_SORT 20000
#define MAX_MAT  400

static int32_t sort_buf[MAX_SORT];
static double mat_a[MAX_MAT * MAX_MAT];
static double mat_b[MAX_MAT * MAX_MAT];
static double mat_c[MAX_MAT * MAX_MAT];

/* Linear Congruential Generator (Numerical Recipes), 32 Bit */
static uint32_t lcg_next(uint32_t *state) {
    *state = *state * 1664525u + 1013904223u;
    return *state;
}

/*
 * 1) Bubble Sort
 * Fuellt ein Array mit n Zufallszahlen, sortiert es mit Bubble Sort (O(n^2))
 * und wiederholt das 'repeats' mal mit jeweils neuen Zahlen.
 */
int bubble_sort_bench(int n, int repeats, int seed) {
    if (n > MAX_SORT) n = MAX_SORT;
    uint32_t state = (uint32_t)seed;
    uint32_t checksum = 0;

    for (int r = 0; r < repeats; r++) {
        for (int i = 0; i < n; i++) {
            sort_buf[i] = (int32_t)((lcg_next(&state) >> 8) % 100000u);
        }
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (sort_buf[j] > sort_buf[j + 1]) {
                    int32_t tmp = sort_buf[j];
                    sort_buf[j] = sort_buf[j + 1];
                    sort_buf[j + 1] = tmp;
                }
            }
        }
        for (int i = 0; i < n; i++) {
            checksum = checksum * 31u + (uint32_t)sort_buf[i];
        }
    }
    return (int)checksum;
}

/*
 * 2) Primzahlen zaehlen
 * Zaehlt alle Primzahlen < limit per Probedivision.
 */
int count_primes(int limit) {
    int count = 0;
    for (int n = 2; n < limit; n++) {
        int is_prime = 1;
        for (int d = 2; d * d <= n; d++) {
            if (n % d == 0) {
                is_prime = 0;
                break;
            }
        }
        count += is_prime;
    }
    return count;
}

/*
 * 3) Fibonacci rekursiv
 * Bewusst ineffizient (O(2^n)) - testet Funktionsaufrufe.
 */
int fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

/*
 * 4) Matrixmultiplikation
 * C = A * B fuer n x n Matrizen (O(n^3)), 'repeats' mal.
 * Vor jeder Wiederholung wird A leicht veraendert, damit der Compiler
 * die Schleife nicht zusammenfassen kann.
 */
double matmul_bench(int n, int repeats) {
    if (n > MAX_MAT) n = MAX_MAT;
    int size = n * n;

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            mat_a[i * n + j] = (double)((i * n + j) % 7) * 0.5;
            mat_b[i * n + j] = (double)((i + 2 * j) % 5) * 0.25;
        }
    }

    double checksum = 0.0;
    for (int r = 0; r < repeats; r++) {
        mat_a[r % size] += 1.0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                double sum = 0.0;
                for (int k = 0; k < n; k++) {
                    sum += mat_a[i * n + k] * mat_b[k * n + j];
                }
                mat_c[i * n + j] = sum;
            }
        }
        for (int i = 0; i < n; i++) {
            checksum += mat_c[i * n + i];
        }
    }
    return checksum;
}
