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

**3. Fake IoT Generator**
```bash
cd fake_iot
MODE=send BACKEND_URL=http://localhost:4567 PLANT_ID=1 INTERVAL_SECONDS=2 ruby run.rb
```

Parametry:
- `MODE=send` - wysyłka do backendu (lub `dry` dla testów bez wysyłki)
- `BACKEND_URL` - URL backendu (domyślnie: `http://localhost:4567`)
- `PLANT_ID` - ID rośliny (domyślnie: `1`)
- `INTERVAL_SECONDS` - interwał między pomiarami w sekundach (domyślnie: `5`)
- `SCENARIO` - scenariusz: `stable`, `drought`, `daynight`, `randomwalk` (domyślnie: `stable`)

### Sanity Flow

1. Uruchom backend: `cd backend && bundle exec ruby app.rb`
2. W nowym terminalu uruchom fake_iot: `cd fake_iot && MODE=send BACKEND_URL=http://localhost:4567 PLANT_ID=1 INTERVAL_SECONDS=2 ruby run.rb`
3. Poczekaj kilka sekund, aby wygenerować dane
4. Uruchom frontend: `cd frontend && npm run dev -- --host`
5. Otwórz w przeglądarce: `http://localhost:5173`
6. Przejdź do zakładki "History" - powinny być widoczne pomiary

### Struktura projektu

- `backend/` - API Sinatra + SQLite
- `frontend/` - React PWA
- `fake_iot/` - Generator danych IoT
