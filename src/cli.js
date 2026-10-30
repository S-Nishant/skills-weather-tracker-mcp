import { addWeatherLog, getCityStats, listWeatherLogs } from "./db.js";
import { fetchCurrentWeather } from "./weather.js";

const DEFAULT_LIMIT = 10;

// Print the CLI usage instructions.
function printUsage() {
  console.log(`Usage:
  node src/cli.js add "<city>"
  node src/cli.js list [--limit N]
  node src/cli.js stats "<city>"`);
}

// Format table rows with columns sized to their contents.
function printTable(headers, rows) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length))
  );
  const formatRow = (row) =>
    `| ${row.map((cell, index) => String(cell).padEnd(widths[index])).join(" | ")} |`;
  const divider = `+-${widths.map((width) => "-".repeat(width)).join("-+-")}-+`;

  console.log(divider);
  console.log(formatRow(headers));
  console.log(divider);
  for (const row of rows) console.log(formatRow(row));
  console.log(divider);
}

// Add a city's current weather to the database.
async function addCity(city) {
  const weather = await fetchCurrentWeather(city);
  const id = addWeatherLog(weather);
  console.log(
    `Added weather log #${id} for ${weather.city}, ${weather.country}: ` +
    `${weather.temperatureC} °C, ${weather.condition}.`
  );
}

// Parse list options and display recent weather logs.
function listLogs(args) {
  let limit = DEFAULT_LIMIT;
  if (args.length > 0) {
    if (args.length !== 2 || args[0] !== "--limit") {
      throw new Error("Use list [--limit N], where N is a positive integer.");
    }
    limit = Number(args[1]);
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error("The list limit must be a positive integer.");
    }
  }

  const logs = listWeatherLogs(limit);
  if (logs.length === 0) {
    console.log("No weather logs found.");
    return;
  }

  const rows = logs.map((log) => [
    log.id,
    log.city,
    log.country ?? "",
    log.temperature_c.toFixed(1),
    log.humidity,
    log.wind_kmh.toFixed(1),
    log.condition,
    log.created_at
  ]);
  printTable(
    ["ID", "City", "Country", "Temp °C", "Humidity %", "Wind km/h", "Condition", "Created at"],
    rows
  );
}

// Display temperature statistics for a city's logged observations.
function showStats(city) {
  const stats = getCityStats(city);
  if (stats.count === 0) {
    console.log(`No weather logs found for ${city}.`);
    return;
  }

  console.log(`Weather statistics for ${city}:`);
  console.log(`  Logs: ${stats.count}`);
  console.log(`  Minimum: ${stats.minimum.toFixed(1)} °C`);
  console.log(`  Maximum: ${stats.maximum.toFixed(1)} °C`);
  console.log(`  Average: ${stats.average.toFixed(1)} °C`);
}

// Dispatch a CLI command and validate its arguments.
async function main(args) {
  const [command, ...commandArgs] = args;

  if (command === "add" && commandArgs.length === 1 && commandArgs[0].trim()) {
    await addCity(commandArgs[0].trim());
    return;
  }
  if (command === "list") {
    listLogs(commandArgs);
    return;
  }
  if (command === "stats" && commandArgs.length === 1 && commandArgs[0].trim()) {
    showStats(commandArgs[0].trim());
    return;
  }
  if (command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  printUsage();
  throw new Error("Invalid command or arguments.");
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
