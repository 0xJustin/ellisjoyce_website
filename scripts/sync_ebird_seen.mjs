#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PROFILE_URL = "https://ebird.org/profile/NDYzNTMzOQ/world";
const DEFAULT_OUTPUT = "src/data/birds/ebirdSeenStatus.ts";
const DEFAULT_LOCATION_OUTPUT = "src/data/birds/ebirdSeenLocations.ts";
const DEFAULT_ABA_CATALOG = "src/data/birds/birdCatalog.json";
const DEFAULT_WORLD_CATALOG = "src/data/birds/worldBirdCatalog.json";
const COUNTRY_CODE_NAME_FALLBACK = {
  US: "United States",
  CA: "Canada",
};
const TERRITORY_COUNTRY_BY_SUBDIVISION = {
  "US-PR": "Puerto Rico",
  "US-VI": "U.S. Virgin Islands",
  "US-GU": "Guam",
  "US-AS": "American Samoa",
  "US-MP": "Northern Mariana Islands",
};
const TERRITORY_COUNTRY_BY_SUBDIVISION_NAME = {
  "puerto rico": "Puerto Rico",
  "us virgin islands": "U.S. Virgin Islands",
  "u s virgin islands": "U.S. Virgin Islands",
  "virgin islands": "U.S. Virgin Islands",
  guam: "Guam",
  "american samoa": "American Samoa",
  "northern mariana islands": "Northern Mariana Islands",
  "northern marianas": "Northern Mariana Islands",
};

