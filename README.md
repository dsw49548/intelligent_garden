Intelligent Garden to projekt systemu monitorowania roślin z wykorzystaniem czujników IoT. Projekt składa się z generatora danych Fake IoT oraz backendu API w Ruby z frameworkiem Sinatra, który przechowuje dane z czujników roślin w bazie SQLite.

## Uruchomienie

### Jednorazowa konfiguracja

Wymagania: Ruby z bundlerem, Node.js z npm, `adb` (Android platform-tools), PlatformIO (dla firmware).

```bash
# backend
cd backend
bundle config set --local path 'vendor/bundle'
bundle install
echo "TREFLE_TOKEN=twoj_token" > .env   # backend/.env, token z trefle.io
cd ..

# frontend
cd frontend
npm install
cd ..

# firmware
cp firmware/src/config.example.h firmware/src/config.h
# w config.h uzupełnij WIFI_SSID, WIFI_PASSWORD i SERVER_HOST (wynik `hostname -I`)
```

`backend/.env` i `firmware/src/config.h` są w `.gitignore` — nie commituj ich.

### Start (4 terminale)

Telefon musi być podłączony przez USB (patrz niżej).

```bash
# terminal 1 — backend (http://localhost:4567)
cd backend && bundle exec ruby app.rb
```

```bash
# terminal 2 — frontend, build produkcyjny + preview (http://localhost:4173)
cd frontend && npm run build && npm run preview
```

```bash
# terminal 3 — przekierowanie portu frontendu na telefon
adb reverse tcp:4173 tcp:4173
```

```bash
# terminal 4 — przekierowanie portu backendu na telefon
adb reverse tcp:4567 tcp:4567
```

Sprawdzenie backendu: `curl http://localhost:4567/health` → `{"status":"ok"}`.

### Telefon (Android) krok po kroku

1. Ustawienia → Informacje o telefonie → 7× stuknij „Numer kompilacji”, aby włączyć opcje programisty.
2. Opcje programisty → włącz **Debugowanie USB**.
3. Podłącz telefon kablem i zaakceptuj na telefonie okno „Zezwolić na debugowanie USB?”.
4. `adb devices` — urządzenie musi mieć status `device` (nie `unauthorized`).
5. Wykonaj oba `adb reverse` z sekcji Start.
6. W Chrome na telefonie otwórz `http://localhost:4173`.
7. Menu Chrome (⋮) → **Zainstaluj aplikację** / **Dodaj do ekranu głównego**.

WebAPK instaluje się tylko z preview (port 4173), nie z dev servera (`npm run dev`, port 5173).
Przy błędzie „Failed to install WebAPK”: Ustawienia → Aplikacje → Sklep Google Play → Pamięć → **Wyczyść dane**, potem spróbuj ponownie.

### Firmware (ESP32)

```bash
# wgranie
~/.platformio/penv/bin/pio run -d firmware -t upload

# monitor portu szeregowego (115200, /dev/ttyUSB0)
~/.platformio/penv/bin/pio device monitor -d firmware
```

Komendy do ESP32 można wysyłać z drugiego terminala (odpowiedź pojawia się w monitorze):

```bash
printf 'status\n' > /dev/ttyUSB0
printf 'pump 2000\n' > /dev/ttyUSB0
printf 'stop\n' > /dev/ttyUSB0
```

Pełna lista: `printf 'help\n' > /dev/ttyUSB0`.
`SERVER_HOST` w `config.h` = adres IP laptopa z `hostname -I` (laptop i ESP32 w tej samej sieci WiFi). Po zmianie IP wgraj firmware ponownie.

### Fake IoT (opcjonalnie, zamiast ESP32)

W osobnym terminalu, przy działającym backendzie:

```bash
cd backend && bundle exec ruby fake_iot.rb
```

W CLI: `set 1` (plant_id), potem `once` (jeden pomiar) lub `start` (ciągła wysyłka), `stop`, `quit`.
Inne komendy: `mode <stable|daynight|dryout|randomwalk>`, `interval <s>`, `status`, `help`.

### Zatrzymanie

1. `Ctrl+C` w terminalu backendu i frontendu (oraz Fake IoT / monitora, jeśli działają).
2. `adb reverse --remove-all`

### Najczęstsze problemy

- **Zajęty port** (`Address already in use` dla 4567 lub preview na innym porcie niż 4173): znajdź proces `ss -ltnp | grep -E ':4567|:4173'` i zakończ go `kill <PID>`.
- **`POST -1` w logu ESP32**: brak połączenia z backendem — sprawdź, czy backend działa, czy `SERVER_HOST` zgadza się z aktualnym `hostname -I`, czy ESP32 i laptop są w tej samej sieci i czy firewall nie blokuje portu 4567.
- **Telefon `unauthorized` w `adb devices`**: odblokuj telefon i zaakceptuj okno debugowania USB; jeśli się nie pojawia — Opcje programisty → Odwołaj autoryzacje debugowania USB, odłącz i podłącz kabel, `adb kill-server && adb devices`.
- **Aplikacja na telefonie bez danych**: brak `adb reverse tcp:4567 tcp:4567` (np. po ponownym podłączeniu kabla) — wykonaj ponownie oba `adb reverse` i odśwież aplikację.

## Kiedy instalować zależności?

**Backend (`bundle install`):**
- Tylko po zmianie `Gemfile` lub `Gemfile.lock`
- Na świeżym klonie repozytorium
- Jeśli pojawiają się błędy o brakujących gemach

**Frontend (`npm install`):**
- Tylko po zmianie `package.json` lub `package-lock.json`
- Na świeżym klonie repozytorium
- Jeśli pojawiają się błędy o brakujących pakietach

**Uwaga:** Jeśli już masz zainstalowane zależności i wszystko działa, nie musisz ponownie uruchamiać `bundle install` ani `npm install` przy każdym starcie.

## Struktura projektu

- `backend/` - API Sinatra + SQLite + Fake IoT CLI generator (`fake_iot.rb`)
  - Konta: `/api/register`, `/api/login`, `/api/logout`, `/api/me` (token w nagłówku `Authorization: Bearer <token>`)
  - Rośliny (wymagają logowania): `/api/plants`, `/api/plants/:id`, `/api/plants/:id/measurements`
  - Pomiary: `POST /api/measurements` (bez logowania, ESP32), `GET /api/measurements/latest`, `GET /api/measurements?plant_id=X&limit=Y` (wymagają logowania)
  - Trefle proxy (wymaga logowania): `/api/trefle/search?q=QUERY`, `/api/trefle/:id`, `/api/trefle/:id/recommendations`
- `frontend/` - React PWA (Vite + React Router + Chart.js)
