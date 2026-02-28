import birdCatalogRaw from "./birdCatalog.json";
import { birdPhotoRecords, type BirdPhotoRecord } from "./personalPhotos";
import { personalBirdStatus } from "./personalStatus";

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

export interface BirdInventoryEntry extends BirdCatalogSpecies {
  birdKey: string;
  seen: boolean;
  firstSeenDate?: string;
  lastSeenDate?: string;
  personalNotes?: string;
  photos: BirdPhotoRecord[];
  photoCount: number;
  hasPhoto: boolean;
  rarityBand: "common" | "rare";
}

export interface BirdInventoryData {
  metadata: BirdCatalogMetadata;
  species: BirdInventoryEntry[];
}

const birdCatalog = birdCatalogRaw as BirdCatalogFile;

export function getBirdInventoryData(): BirdInventoryData {
  const photosByKey = buildPhotoMap(birdPhotoRecords);

  const species = birdCatalog.species.map((row) => {
    const birdKey = row.speciesCode ?? row.alphaCode;
    const normalizedBirdKey = birdKey.toLowerCase();
    const status = personalBirdStatus[normalizedBirdKey] ?? personalBirdStatus[birdKey];
    const photos = photosByKey.get(normalizedBirdKey) ?? [];

    return {
      ...row,
      birdKey,
      seen: Boolean(status?.seen),
      firstSeenDate: status?.firstSeenDate,
      lastSeenDate: status?.lastSeenDate,
      personalNotes: status?.notes,
      photos,
      photoCount: photos.length,
      hasPhoto: photos.length > 0,
      rarityBand: row.abaCode <= 3 ? "common" : "rare",
    };
  });

  return {
    metadata: birdCatalog.metadata,
    species,
  };
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
