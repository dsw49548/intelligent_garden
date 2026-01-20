Generator danych Fake IoT symulujący urządzenia IoT. Wysyła dane z czujników roślin do backendu API.

## Uruchomienie

Tryb dry (bez wysyłki, tylko wyświetlanie JSON):
```bash
MODE=dry ruby fake_iot/run.rb
```

Tryb send (wysyłka do backendu):
```bash
MODE=send BACKEND_URL=http://localhost:4567 INTERVAL_SECONDS=2 ruby fake_iot/run.rb
```

Scenariusze:
```bash
SCENARIO=drought MODE=dry ruby fake_iot/run.rb
SCENARIO=daynight MODE=dry ruby fake_iot/run.rb
SCENARIO=randomwalk MODE=dry SEED=123 ruby fake_iot/run.rb
```

## Zmienne środowiskowe

- `BACKEND_URL` - URL backendu (domyślnie: http://localhost:4567)
- `PLANT_ID` - ID rośliny (domyślnie: 1)
- `INTERVAL_SECONDS` - interwał między pomiarami w sekundach (domyślnie: 5)
- `MODE` - tryb pracy: `send` lub `dry` (domyślnie: send)
- `SCENARIO` - scenariusz: `stable`, `drought`, `daynight`, `randomwalk` (domyślnie: stable)
- `SEED` - seed dla scenariusza randomwalk (domyślnie: 123)