const HELP_TEXT = `Usage:
  node scripts/sync_ebird_seen.mjs [options]

Options:
  --profile-url <url>   eBird profile URL to parse (default: ${DEFAULT_PROFILE_URL})
  --csv <path>          Local eBird CSV export path (preferred fallback when profile URL is login-gated)
  --csv-url <url>       eBird CSV export URL to fetch directly
  --cookie <cookie>     Cookie header for authenticated eBird CSV/profile fetches
  --output <path>       Output TS file path (default: ${DEFAULT_OUTPUT})
  --location-output <path>
                        Output TS location file path (default: ${DEFAULT_LOCATION_OUTPUT})
  --dry-run             Print summary only, do not write output
  --help                Show this help

Examples:
  node scripts/sync_ebird_seen.mjs --profile-url https://ebird.org/profile/NDYzNTMzOQ/world
  node scripts/sync_ebird_seen.mjs --csv ~/Downloads/ebird_lifelist.csv
  node scripts/sync_ebird_seen.mjs --csv-url 'https://ebird.org/ebird/MyEBird?cmd=list&rtype=custom&r=world&time=life&fmt=csv' --cookie 'EBIRD_SESSIONID=...'
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP_TEXT);
    return;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..");
  const abaCatalogPath = path.join(repoRoot, DEFAULT_ABA_CATALOG);
  const worldCatalogPath = path.join(repoRoot, DEFAULT_WORLD_CATALOG);
  const outputPath = path.resolve(repoRoot, args.output ?? DEFAULT_OUTPUT);
  const locationOutputPath = path.resolve(repoRoot, args.locationOutput ?? DEFAULT_LOCATION_OUTPUT);

  const abaCatalog = JSON.parse(await fs.readFile(abaCatalogPath, "utf8"));
  const worldCatalog = JSON.parse(await fs.readFile(worldCatalogPath, "utf8"));
  const abaCatalogSpecies = Array.isArray(abaCatalog?.species) ? abaCatalog.species : [];
  const worldCatalogSpecies = Array.isArray(worldCatalog?.species) ? worldCatalog.species : [];
  const catalogSpecies = mergeCatalogSpeciesForSeenSync(abaCatalogSpecies, worldCatalogSpecies);

  const sourceResult = await loadSeenRecords({
    profileUrl: args.profileUrl ?? DEFAULT_PROFILE_URL,
    csvPath: args.csv,
    csvUrl: args.csvUrl,
    cookie: args.cookie,
  });

  const matchResult = mapToCatalog(sourceResult.records, catalogSpecies);
  const output = buildOutputFile({
    generatedAtUtc: new Date().toISOString(),
    sourceDescription: sourceResult.sourceDescription,
    catalogSpecies,
    seenKeys: matchResult.seenKeys,
    firstSeenByKey: matchResult.firstSeenByKey,
    matchedCount: matchResult.matchedCount,
    totalCount: sourceResult.records.length,
    unmatchedExamples: matchResult.unmatchedExamples,
  });
  const locationOutput = buildLocationOutputFile({
    generatedAtUtc: new Date().toISOString(),
    sourceDescription: sourceResult.sourceDescription,
    catalogSpecies,
    seenLocationsByKey: matchResult.seenLocationsByKey,
  });

  const summaryLines = [
    `[sync_ebird_seen] Source: ${sourceResult.sourceDescription}`,
    `[sync_ebird_seen] Parsed rows/species: ${sourceResult.records.length}`,
    `[sync_ebird_seen] Matched catalog species: ${matchResult.matchedCount}`,
    `[sync_ebird_seen] Unmatched rows: ${sourceResult.records.length - matchResult.matchedCount}`,
    `[sync_ebird_seen] Seen species written: ${matchResult.seenKeys.size}`,
    `[sync_ebird_seen] Species with firstSeenDate: ${matchResult.firstSeenByKey.size}`,
    `[sync_ebird_seen] Species with county/state locations: ${matchResult.seenLocationsByKey.size}`,
  ];

  if (args.dryRun) {
    for (const line of summaryLines) {
      console.log(line);
    }
    if (matchResult.unmatchedExamples.length > 0) {
      console.log("[sync_ebird_seen] Unmatched examples:");
      for (const example of matchResult.unmatchedExamples) {
        console.log(`  - ${example}`);
      }
    }
    return;
  }

  await fs.writeFile(outputPath, output, "utf8");
  await fs.writeFile(locationOutputPath, locationOutput, "utf8");
  for (const line of summaryLines) {
    console.log(line);
  }
  console.log(`[sync_ebird_seen] Updated ${path.relative(repoRoot, outputPath)}`);
  console.log(`[sync_ebird_seen] Updated ${path.relative(repoRoot, locationOutputPath)}`);
}

async function loadSeenRecords({ profileUrl, csvPath, csvUrl, cookie }) {
  if (csvPath) {
    const resolved = path.resolve(csvPath);
    const csvText = await fs.readFile(resolved, "utf8");
    return {
      sourceDescription: `csv:${resolved}`,
      records: parseEbirdCsvRecords(csvText),
    };
  }

  if (csvUrl) {
    const csvText = await fetchText(csvUrl, cookie);
    if (looksLikeHtml(csvText)) {
      throw new Error(
        "CSV URL returned HTML (likely eBird login page). Re-run with --cookie or download CSV manually and use --csv.",
      );
    }
    return {
      sourceDescription: `csv-url:${csvUrl}`,
      records: parseEbirdCsvRecords(csvText),
    };
  }

  const profileText = await fetchText(profileUrl, cookie);
  if (isLikelyEbirdLoginPage(profileText)) {
    throw new Error(
      "Profile URL redirected to eBird login. eBird profile scraping is session-gated; use --csv with an exported life list, or --csv-url with --cookie.",
    );
  }

  const profileRecords = parseProfileSpeciesRecords(profileText);
  if (profileRecords.length > 0) {
    return {
      sourceDescription: `profile:${profileUrl}`,
      records: profileRecords,
    };
  }

  throw new Error(
    "Could not parse species codes from profile HTML. Use --csv with eBird life list export.",
  );
}

async function fetchText(url, cookie) {
  const headers = {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    accept: "text/html,application/json,text/plain,*/*",
  };

  if (cookie) {
    headers.cookie = cookie;
  }

  const response = await fetch(url, {
    headers,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

function parseEbirdCsvRecords(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((value) => normalizeHeader(value));
  const codeIndex = findHeaderIndex(headers, [
    "species code",
    "speciescode",
    "species id",
    "species",
  ]);
  const commonIndex = findHeaderIndex(headers, [
    "common name",
    "comname",
    "commonname",
  ]);
  const scientificIndex = findHeaderIndex(headers, [
    "scientific name",
    "sciname",
    "scientificname",
    "latin name",
    "sci name",
  ]);
  const dateIndex = findHeaderIndex(headers, [
    "date",
    "observation date",
    "obs date",
  ]);
  const countryIndex = findHeaderIndex(headers, [
    "country",
    "country code",
    "country name",
  ]);
  const stateIndex = findHeaderIndex(headers, [
    "state province",
    "state province code",
    "state province name",
    "state",
    "subnational1 code",
    "subnational1 name",
  ]);
  const countyIndex = findHeaderIndex(headers, [
    "county",
    "county name",
    "subnational2 name",
    "subnational2 code",
  ]);

  if (codeIndex === -1 && commonIndex === -1 && scientificIndex === -1) {
    throw new Error(
      "CSV is missing eBird species columns. Expected one of: Species Code, Common Name, or Scientific Name.",
    );
  }

  const records = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const speciesCode = valueAt(row, codeIndex);
    const commonName = valueAt(row, commonIndex);
    const scientificName = valueAt(row, scientificIndex);
    const observedOn = normalizeCsvDate(valueAt(row, dateIndex));
    const country = valueAt(row, countryIndex);
    const state = valueAt(row, stateIndex);
    const county = valueAt(row, countyIndex);

    if (!speciesCode && !commonName && !scientificName) {
      continue;
    }

    records.push({
      speciesCode: normalizeKey(speciesCode),
      commonName: commonName.trim(),
      scientificName: scientificName.trim(),
      observedOn,
      country: country.trim(),
      state: state.trim(),
      county: county.trim(),
    });
  }

  return records;
}

function parseProfileSpeciesRecords(html) {
  const speciesCodes = new Set();

  const plainRegex = /"speciesCode"\s*:\s*"([a-z0-9]+)"/gi;
  for (const match of html.matchAll(plainRegex)) {
    speciesCodes.add(normalizeKey(match[1]));
  }

  const escapedRegex = /\\"speciesCode\\"\s*:\s*\\"([a-z0-9]+)\\"/gi;
  for (const match of html.matchAll(escapedRegex)) {
    speciesCodes.add(normalizeKey(match[1]));
  }

  return Array.from(speciesCodes)
    .filter(Boolean)
    .map((speciesCode) => ({ speciesCode, commonName: "", scientificName: "" }));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  const hasMeaningfulTail = row.some((value) => value !== "");
  if (hasMeaningfulTail) {
    rows.push(row);
  }

  return rows;
}

function mapToCatalog(records, catalogSpecies) {
  const speciesByCode = new Map();
  const speciesByAlpha = new Map();
  const speciesByCommon = new Map();
  const speciesByScientific = new Map();

  for (const species of catalogSpecies) {
    const birdKey = normalizeKey(species.speciesCode ?? species.alphaCode);
    if (!birdKey) {
      continue;
    }

    if (species.speciesCode) {
      speciesByCode.set(normalizeKey(species.speciesCode), birdKey);
    }
    if (species.alphaCode) {
      speciesByAlpha.set(normalizeKey(species.alphaCode), birdKey);
    }

    addUniqueNameMapping(speciesByCommon, species.commonName, birdKey);
    addUniqueNameMapping(speciesByScientific, species.scientificName, birdKey);
  }

  const seenKeys = new Set();
  const firstSeenByKey = new Map();
  const seenLocationsByKey = new Map();
  let matchedCount = 0;
  const unmatchedExamples = [];

  for (const record of records) {
    let matchedKey = "";

    if (record.speciesCode) {
      matchedKey =
        speciesByCode.get(record.speciesCode) ??
        speciesByAlpha.get(record.speciesCode) ??
        "";
    }

    if (!matchedKey && record.commonName) {
      matchedKey = speciesByCommon.get(normalizeName(record.commonName)) ?? "";
    }

    if (!matchedKey && record.scientificName) {
      matchedKey =
        speciesByScientific.get(normalizeName(record.scientificName)) ?? "";
    }

    if (matchedKey) {
      matchedCount += 1;
      seenKeys.add(matchedKey);
      if (record.observedOn) {
        const existing = firstSeenByKey.get(matchedKey);
        if (!existing || record.observedOn < existing) {
          firstSeenByKey.set(matchedKey, record.observedOn);
        }
      }

      const normalizedLocation = normalizeSeenLocationRecord(record);
      if (normalizedLocation) {
        if (!seenLocationsByKey.has(matchedKey)) {
          seenLocationsByKey.set(matchedKey, new Map());
        }
        const locationMap = seenLocationsByKey.get(matchedKey);
        const locationKey = JSON.stringify({
          country: normalizedLocation.country,
          state: normalizedLocation.state,
          county: normalizedLocation.county,
        });
        const observedOn = record.observedOn || "";
        const existing = locationMap.get(locationKey);
        if (!existing) {
          locationMap.set(locationKey, {
            birdKey: matchedKey,
            country: normalizedLocation.country,
            state: normalizedLocation.state,
            county: normalizedLocation.county,
            observedOn,
          });
        } else if (observedOn && (!existing.observedOn || observedOn < existing.observedOn)) {
          existing.observedOn = observedOn;
        }
      }
    } else if (unmatchedExamples.length < 25) {
      unmatchedExamples.push(
        record.speciesCode ||
          record.commonName ||
          record.scientificName ||
          "(empty row)",
      );
    }
  }

  return {
    seenKeys,
    firstSeenByKey,
    seenLocationsByKey,
    matchedCount,
    unmatchedExamples,
  };
}

function addUniqueNameMapping(map, name, key) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return;
  }

  if (!map.has(normalized)) {
    map.set(normalized, key);
  }
}

function mergeCatalogSpeciesForSeenSync(abaSpecies, worldSpecies) {
  const merged = [];
  const seenKeys = new Set();
  const abaBySpeciesCode = new Map();

  for (const species of Array.isArray(abaSpecies) ? abaSpecies : []) {
    const speciesCodeKey = normalizeKey(species?.speciesCode || "");
    if (speciesCodeKey && !abaBySpeciesCode.has(speciesCodeKey)) {
      abaBySpeciesCode.set(speciesCodeKey, species);
    }
  }

  for (const species of Array.isArray(worldSpecies) ? worldSpecies : []) {
    const speciesCodeKey = normalizeKey(species?.speciesCode || "");
    const base = speciesCodeKey ? abaBySpeciesCode.get(speciesCodeKey) || species : species;
    const mergedSpecies = {
      ...base,
      speciesCode: species?.speciesCode ?? base?.speciesCode ?? null,
      commonName: species?.commonName ?? base?.commonName ?? "",
      scientificName: species?.scientificName ?? base?.scientificName ?? "",
      order: species?.order ?? base?.order ?? "",
      family: species?.family ?? base?.family ?? "",
    };

    const uniqueKey = catalogSpeciesUniqueKey(mergedSpecies);
    if (uniqueKey && !seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      merged.push(mergedSpecies);
    }
  }

  for (const species of Array.isArray(abaSpecies) ? abaSpecies : []) {
    const uniqueKey = catalogSpeciesUniqueKey(species);
    if (uniqueKey && !seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      merged.push(species);
    }
  }

  merged.sort((left, right) => {
    const leftOrder = Number(left?.taxonOrder ?? left?.abaSort ?? Number.MAX_SAFE_INTEGER);
    const rightOrder = Number(right?.taxonOrder ?? right?.abaSort ?? Number.MAX_SAFE_INTEGER);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return String(left?.commonName || "").localeCompare(String(right?.commonName || ""));
  });

  return merged;
}

function catalogSpeciesUniqueKey(species) {
  const speciesCode = normalizeKey(species?.speciesCode || "");
  if (speciesCode) {
    return `species:${speciesCode}`;
  }
  const alphaCode = normalizeKey(species?.alphaCode || "");
  if (alphaCode) {
    return `alpha:${alphaCode}`;
  }
  const scientific = normalizeName(species?.scientificName || "");
  if (scientific) {
    return `scientific:${scientific}`;
  }
  return "";
}

function buildOutputFile({
  generatedAtUtc,
  sourceDescription,
  catalogSpecies,
  seenKeys,
  firstSeenByKey,
  matchedCount,
  totalCount,
  unmatchedExamples,
}) {
  const orderedKeys = [];
  for (const species of catalogSpecies) {
    const key = normalizeKey(species.speciesCode ?? species.alphaCode);
    if (key && seenKeys.has(key)) {
      orderedKeys.push(key);
    }
  }

  const lines = [];
  lines.push('import type { BirdPersonalStatus } from "./personalStatus";');
  lines.push("");
  lines.push(`// Generated by scripts/sync_ebird_seen.mjs on ${generatedAtUtc}`);
  lines.push(`// Source: ${sourceDescription}`);
  lines.push(
    `// Matched ${matchedCount}/${totalCount} parsed rows against the local bird catalog.`,
  );
  if (unmatchedExamples.length > 0) {
    lines.push(
      `// Unmatched examples: ${unmatchedExamples.join(" | ")}`,
    );
  }
  lines.push(
    "export const ebirdSeenStatus: Record<string, BirdPersonalStatus> = {",
  );
  for (const key of orderedKeys) {
    const firstSeenDate = firstSeenByKey.get(key);
    if (firstSeenDate) {
      lines.push(
        `  "${key}": { seen: true, firstSeenDate: ${JSON.stringify(firstSeenDate)} },`,
      );
    } else {
      lines.push(`  "${key}": { seen: true },`);
    }
  }
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

