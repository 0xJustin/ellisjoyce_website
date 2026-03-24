import birdCatalogRaw from "./birdCatalog.json";
import worldBirdCatalogRaw from "./worldBirdCatalog.json";
import { birdPhotoRecords, type BirdPhotoRecord } from "./personalPhotos";
import { personalBirdStatus } from "./personalStatus";
import { ebirdSeenStatus } from "./ebirdSeenStatus";

interface BirdCatalogMetadata {
  generatedAtUtc: string;
  abaSourceUrl: string;
  abaVersion: string | null;
  abaDate: string | null;
  ebirdSourceUrl: string;
  ebirdTaxonomyVersion: string | null;
  includeCodes: number[];
  speciesCount: number;
  unmatchedCount: number;
}

interface BirdCatalogSpecies {
  abaSort: number;
  abaCode: number;
  alphaCode: string;
  commonName: string;
  scientificName: string;
  abaFamilyGroup: string;
  taxonOrder: number;
  order: string;
  family: string;
  speciesCode: string | null;
  taxonConceptId: string | null;
  ebirdCommonName: string | null;
  matchedToEbird: boolean;
}

interface BirdCatalogFile {
  metadata: BirdCatalogMetadata;
  species: BirdCatalogSpecies[];
}

interface WorldBirdCatalogSpecies {
  taxonOrder: number;
  speciesCode: string;
  taxonConceptId: string | null;
  commonName: string;
  scientificName: string;
  order: string;
  family: string;
}

interface WorldBirdCatalogFile {
  metadata: {
    generatedAtUtc: string;
    sourcePath: string;
    speciesCount: number;
  };
  species: WorldBirdCatalogSpecies[];
}

export interface BirdInventoryEntry extends BirdCatalogSpecies {
  birdKey: string;
  seen: boolean;
  firstSeenDate?: string;
  lastSeenDate?: string;
  personalNotes?: string;
  photos: BirdPhotoRecord[];
  photoCount: number;
  hasPhoto: boolean;
  rarityBand: "common" | "rare" | "world";
  checklistScope: "aba" | "world";
}

export interface BirdInventoryData {
  metadata: BirdCatalogMetadata;
  species: BirdInventoryEntry[];
}

const birdCatalog = birdCatalogRaw as BirdCatalogFile;
const worldBirdCatalog = worldBirdCatalogRaw as WorldBirdCatalogFile;
const WORLD_FALLBACK_ABA_SORT_BASE = 9_000_000;

export function getBirdInventoryData(): BirdInventoryData {
  const photosByKey = buildPhotoMap(birdPhotoRecords);
  const mergedCatalogSpecies = buildMergedCatalogSpecies();

  const species = mergedCatalogSpecies.map((row) => {
    const birdKey = row.speciesCode ?? row.alphaCode;
    const normalizedBirdKey = birdKey.trim().toLowerCase();
    const manualStatus = personalBirdStatus[normalizedBirdKey] ?? personalBirdStatus[birdKey];
    const syncedSeenStatus = ebirdSeenStatus[normalizedBirdKey] ?? ebirdSeenStatus[birdKey];
    const seen = manualStatus?.seen ?? syncedSeenStatus?.seen ?? false;
    const photos = photosByKey.get(normalizedBirdKey) ?? [];
    const rarityBand = classifyRarityBand(row.abaCode);

    return {
      ...row,
      birdKey,
      seen: Boolean(seen),
      firstSeenDate: manualStatus?.firstSeenDate ?? syncedSeenStatus?.firstSeenDate,
      lastSeenDate: manualStatus?.lastSeenDate ?? syncedSeenStatus?.lastSeenDate,
      personalNotes: manualStatus?.notes ?? syncedSeenStatus?.notes,
      photos,
      photoCount: photos.length,
      hasPhoto: photos.length > 0,
      rarityBand,
      checklistScope: rarityBand === "world" ? ("world" as const) : ("aba" as const),
    };
  });

  return {
    metadata: {
      ...birdCatalog.metadata,
      speciesCount: species.length,
    },
    species,
  };
}

