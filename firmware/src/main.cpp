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

DHT dht(DHT_PIN, DHT22);
BH1750 lightMeter;

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
  time_t t = 0;
  for (int i = 0; i < 30 && t < 1000000000L; i++) {
    delay(500);
    time(&t);
    Serial.print(".");
  }
  Serial.println(t > 1000000000L ? " OK" : " BLAD");
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

unsigned long lastSend = 0;

void loop() {
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
 
  Serial.printf("T=%.1fC H=%.1f%% L=%.0flux Gleba=%d%%(%d raw)\n",
                temp, hum, lux, soil, raw);

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    if (!isnan(temp)) {
      sendData(temp, hum, lux, soil);
    }
    lastSend = millis();
  }
  
  delay(2000); 
}