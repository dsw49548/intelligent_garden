#pragma once

#include <Arduino.h>
#include "config.h"

// Wartości domyślne: build działa także ze starszym lokalnym config.h,
// który nie zna jeszcze kluczy pompy. Nadpisz je w config.h.
#ifndef PUMP_PIN
#define PUMP_PIN 23            // GPIO sterujące wejściem IN przekaźnika
#endif

#ifndef PUMP_ACTIVE_HIGH
#define PUMP_ACTIVE_HIGH 1     // 1: HIGH = pompa pracuje (zworka H/L na H)
#endif

#ifndef PUMP_MAX_RUN_MS
#define PUMP_MAX_RUN_MS 10000  // twardy limit pojedynczej pracy pompy [ms]
#endif

#define PUMP_MIN_RUN_MS 100

// Ustawia pin w stan nieaktywny (OFF). Wołać jako pierwszą rzecz w setup().
void pumpBegin();

// Uruchamia pompę na `ms` milisekund. Zwraca false (i loguje powód), gdy
// ms < PUMP_MIN_RUN_MS, ms > PUMP_MAX_RUN_MS albo pompa już pracuje.
bool pumpStart(uint32_t ms);

// Natychmiast wyłącza pompę. `reason` trafia do logu (timer|stop|limit|siec).
void pumpStop(const char* reason);

// Wołać w każdym przebiegu loop(): wyłącza pompę po zadanym czasie
// oraz bezwarunkowo po PUMP_MAX_RUN_MS (bezpiecznik). Obsługuje też clicktest.
void pumpUpdate(uint32_t now);

bool pumpIsRunning();

// Zmierzony czas ostatniej zakończonej pracy pompy [ms].
uint32_t pumpLastRunMs();

// Test przekaźnika: 3 cykle 300 ms ON / 700 ms OFF, nieblokująco.
bool pumpClicktestStart();
void pumpClicktestAbort();
bool pumpClicktestActive();
