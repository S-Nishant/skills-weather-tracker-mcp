# Open-Meteo API notes

## Geocoding

Endpoint: `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1`

For Pune, the response supplied the city name, country, and location coordinates. The app can use `name` for `city`, `country` for `country`, and `latitude` / `longitude` for the city's stored location.

Trimmed example:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

## Current weather

Endpoint: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

The current-weather response includes a `current` object and `current_units`. Store `temperature_2m` as `temperature_c`, `relative_humidity_2m` as `humidity`, `wind_speed_10m` as `wind_kmh`, and `weather_code` as `weather_code`. WMO code `0` means `Clear sky`, stored as `condition`. The current observation time is `current.time`; the table's `created_at` records when the row was inserted.

The forecast response's top-level `latitude` and `longitude` may differ slightly from the geocoding coordinates because the forecast service returns its resolved location. The Pune row stores the geocoding coordinates.

Trimmed example (forecast response provided for Pune):

```json
{
  "current_units": {
    "temperature_2m": "°C",
    "relative_humidity_2m": "%",
    "wind_speed_10m": "km/h",
    "weather_code": "wmo code"
  },
  "current": {
    "time": "2026-10-30T04:30",
    "temperature_2m": 27.7,
    "relative_humidity_2m": 54,
    "wind_speed_10m": 5.0,
    "weather_code": 0
  }
}
```
