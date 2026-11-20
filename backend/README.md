# Backend

## Wymagania

- Ruby 3.2+
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
| GET, POST | `/api/plants` | (auth) lista / dodanie rośliny |
| GET, PUT, DELETE | `/api/plants/:id` | (auth) roślina; PUT przyjmuje też `device_id` (string/null) i ustawienia podlewania; DELETE usuwa też jej pomiary i podlewania; cudza roślina → 404 |
| DELETE | `/api/plants/:id/measurements` | (auth) czyści pomiary rośliny |
| POST | `/api/plants/:id/water` | (auth) podlej teraz → 202; 409 gdy blokada, limit dobowy albo brak czujnika |
| POST | `/api/plants/:id/unblock` | (auth) zdejmuje blokadę podlewania |
| GET | `/api/plants/:id/waterings` | (auth) ostatnie 20 podlewań + `water_left_ml` |
| GET | `/api/plants/:id/stats?days=1\|7\|30` | (auth) statystyki: min/max/avg, % w progach, tempo wysychania, zestawienie dzienne, podlewania |
| POST | `/api/measurements` | pomiar z ESP32 (`device_id`) / Fake IoT (`plant_id`), bez logowania; odpowiedź zawiera `device` (config podlewania); niesparowane urządzenie / nieznana roślina → 404 |
| POST | `/api/waterings` | zdarzenie podlewania z ESP32 (`device_id`), bez logowania; `no_effect` blokuje roślinę |
| GET | `/api/measurements/latest?plant_id=1` | (auth) ostatni pomiar |
| GET | `/api/measurements?plant_id=1&limit=200` | (auth) historia (limit 1-500) |
| GET | `/api/trefle/search?q=QUERY` | (auth) wyszukiwarka Trefle |
| GET | `/api/trefle/:id` | (auth) szczegóły rośliny z Trefle |
| GET | `/api/trefle/:id/recommendations` | (auth) progi wyliczone z danych Trefle (`main_species.growth`) |

Statystyki dzienne (`daily`) liczone są dla dni w UTC. Limit wody: 200 ml na 24 h na roślinę (pompa 6 ml/s). Puste body albo niepoprawny JSON → 400.

Roślina demo z symulowanymi danymi z 7 dni: `bundle exec ruby seed_demo.rb <username>`.

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
