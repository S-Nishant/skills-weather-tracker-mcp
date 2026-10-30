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
