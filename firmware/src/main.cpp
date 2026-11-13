#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include <time.h>
#include "config.h"
#include "pump.h"

#define DHT_PIN  4
#define SOIL_PIN 34

// Log na Serial co 2 s, niezależnie od wysyłki (SEND_INTERVAL_MS z config.h)
#define LOG_INTERVAL_MS      2000UL
// Ponowna synchronizacja NTP nie częściej niż co 30 s
#define NTP_RETRY_MS         30000UL
// Czas uznajemy za poprawny dopiero po synchronizacji (2023-11-14)
#define TIME_VALID_AFTER     1700000000L

DHT dht(DHT_PIN, DHT22);
BH1750 lightMeter;

unsigned long lastSend = 0;
unsigned long lastLog = 0;
unsigned long lastNtpAttempt = 0;
bool timeSynced = false;

bool timeIsValid() {
  return time(nullptr) >= TIME_VALID_AFTER;
}

// Ostatnia linia obrony przed wywołaniem blokującym (WiFi, NTP, HTTP):
// w trakcie blokady pumpUpdate() się nie wykona, więc pompa nie może pracować.
// Normalnie loop() w ogóle nie dochodzi tu przy pracującej pompie.
void stopPumpBeforeBlocking() {
  if (pumpIsRunning()) {
    pumpStop("siec");
  }
}

void connectWiFi() {
  stopPumpBeforeBlocking();
  Serial.printf("WiFi: laczenie z %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int i = 0;
  while (WiFi.status() != WL_CONNECTED && i++ < 30) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi OK, IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("WiFi BLAD - sprawdz SSID/haslo");
  }
}

void syncNTP() {
  stopPumpBeforeBlocking();
  configTime(0, 0, "pool.ntp.org");
  Serial.print("NTP...");
  for (int i = 0; i < 30 && !timeIsValid(); i++) {
    delay(500);
    Serial.print(".");
  }
  timeSynced = timeIsValid();
  lastNtpAttempt = millis();
  Serial.println(timeSynced ? " OK" : " BLAD");
}

// Nieblokujące pilnowanie NTP: SNTP działa w tle, tu tylko sprawdzamy stan
// i co NTP_RETRY_MS restartujemy klienta, jeśli czas wciąż jest niepoprawny.
void maintainNTP(unsigned long now) {
  if (timeIsValid()) {
    if (!timeSynced) {
      timeSynced = true;
      Serial.println("NTP OK (synchronizacja w tle)");
    }
    return;
  }
  timeSynced = false;
  if (pumpIsRunning() || pumpClicktestActive()) {
    return;  // ponowienie NTP odkładamy do zatrzymania pompy
  }
  if (WiFi.status() == WL_CONNECTED && now - lastNtpAttempt >= NTP_RETRY_MS) {
    lastNtpAttempt = now;
    Serial.println("NTP: brak synchronizacji, ponawiam");
    configTime(0, 0, "pool.ntp.org");
  }
}

String isoTime() {
  time_t t;
  time(&t);
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", gmtime(&t));
  return String(buf);
}

int soilPercent(int raw) {
  return constrain(map(raw, SOIL_WET_RAW, SOIL_DRY_RAW, 100, 0), 0, 100);
}

void sendData(float temp, float hum, float lux, int soilPct) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }

  String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + "/api/measurements";
  String body = "{\"plant_id\":" + String(PLANT_ID) +
    ",\"measured_at\":\"" + isoTime() + "\"" +
    ",\"soil_moisture\":" + String(soilPct) +
    ",\"air_temp_c\":" + String(temp, 1) +
    ",\"air_humidity\":" + String(hum, 1) +
    ",\"light_lux\":" + String((int)lux) + "}";

  stopPumpBeforeBlocking();
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  Serial.printf("POST %d: %s\n", code, body.c_str());
  http.end();
}

// ---------- Komendy testowe po Serialu ----------

#define CMD_BUF_LEN 48
char cmdBuf[CMD_BUF_LEN];
size_t cmdLen = 0;
bool cmdOverflow = false;

void cmdHelp() {
  Serial.println("Komendy:");
  Serial.println("  help        lista komend");
  Serial.println("  status      stan pompy, WiFi i czasu");
  Serial.printf ("  pump <ms>   start pompy na <ms> (%d..%lu), np. pump 2000\n",
                 PUMP_MIN_RUN_MS, (unsigned long)PUMP_MAX_RUN_MS);
  Serial.println("  stop        natychmiastowe wylaczenie (przerywa tez clicktest)");
  Serial.println("  clicktest   3 cykle 300 ms ON / 700 ms OFF (test przekaznika)");
}

void cmdStatus() {
  Serial.printf("STATUS: pompa %s", pumpIsRunning() ? "ON" : "OFF");
  if (pumpClicktestActive()) {
    Serial.print(" (clicktest trwa)");
  }
  Serial.printf(", ostatnia praca %lu ms\n", (unsigned long)pumpLastRunMs());
  Serial.printf("STATUS: PUMP_PIN=%d PUMP_ACTIVE_HIGH=%d PUMP_MAX_RUN_MS=%lu\n",
                PUMP_PIN, PUMP_ACTIVE_HIGH, (unsigned long)PUMP_MAX_RUN_MS);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("STATUS: WiFi polaczone, IP %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("STATUS: WiFi rozlaczone");
  }
  if (timeIsValid()) {
    Serial.printf("STATUS: czas zsynchronizowany (%s)\n", isoTime().c_str());
  } else {
    Serial.println("STATUS: czas NIEzsynchronizowany");
  }
}

