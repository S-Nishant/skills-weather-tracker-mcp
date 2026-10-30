import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  addWeatherLog,
  getCitySummaries,
  listWeatherLogs
} from "./db.js";
import { fetchCurrentWeather } from "./weather.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";
const PAGE_PATH = new URL("../public/index.html", import.meta.url);

// Send a JSON response with a consistent content type.
function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

// Serve the dashboard HTML document.
async function serveDashboard(response) {
  try {
    const page = await readFile(fileURLToPath(PAGE_PATH));
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(page);
  } catch (error) {
    console.error(`Could not read dashboard: ${error.message}`);
    sendJson(response, 500, { error: "The dashboard could not be loaded." });
  }
}

// Handle refresh requests while returning friendly client and API errors.
async function refreshCity(url, response) {
  const city = url.searchParams.get("city")?.trim();
  if (!city) {
    sendJson(response, 400, { error: "Provide a city in the city query parameter." });
    return;
  }
  if (city.length > 100) {
    sendJson(response, 400, { error: "City names must be 100 characters or fewer." });
    return;
  }

  let weather;
  try {
    weather = await fetchCurrentWeather(city);
  } catch (error) {
    const isUnknownCity = error.message.startsWith("Could not find a city named");
    const statusCode = isUnknownCity ? 404 : 502;
    sendJson(response, statusCode, { error: error.message });
    return;
  }

  try {
    const id = addWeatherLog(weather);
    sendJson(response, 201, { id, weather });
  } catch (error) {
    console.error(`Could not save refreshed weather: ${error.message}`);
    sendJson(response, 500, { error: "Weather was fetched but could not be saved." });
  }
}

// Route dashboard and JSON API requests.
async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    await serveDashboard(response);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/logs") {
    sendJson(response, 200, { logs: listWeatherLogs(50) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/summary") {
    sendJson(response, 200, { summaries: getCitySummaries() });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/refresh") {
    await refreshCity(url, response);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "API endpoint not found." });
    return;
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    response.writeHead(405, { Allow: "GET" });
    response.end("Method not allowed.");
    return;
  }

  sendJson(response, 404, { error: "Page not found." });
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(`Request failed: ${error.message}`);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "The request could not be completed." });
    } else {
      response.destroy();
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Weather dashboard available at http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  console.error(`Could not start weather dashboard: ${error.message}`);
  process.exitCode = 1;
});
