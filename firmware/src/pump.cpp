#include "pump.h"

#define PUMP_LEVEL_ON  (PUMP_ACTIVE_HIGH ? HIGH : LOW)
#define PUMP_LEVEL_OFF (PUMP_ACTIVE_HIGH ? LOW : HIGH)

#define CLICK_CYCLES 3
#define CLICK_ON_MS  300
#define CLICK_OFF_MS 700

static bool     running     = false;
static uint32_t startMs     = 0;
static uint32_t requestedMs = 0;
static uint32_t lastRunMs   = 0;

enum ClickPhase { CLICK_IDLE, CLICK_ON, CLICK_OFF };
static ClickPhase clickPhase   = CLICK_IDLE;
static uint8_t    clickCycle   = 0;
static uint32_t   clickPhaseMs = 0;

void pumpBegin() {
  // Najpierw poziom OFF w rejestrze wyjściowym, dopiero potem kierunek OUTPUT,
  // żeby przy przełączeniu pinu nie pojawił się krótki impuls ON.
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
  // Pin wymuszamy na OFF zawsze, nawet jeśli flaga mówi, że pompa stoi.
  digitalWrite(PUMP_PIN, PUMP_LEVEL_OFF);
  if (!running) {
    return;
  }
  running = false;
  lastRunMs = millis() - startMs;
  Serial.printf("PUMP OFF (powod: %s), pracowala %lu ms\n",
                reason, (unsigned long)lastRunMs);
}

static void clicktestUpdate(uint32_t now) {
  switch (clickPhase) {
    case CLICK_IDLE:
      return;
    case CLICK_ON:
      if (!running) {  // timer (albo bezpiecznik/siec) wyłączył pompę
        clickPhase = CLICK_OFF;
        clickPhaseMs = now;
      }
      return;
    case CLICK_OFF:
      if (now - clickPhaseMs < CLICK_OFF_MS) {
        return;
      }
      if (++clickCycle >= CLICK_CYCLES) {
        clickPhase = CLICK_IDLE;
        Serial.println("CLICKTEST: koniec");
        return;
      }
      Serial.printf("CLICKTEST: cykl %d/%d\n", clickCycle + 1, CLICK_CYCLES);
      if (pumpStart(CLICK_ON_MS)) {
        clickPhase = CLICK_ON;
      } else {
        clickPhase = CLICK_IDLE;
        Serial.println("CLICKTEST: przerwany");
      }
      return;
  }
}

void pumpUpdate(uint32_t now) {
  if (running) {
    uint32_t elapsed = now - startMs;  // poprawne także po przepełnieniu millis()
    if (elapsed >= requestedMs) {
      pumpStop("timer");
    } else if (elapsed >= PUMP_MAX_RUN_MS) {
      // Twardy bezpiecznik: niezależny od zadanego czasu.
      pumpStop("limit");
    }
  }
  clicktestUpdate(now);
}

bool pumpIsRunning() {
  return running;
}

uint32_t pumpLastRunMs() {
  return lastRunMs;
}

bool pumpClicktestStart() {
  if (clickPhase != CLICK_IDLE) {
    Serial.println("CLICKTEST: juz trwa");
    return false;
  }
  if (running) {
    Serial.println("CLICKTEST: odrzucono, pompa pracuje");
    return false;
  }
  clickCycle = 0;
  Serial.printf("CLICKTEST: start, %d cykle %d ms ON / %d ms OFF\n",
                CLICK_CYCLES, CLICK_ON_MS, CLICK_OFF_MS);
  Serial.printf("CLICKTEST: cykl 1/%d\n", CLICK_CYCLES);
  if (!pumpStart(CLICK_ON_MS)) {
    return false;
  }
  clickPhase = CLICK_ON;
  return true;
}

void pumpClicktestAbort() {
  if (clickPhase == CLICK_IDLE) {
    return;
  }
  clickPhase = CLICK_IDLE;
  Serial.println("CLICKTEST: przerwany");
}

bool pumpClicktestActive() {
  return clickPhase != CLICK_IDLE;
}
