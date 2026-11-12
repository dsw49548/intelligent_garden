#pragma once

// Skopiuj ten plik do src/config.h i uzupełnij dane WiFi.
// src/config.h jest w .gitignore — nie commituj haseł.

#define WIFI_SSID        "YOUR_WIFI_SSID"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"
#define SERVER_HOST      "192.168.1.82"   // IP laptopa z `hostname -I`
#define SERVER_PORT      4567
#define PLANT_ID         1
#define SEND_INTERVAL_MS 5000

#define SOIL_WET_RAW  1500
#define SOIL_DRY_RAW  2400
