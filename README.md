Intelligent Garden to projekt systemu monitorowania roślin z wykorzystaniem czujników IoT. Projekt składa się z generatora danych Fake IoT oraz backendu API w Ruby z frameworkiem Sinatra, który przechowuje dane z czujników roślin w bazie SQLite.

## Quick Start (Local)

### Wymagania
- Ruby (z bundlerem)
- Node.js i npm

### Instalacja zależności

**Backend** (tylko 1x lub gdy zmienione zależności):
```bash
cd backend
bundle install
```

**Frontend** (tylko 1x lub gdy zmienione zależności):
```bash
cd frontend
npm install
```

### Uruchomienie

**1. Backend**

**Konfiguracja Trefle (opcjonalnie, dla danych roślin):**
```bash
cd backend
# Utwórz plik .env i dodaj token Trefle:
echo "TREFLE_TOKEN=your_token_here" > .env
```

**Uruchomienie:**
```bash
cd backend
bundle exec ruby app.rb
```
Backend działa na `http://localhost:4567`

**Test sanity:**
```bash
curl http://localhost:4567/health
```
Oczekiwany wynik: `{"status":"ok"}`

**Test Trefle proxy (jeśli token ustawiony):**
```bash
curl "http://localhost:4567/api/plants/search?q=mon"
curl "http://localhost:4567/api/plants/59042"
curl "http://localhost:4567/api/plants/ping"
```

**2. Frontend**
```bash
cd frontend
npm run dev -- --host
```
Frontend działa na `http://localhost:5173`

Test sanity:
```bash
curl -I http://localhost:5173
```
Oczekiwany wynik: `HTTP/1.1 200 OK`

**3. Fake IoT Generator (CLI)**
```bash
cd backend
bundle exec ruby fake_iot.rb
```

Po uruchomieniu dostępne komendy:
- `help` - lista komend
- `status` - aktualny stan
- `once` - wyślij jeden pomiar dla wszystkich plant_id
- `start` - rozpocznij ciągłą wysyłkę
- `stop` - zatrzymaj wysyłkę
- `mode <NAME>` - ustaw tryb (stable, daynight, dryout, randomwalk)
- `interval <SECONDS>` - ustaw interwał (0.2-3600)
- `add <PLANT_ID>` - dodaj plant_id
- `set <ID1,ID2,...>` - ustaw listę plant_id
- `quit` - wyjście

### Sanity Flow (Demo)

1. **Uruchom backend:**
   ```bash
   cd backend
   bundle exec ruby app.rb
   ```
   Backend działa na `http://localhost:4567`

2. **W nowym terminalu uruchom Fake IoT:**
   ```bash
   cd backend
   bundle exec ruby fake_iot.rb
   ```
   W CLI wykonaj:
   - `set 1` - ustaw plant_id=1
   - `once` - wyślij jeden pomiar (lub `start` dla ciągłej wysyłki)

3. **Uruchom frontend:**
   ```bash
   cd frontend
   npm run dev -- --host
   ```
   Frontend działa na `http://localhost:5173`

4. **Otwórz w przeglądarce:**
   - Wejdź na `http://localhost:5173`
   - Kliknij kafelek "+ Add plant" i dodaj roślinę
   - Kliknij na roślinę, aby zobaczyć szczegóły i wykresy
   - Wykresy i historia pojawią się po wysłaniu pomiarów przez Fake IoT

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
  - Endpointy API: `/health`, `/api/measurements`, `/api/measurements/latest`, `/api/measurements?plant_id=X&limit=Y`
  - Endpointy Trefle proxy: `/api/plants/search?q=QUERY`, `/api/plants/:id`, `/api/plants/ping`
- `frontend/` - React PWA (Vite + React Router + Chart.js)

## Scenariusz Android USB

Jeśli testujesz na urządzeniu Android przez USB:
- użyj `adb reverse tcp:5173 tcp:5173` dla frontendu
- użyj `adb reverse tcp:4567 tcp:4567` dla backendu
