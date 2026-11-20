#include "pump.h"

#define PUMP_LEVEL_ON  (PUMP_ACTIVE_HIGH ? HIGH : LOW)
#define PUMP_LEVEL_OFF (PUMP_ACTIVE_HIGH ? LOW : HIGH)

static bool     running     = false;
static uint32_t startMs     = 0;
static uint32_t requestedMs = 0;
static uint32_t lastRunMs   = 0;

void pumpBegin() {
  // Write OFF to the output register before switching the pin to OUTPUT,
  // otherwise the relay can get a short ON pulse right after reset.
  digitalWrite(PUMP_PIN, PUMP_LEVEL_OFF);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, PUMP_LEVEL_OFF);
  running = false;
}

bool pumpStart(uint32_t ms) {
  if (ms < PUMP_MIN_RUN_MS) {
    Serial.printf("PUMP: odrzucono %lu ms (minimum %d ms)\n",
                  (unsigned long)ms, PUMP_MIN_RUN_MS);
    return false;
  }
  if (ms > PUMP_MAX_RUN_MS) {
    Serial.printf("PUMP: odrzucono %lu ms (maksimum PUMP_MAX_RUN_MS=%lu ms)\n",
                  (unsigned long)ms, (unsigned long)PUMP_MAX_RUN_MS);
    return false;
  }
  if (running) {
    Serial.println("PUMP: odrzucono, pompa juz pracuje");
    return false;
  }

  requestedMs = ms;
  startMs = millis();
  running = true;
  digitalWrite(PUMP_PIN, PUMP_LEVEL_ON);
  Serial.printf("PUMP ON (zadane %lu ms)\n", (unsigned long)ms);
  return true;
}

void pumpStop(const char* reason) {
  // Force the pin OFF even if the flag says the pump is already stopped.
  digitalWrite(PUMP_PIN, PUMP_LEVEL_OFF);
  if (!running) {
    return;
  }
  running = false;
  lastRunMs = millis() - startMs;
  Serial.printf("PUMP OFF (powod: %s), pracowala %lu ms\n",
                reason, (unsigned long)lastRunMs);
}

void pumpUpdate(uint32_t now) {
  if (running) {
    uint32_t elapsed = now - startMs;  // also correct after millis() overflow
    if (elapsed >= requestedMs) {
      pumpStop("timer");
    } else if (elapsed >= PUMP_MAX_RUN_MS) {
      // Hard safety limit, independent of the requested time.
      pumpStop("limit");
    }
  }
}

bool pumpIsRunning() {
  return running;
}

uint32_t pumpLastRunMs() {
  return lastRunMs;
}
