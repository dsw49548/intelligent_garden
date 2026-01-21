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
```bash
cd backend
bundle exec ruby app.rb
```
Backend działa na `http://localhost:4567`

Test sanity:
```bash
curl http://localhost:4567/health
```
Oczekiwany wynik: `{"status":"ok"}`

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

### Sanity Flow

1. Uruchom backend: `cd backend && bundle exec ruby app.rb`
2. W nowym terminalu uruchom fake_iot: `cd backend && bundle exec ruby fake_iot.rb`
3. W fake_iot CLI wykonaj: `once` (lub `start` dla ciągłej wysyłki)
4. Uruchom frontend: `cd frontend && npm run dev -- --host`
5. Otwórz w przeglądarce: `http://localhost:5173`
6. Przejdź do zakładki "History" - powinny być widoczne pomiary

## Uruchomienie projektu (Backend / Frontend / Fake IoT)

### Instalacja zależności

**Backend:**
- `bundle install` - tylko po zmianie Gemfile/Gemfile.lock lub na świeżym klonie

**Frontend:**
- `npm install` - tylko po zmianie package-lock.json/package.json lub na świeżym klonie

### Kolejność uruchomienia

**1. Backend:**
```bash
cd backend
bundle exec ruby app.rb
```
Backend działa na: `http://localhost:4567`

**2. Frontend:**
```bash
cd frontend
npm run dev -- --host
```
Frontend działa na: `http://localhost:5173`

**3. Fake IoT (opcjonalnie):**
```bash
cd backend
bundle exec ruby fake_iot.rb
```
W CLI wykonaj komendy:
- `status` - sprawdź stan
- `once` - wyślij jeden pomiar
- `start` - rozpocznij ciągłą wysyłkę
- `stop` - zatrzymaj wysyłkę
- `help` - lista komend

### Scenariusz Android USB

Jeśli testujesz na urządzeniu Android przez USB:
- użyj `adb reverse tcp:5173 tcp:5173` dla frontendu
- użyj `adb reverse tcp:4567 tcp:4567` dla backendu

### Struktura projektu

- `backend/` - API Sinatra + SQLite + Fake IoT CLI generator (fake_iot.rb)
- `frontend/` - React PWA