function buildMergedCatalogSpecies(): BirdCatalogSpecies[] {
  const abaRows = Array.isArray(birdCatalog.species) ? birdCatalog.species : [];
  const worldRows = Array.isArray(worldBirdCatalog.species) ? worldBirdCatalog.species : [];
  const abaBySpeciesCode = new Map<string, BirdCatalogSpecies>();
  const mergedRows: BirdCatalogSpecies[] = [];
  const seenCatalogKeys = new Set<string>();

  for (const abaRow of abaRows) {
    const speciesCodeKey = normalizeCatalogKey(abaRow.speciesCode);
    if (speciesCodeKey && !abaBySpeciesCode.has(speciesCodeKey)) {
      abaBySpeciesCode.set(speciesCodeKey, abaRow);
    }
  }

  worldRows.forEach((worldRow, index) => {
    const worldSpeciesCodeKey = normalizeCatalogKey(worldRow.speciesCode);
    const abaMatch = worldSpeciesCodeKey ? abaBySpeciesCode.get(worldSpeciesCodeKey) : null;
    const mergedRow = abaMatch || convertWorldRowToCatalogRow(worldRow, index);
    const uniqueKey = buildCatalogUniqueKey(mergedRow, index);
    if (seenCatalogKeys.has(uniqueKey)) {
      return;
    }
    seenCatalogKeys.add(uniqueKey);
    mergedRows.push(mergedRow);
  });

  abaRows.forEach((abaRow, index) => {
    const uniqueKey = buildCatalogUniqueKey(abaRow, worldRows.length + index);
    if (seenCatalogKeys.has(uniqueKey)) {
      return;
    }
    seenCatalogKeys.add(uniqueKey);
    mergedRows.push(abaRow);
  });

  mergedRows.sort((left, right) => {
    const taxonDiff = Number(left.taxonOrder || 0) - Number(right.taxonOrder || 0);
    if (taxonDiff !== 0) {
      return taxonDiff;
    }

    const abaDiff = Number(left.abaSort || 0) - Number(right.abaSort || 0);
    if (abaDiff !== 0) {
      return abaDiff;
    }

    return String(left.commonName || "").localeCompare(String(right.commonName || ""));
  });

  return mergedRows;
}

function convertWorldRowToCatalogRow(row: WorldBirdCatalogSpecies, index: number): BirdCatalogSpecies {
  const speciesCode = String(row.speciesCode || "").trim();
  return {
    abaSort: WORLD_FALLBACK_ABA_SORT_BASE + index,
    abaCode: 0,
    alphaCode: speciesCode.toUpperCase() || `WORLD${index + 1}`,
    commonName: String(row.commonName || "").trim() || speciesCode,
    scientificName: String(row.scientificName || "").trim(),
    abaFamilyGroup: String(row.family || "").trim() || "World Checklist",
    taxonOrder: Number(row.taxonOrder || 0) || WORLD_FALLBACK_ABA_SORT_BASE + index,
    order: String(row.order || "").trim() || "Unresolved",
    family: String(row.family || "").trim() || "Unresolved",
    speciesCode: speciesCode || null,
    taxonConceptId: row.taxonConceptId ? String(row.taxonConceptId).trim() : null,
    ebirdCommonName: String(row.commonName || "").trim() || null,
    matchedToEbird: true,
  };
}

function classifyRarityBand(abaCode: number): "common" | "rare" | "world" {
  if (abaCode >= 1 && abaCode <= 3) {
    return "common";
  }
  if (abaCode >= 4 && abaCode <= 5) {
    return "rare";
  }
  return "world";
}

function normalizeCatalogKey(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function buildCatalogUniqueKey(row: BirdCatalogSpecies, fallbackIndex: number): string {
  const speciesCode = normalizeCatalogKey(row.speciesCode);
  if (speciesCode) {
    return `species:${speciesCode}`;
  }

  const alphaCode = normalizeCatalogKey(row.alphaCode);
  if (alphaCode) {
    return `alpha:${alphaCode}`;
  }

  const scientificName = normalizeCatalogKey(row.scientificName);
  if (scientificName) {
    return `scientific:${scientificName}`;
  }

  return `fallback:${fallbackIndex}`;
}

function buildPhotoMap(photos: BirdPhotoRecord[]): Map<string, BirdPhotoRecord[]> {
  const map = new Map<string, BirdPhotoRecord[]>();

  for (const photo of photos) {
    const key = photo.birdKey.trim().toLowerCase();
    if (!key) {
      continue;
    }

    const existing = map.get(key);
    if (existing) {
      existing.push(photo);
    } else {
      map.set(key, [photo]);
    }
  }

  return map;
}