function buildLocationOutputFile({
  generatedAtUtc,
  sourceDescription,
  catalogSpecies,
  seenLocationsByKey,
}) {
  const orderedEntries = [];
  for (const species of catalogSpecies) {
    const key = normalizeKey(species.speciesCode ?? species.alphaCode);
    if (!key || !seenLocationsByKey.has(key)) {
      continue;
    }

    const locationMap = seenLocationsByKey.get(key);
    const decoded = Array.from(locationMap.values())
      .sort((a, b) => {
        const countryCompare = String(a.country || "").localeCompare(String(b.country || ""));
        if (countryCompare !== 0) return countryCompare;
        const stateCompare = String(a.state || "").localeCompare(String(b.state || ""));
        if (stateCompare !== 0) return stateCompare;
        const countyCompare = String(a.county || "").localeCompare(String(b.county || ""));
        if (countyCompare !== 0) return countyCompare;
        return String(a.observedOn || "").localeCompare(String(b.observedOn || ""));
      });

    for (const location of decoded) {
      orderedEntries.push(location);
    }
  }

  const lines = [];
  lines.push("// Generated by scripts/sync_ebird_seen.mjs");
  lines.push(`// Generated at: ${generatedAtUtc}`);
  lines.push(`// Source: ${sourceDescription}`);
  lines.push("");
  lines.push("export interface BirdSeenLocationRecord {");
  lines.push("  birdKey: string;");
  lines.push("  country?: string;");
  lines.push("  state?: string;");
  lines.push("  county?: string;");
  lines.push("  observedOn?: string;");
  lines.push("}");
  lines.push("");
  lines.push("export const birdSeenLocationRecords: BirdSeenLocationRecord[] = [");

  for (const record of orderedEntries) {
    lines.push("  {");
    lines.push(`    birdKey: ${JSON.stringify(record.birdKey)},`);
    if (record.country) {
      lines.push(`    country: ${JSON.stringify(record.country)},`);
    }
    if (record.state) {
      lines.push(`    state: ${JSON.stringify(record.state)},`);
    }
    if (record.county) {
      lines.push(`    county: ${JSON.stringify(record.county)},`);
    }
    if (record.observedOn) {
      lines.push(`    observedOn: ${JSON.stringify(record.observedOn)},`);
    }
    lines.push("  },");
  }

  lines.push("];");
  lines.push("");
  return lines.join("\n");
}

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    const value = argv[i + 1];
    if (
      arg === "--profile-url" ||
      arg === "--csv" ||
      arg === "--csv-url" ||
      arg === "--cookie" ||
      arg === "--output" ||
      arg === "--location-output"
    ) {
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      if (arg === "--profile-url") args.profileUrl = value;
      if (arg === "--csv") args.csv = value;
      if (arg === "--csv-url") args.csvUrl = value;
      if (arg === "--cookie") args.cookie = value;
      if (arg === "--output") args.output = value;
      if (arg === "--location-output") args.locationOutput = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function valueAt(row, index) {
  if (typeof index !== "number" || index < 0 || index >= row.length) {
    return "";
  }
  return String(row[index] ?? "").trim();
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findHeaderIndex(headers, candidates) {
  for (const candidate of candidates) {
    const index = headers.indexOf(candidate);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeSeenLocationRecord(record) {
  const rawCountry = normalizeFreeText(record.country);
  const state = normalizeSubdivision(record.state);
  const county = normalizeCountyName(record.county);
  const territoryCountry = territoryCountryFromSubdivision(state);
  const inferredCountryCode = extractCountryCodeFromSubdivision(state);

  let country = rawCountry;
  if (country && /^[A-Za-z]{2}$/.test(country)) {
    const byCode = countryNameFromIsoCode(country.toUpperCase());
    if (byCode) {
      country = byCode;
    }
  }

  if (territoryCountry && (!country || country === "United States")) {
    country = territoryCountry;
  }

  if (!country && inferredCountryCode) {
    const byCode = countryNameFromIsoCode(inferredCountryCode);
    if (byCode) {
      country = byCode;
    }
  }

  if (!country && !state && !county) {
    return null;
  }

  return {
    country,
    state,
    county,
  };
}

function normalizeFreeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeSubdivision(value) {
  const raw = normalizeFreeText(value);
  if (!raw) {
    return "";
  }

  const match = raw.match(/^([A-Za-z]{2})[-\s]([A-Za-z]{2,3})$/);
  if (match) {
    return `${match[1].toUpperCase()}-${match[2].toUpperCase()}`;
  }
  return raw;
}

function extractCountryCodeFromSubdivision(value) {
  const match = String(value || "").trim().match(/^([A-Za-z]{2})-[A-Za-z0-9]{2,3}$/);
  return match ? match[1].toUpperCase() : "";
}

function territoryCountryFromSubdivision(value) {
  const token = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, "-");
  if (token && TERRITORY_COUNTRY_BY_SUBDIVISION[token]) {
    return TERRITORY_COUNTRY_BY_SUBDIVISION[token];
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalized) {
    return "";
  }

  return TERRITORY_COUNTRY_BY_SUBDIVISION_NAME[normalized] || "";
}

function countryNameFromIsoCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return "";
  }

  if (COUNTRY_CODE_NAME_FALLBACK[normalized]) {
    return COUNTRY_CODE_NAME_FALLBACK[normalized];
  }

  try {
    const formatter = new Intl.DisplayNames(["en"], { type: "region" });
    const name = formatter.of(normalized);
    if (name && name !== normalized) {
      COUNTRY_CODE_NAME_FALLBACK[normalized] = name;
      return name;
    }
  } catch (_error) {}

  return "";
}

function normalizeCountyName(value) {
  const raw = normalizeFreeText(value);
  if (!raw) {
    return "";
  }

  return raw
    .replace(/\b(county|parish|borough|municipality|census area|city and borough|city)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCsvDate(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const month = slash[1].padStart(2, "0");
    const day = slash[2].padStart(2, "0");
    return `${slash[3]}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const yyyy = String(parsed.getUTCFullYear());
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function looksLikeHtml(text) {
  return /<html|<!doctype/i.test(text);
}

function isLikelyEbirdLoginPage(text) {
  return /cassso\/login|input-user-name|forgot username/i.test(text);
}

main().catch((error) => {
  console.error(`[sync_ebird_seen] ${error.message}`);
  process.exitCode = 1;
});
