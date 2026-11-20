#pragma once

// Copy this file to src/config.h and fill in the WiFi settings.
// src/config.h is in .gitignore, do not commit passwords.

#define WIFI_SSID        "YOUR_WIFI_SSID"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"
#define SERVER_HOST      "192.168.1.82"   // laptop IP from `hostname -I`
#define SERVER_PORT      4567
#define DEVICE_ID        "esp32-1"        // the plant measured by this device is chosen in the app
#define SEND_INTERVAL_MS 5000

// Raw ADC readings mapped to 100% (wet) and 0% (dry) soil moisture
#define SOIL_WET_RAW  1500
#define SOIL_DRY_RAW  2400

// Pump through a relay (JQC3F-05VDC-C module, H/L jumper on H)
#define PUMP_PIN         23     // GPIO -> relay IN
#define PUMP_ACTIVE_HIGH 1      // 1: HIGH = pump on, 0: LOW = pump on
#define PUMP_MAX_RUN_MS  10000  // hard limit of a single pump run [ms]

#define WATER_ML_PER_SEC     6      // pump flow [ml/s]
#define MAX_WATER_ML_PER_DAY 200    // local 24 h water limit, independent of the server
#define AUTO_MAX_TEMP_C      30     // no auto watering above this temperature
#define AUTO_MAX_LUX         20000  // no auto watering in full sun
