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

Serwer startuje na porcie `4567`. Baza danych: `backend/db.sqlite3` (inną można podać przez `DB_PATH=/sciezka/do/bazy.sqlite3`).

## Endpointy

Endpointy oznaczone (auth) wymagają nagłówka `Authorization: Bearer <token>`, inaczej zwracają 401.

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/health` | status serwera |
| POST | `/api/register` | `{username, password}` → `{token, user}`; 400 złe dane, 409 zajęta nazwa |
| POST | `/api/login` | `{username, password}` → `{token, user}`; 401 złe dane |
| POST | `/api/logout` | (auth) usuwa token |
| GET | `/api/me` | (auth) zalogowany użytkownik |
| GET, POST | `/api/plants` | (auth) lista / dodanie rośliny |
| GET, PUT, DELETE | `/api/plants/:id` | (auth) roślina; DELETE usuwa też jej pomiary; cudza roślina → 404 |
| DELETE | `/api/plants/:id/measurements` | (auth) czyści pomiary rośliny |
| POST | `/api/measurements` | pomiar z ESP32 / Fake IoT (bez logowania); nieznana roślina → 404 |
| GET | `/api/measurements/latest?plant_id=1` | (auth) ostatni pomiar |
| GET | `/api/measurements?plant_id=1&limit=200` | (auth) historia (limit 1-500) |
| GET | `/api/trefle/search?q=QUERY` | (auth) wyszukiwarka Trefle |
| GET | `/api/trefle/:id` | (auth) szczegóły rośliny z Trefle |
| GET | `/api/trefle/:id/recommendations` | (auth) progi wyliczone z danych Trefle (`main_species.growth`) |

## Przykłady

```bash
curl -X POST http://localhost:4567/api/register -H "Content-Type: application/json" \
  -d '{"username":"kacper","password":"secret123"}'

curl -X POST http://localhost:4567/api/measurements \
  -H "Content-Type: application/json" \
  -d '{"plant_id":1,"measured_at":"2026-01-20T12:00:00Z","soil_moisture":45,"air_temp_c":22.5,"air_humidity":55.2,"light_lux":1200}'

curl "http://localhost:4567/api/measurements/latest?plant_id=1" -H "Authorization: Bearer <token>"
```

## CORS

Frontend origins: `http://localhost:5173`, `http://localhost:4173` (oraz `127.0.0.1`).
