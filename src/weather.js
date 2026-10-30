const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Return a readable condition for an Open-Meteo WMO weather code.
export function conditionForCode(code) {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([56, 57].includes(code)) return "Freezing drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing rain";
  if ([71, 73, 75].includes(code)) return "Snow";
  if (code === 77) return "Snow grains";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";
  return `Unknown (code ${code})`;
}

// Fetch JSON from an Open-Meteo endpoint and report network or HTTP errors clearly.
async function fetchJson(url, endpointName) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(`Could not reach the ${endpointName}. Check your network connection.`);
  }

  if (!response.ok) {
    throw new Error(`${endpointName} returned HTTP ${response.status}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${endpointName} returned an invalid JSON response.`);
  }
}

// Fetch current conditions and location details for a city.
export async function fetchCurrentWeather(city) {
  const geocodingUrl = new URL(GEOCODING_URL);
  geocodingUrl.search = new URLSearchParams({ name: city, count: "1" });
  const geocoding = await fetchJson(geocodingUrl, "Open-Meteo geocoding");
  const location = geocoding.results?.[0];

  if (!location) {
    throw new Error(`Could not find a city named "${city}". Check the spelling and try again.`);
  }
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    throw new Error("Open-Meteo returned incomplete location coordinates.");
  }

  const forecastUrl = new URL(FORECAST_URL);
  forecastUrl.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
  });
  const forecast = await fetchJson(forecastUrl, "Open-Meteo current weather");
  const current = forecast.current;

  if (
    !current ||
    !Number.isFinite(current.temperature_2m) ||
    !Number.isFinite(current.relative_humidity_2m) ||
    !Number.isFinite(current.wind_speed_10m) ||
    !Number.isInteger(current.weather_code)
  ) {
    throw new Error("Open-Meteo returned incomplete current weather data.");
  }

  return {
    city: location.name,
    country: location.country ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    temperatureC: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windKmh: current.wind_speed_10m,
    condition: conditionForCode(current.weather_code),
    weatherCode: current.weather_code
  };
}
