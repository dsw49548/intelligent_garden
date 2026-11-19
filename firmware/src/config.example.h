#pragma once

// Skopiuj ten plik do src/config.h i uzupełnij dane WiFi.
// src/config.h jest w .gitignore — nie commituj haseł.

#define WIFI_SSID        "YOUR_WIFI_SSID"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"
#define SERVER_HOST      "192.168.1.82"   // IP laptopa z `hostname -I`
#define SERVER_PORT      4567
#define DEVICE_ID        "esp32-1"  // identyfikator urzadzenia, roslina wybierana w aplikacji
#define SEND_INTERVAL_MS 5000

#define SOIL_WET_RAW  1500
#define SOIL_DRY_RAW  2400

// Pompka przez przekaznik (modul JQC3F-05VDC-C, zworka H/L na H)
#define PUMP_PIN         23     // GPIO -> wejscie IN przekaznika
#define PUMP_ACTIVE_HIGH 1      // 1: HIGH = pompa pracuje, 0: LOW = pompa pracuje
#define PUMP_MAX_RUN_MS  10000  // twardy limit pojedynczej pracy pompy [ms]

// Podlewanie
#define WATER_ML_PER_SEC     6      // wydajnosc pompy [ml/s]
#define MAX_WATER_ML_PER_DAY 100    // lokalny limit wody na 24 h, niezalezny od serwera
#define AUTO_MAX_TEMP_C      30     // auto podlewanie tylko gdy temp <= tej wartosci
#define AUTO_MAX_LUX         20000  // auto podlewanie tylko gdy swiatlo <= tej wartosci (nie w pelnym sloncu)
