# Backend

## Wymagania

- Ruby 3.4+
- Bundler

## Instalacja

```bash
cd backend
bundle install
```

## Uruchomienie

```bash
bundle exec ruby app.rb
```

Serwer startuje na porcie `4567`. Baza danych: `backend/db.sqlite3`.

## Endpointy

### GET /health

```bash
curl http://localhost:4567/health
```

### POST /api/measurements

```bash
curl -X POST http://localhost:4567/api/measurements \
  -H "Content-Type: application/json" \
  -d '{"plant_id":1,"measured_at":"2026-01-20T12:00:00Z","soil_moisture":45,"air_temp_c":22.5,"air_humidity":55.2,"light_lux":1200}'
```

### GET /api/measurements/latest

```bash
curl "http://localhost:4567/api/measurements/latest?plant_id=1"
```

### GET /api/measurements

```bash
curl "http://localhost:4567/api/measurements?plant_id=1&limit=200"
```

## CORS

Frontend dev origin: `http://localhost:5173`
