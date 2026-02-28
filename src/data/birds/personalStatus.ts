export interface BirdPersonalStatus {
  seen: boolean;
  firstSeenDate?: string;
  lastSeenDate?: string;
  notes?: string;
}

// Key by eBird speciesCode when available; fallback key is ABA alphaCode.
// Example:
// "norsho": { seen: true, firstSeenDate: "2025-02-14", notes: "Florida marsh at sunrise" }
export const personalBirdStatus: Record<string, BirdPersonalStatus> = {};
