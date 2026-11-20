#pragma once

#include <Arduino.h>
#include "config.h"

#define PUMP_MIN_RUN_MS 100

void pumpBegin();
bool pumpStart(uint32_t ms);
void pumpStop(const char* reason);
// Must be called on every loop() pass: it stops the pump after the requested time.
void pumpUpdate(uint32_t now);
bool pumpIsRunning();
uint32_t pumpLastRunMs();
