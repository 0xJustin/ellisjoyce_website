export interface BirdPhotoRecord {
  birdKey: string;
  src: string;
  alt: string;
  rating?: number;
  capturedOn?: string;
  country?: string;
  state?: string;
  county?: string;
  location?: string;
  trip?: string;
  notes?: string;
}

// Add records here after placing files under /public/assets/images/birds/.
// Example:
// {
//   birdKey: "norsho",
//   src: "/assets/images/birds/norsho/2025-02-14-01.jpg",
//   alt: "Northern Shoveler drake cruising through reeds",
//   rating: 4,
//   capturedOn: "2025-02-14",
//   country: "United States",
//   state: "Florida",
//   county: "Brevard",
//   location: "Merritt Island NWR, Florida",
//   trip: "Florida 2025",
// }
export const birdPhotoRecords: BirdPhotoRecord[] = [];
