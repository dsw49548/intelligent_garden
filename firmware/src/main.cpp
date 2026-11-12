#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include <time.h>
#include "config.h"

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

void connectWiFi() {
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

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  Serial.printf("POST %d: %s\n", code, body.c_str());
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(21, 22);
  dht.begin();
  lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);

  connectWiFi();
  syncNTP();

  Serial.println("=== START ===");
}

void loop() {
  unsigned long now = millis();
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

    if (WiFi.status() != WL_CONNECTED) {
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