void cmdPump(const char* arg) {
  while (*arg == ' ') arg++;
  char* end = nullptr;
  unsigned long ms = strtoul(arg, &end, 10);
  if (*arg == '\0' || *arg == '-' || end == arg || *end != '\0') {
    Serial.println("Uzycie: pump <ms>, np. pump 2000");
    return;
  }
  if (pumpClicktestActive()) {
    Serial.println("PUMP: odrzucono, trwa clicktest (wpisz stop)");
    return;
  }
  pumpStart(ms);
}

void handleCommand(char* line) {
  // Przytnij spacje z końca i z początku, zamień na małe litery
  size_t n = strlen(line);
  while (n > 0 && line[n - 1] == ' ') line[--n] = '\0';
  while (*line == ' ') line++;
  for (char* p = line; *p; p++) *p = tolower((unsigned char)*p);
  if (*line == '\0') {
    return;
  }

  Serial.printf("> %s\n", line);
  if (strcmp(line, "help") == 0) {
    cmdHelp();
  } else if (strcmp(line, "status") == 0) {
    cmdStatus();
  } else if (strcmp(line, "stop") == 0) {
    bool wasRunning = pumpIsRunning();
    pumpClicktestAbort();
    pumpStop("stop");  // wymusza pin na OFF także, gdy pompa już stoi
    if (!wasRunning) {
      Serial.println("PUMP: juz wylaczona");
    }
  } else if (strcmp(line, "clicktest") == 0) {
    pumpClicktestStart();
  } else if (strcmp(line, "pump") == 0 || strncmp(line, "pump ", 5) == 0) {
    cmdPump(line + 4);
  } else {
    Serial.println("Nieznana komenda, wpisz help");
  }
}

// Nieblokujące czytanie znak po znaku; linia kończy się \n lub \r.
void handleSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\t') {
      c = ' ';
    }
    if (c == '\n' || c == '\r') {
      if (cmdOverflow) {
        Serial.println("Komenda za dluga, wpisz help");
      } else {
        cmdBuf[cmdLen] = '\0';
        handleCommand(cmdBuf);
      }
      cmdLen = 0;
      cmdOverflow = false;
    } else if (isprint((unsigned char)c)) {
      if (cmdLen < CMD_BUF_LEN - 1) {
        cmdBuf[cmdLen++] = c;
      } else {
        cmdOverflow = true;
      }
    }
  }
}

void setup() {
  // Pierwsza rzecz po resecie: przekaźnik w stan nieaktywny (pompa stoi).
  pumpBegin();

  Serial.begin(115200);
  delay(1000);
  Serial.println("PUMP: OFF (init)");

  Wire.begin(21, 22);
  dht.begin();
  lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);

  connectWiFi();
  syncNTP();

  Serial.println("=== START ===");
}

void loop() {
  unsigned long now = millis();
  pumpUpdate(now);  // w każdym przebiegu, przed wczesnym return
  handleSerial();
  maintainNTP(now);

  bool sendDue = now - lastSend >= SEND_INTERVAL_MS;
  bool logDue  = now - lastLog  >= LOG_INTERVAL_MS;
  if (!sendDue && !logDue) {
    delay(1);  // oddaj CPU innym zadaniom (WiFi/lwIP, IDLE); max 1 ms opóźnienia
    return;
  }

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  float lux  = lightMeter.readLightLevel();

  long rawSum = 0;
  int numSamples = 20;

  for (int i = 0; i < numSamples; i++) {
    rawSum += analogRead(SOIL_PIN);
    delay(10);
    pumpUpdate(millis());  // uśrednianie trwa ~200 ms; timer pompy nie może czekać
  }

  int raw = rawSum / numSamples;
  int soil = soilPercent(raw);

  if (lux < 0) {
    lux = 0;
  }

  if (logDue) {
    lastLog = now;
    Serial.printf("T=%.1fC H=%.1f%% L=%.0flux Gleba=%d%%(%d raw)\n",
                  temp, hum, lux, soil, raw);
  }

  if (sendDue) {
    // Stały rytm co SEND_INTERVAL_MS (bez dryfu o czas odczytu i POST).
    // Po dłuższej blokadzie (np. reconnect WiFi) nie nadrabiamy zaległych wysyłek.
    lastSend += SEND_INTERVAL_MS;
    if (now - lastSend >= SEND_INTERVAL_MS) {
      lastSend = now;
    }

    if (pumpIsRunning() || pumpClicktestActive()) {
      // connectWiFi/NTP/POST blokują na sekundy, a wtedy pumpUpdate() nie działa.
      Serial.println("POMIJAM wysylke: pompa pracuje");
    } else if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();  // jak wcześniej: pomiar przepada, reconnect do ~15 s
    } else if (isnan(temp) || isnan(hum)) {
      Serial.printf("POMIJAM wysylke: DHT22 zwrocil NaN (temp=%s, hum=%s)\n",
                    isnan(temp) ? "NaN" : "ok", isnan(hum) ? "NaN" : "ok");
    } else if (!timeIsValid()) {
      Serial.println("POMIJAM wysylke: brak synchronizacji czasu (NTP)");
    } else {
      sendData(temp, hum, lux, soil);
    }
  }
}