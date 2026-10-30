import Database from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const databasePath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "weather.db");
const database = new Database(databasePath);

// Insert a weather observation and return its generated id.
export function addWeatherLog(weather) {
  const statement = database.prepare(`
    INSERT INTO weather_logs (
      city, country, latitude, longitude, temperature_c,
      humidity, wind_kmh, condition, weather_code
    ) VALUES (
      @city, @country, @latitude, @longitude, @temperatureC,
      @humidity, @windKmh, @condition, @weatherCode
    )
  `);
  const result = statement.run(weather);
  return Number(result.lastInsertRowid);
}

// Return the most recently recorded observations.
export function listWeatherLogs(limit) {
  return database.prepare(`
    SELECT id, city, country, temperature_c, humidity, wind_kmh,
      condition, weather_code, created_at
    FROM weather_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

// Return the latest observation and temperature average and count for each city.
export function getCitySummaries() {
  return database.prepare(`
    WITH ranked_logs AS (
      SELECT city, country, temperature_c,
        AVG(temperature_c) OVER (PARTITION BY city COLLATE NOCASE) AS average_temperature_c,
        COUNT(*) OVER (PARTITION BY city COLLATE NOCASE) AS log_count,
        ROW_NUMBER() OVER (
          PARTITION BY city COLLATE NOCASE
          ORDER BY created_at DESC, id DESC
        ) AS row_number
      FROM weather_logs
    )
    SELECT city, country, temperature_c AS latest_temperature_c,
      average_temperature_c, log_count
    FROM ranked_logs
    WHERE row_number = 1
    ORDER BY city COLLATE NOCASE
  `).all();
}

// Aggregate temperature and log count for a city, ignoring letter case.
export function getCityStats(city) {
  return database.prepare(`
    SELECT MIN(temperature_c) AS minimum,
      MAX(temperature_c) AS maximum,
      AVG(temperature_c) AS average,
      COUNT(*) AS count
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
  `).get(city);
}
