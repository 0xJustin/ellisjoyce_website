export interface BirdPhotoRecord {
  birdKey: string;
  src: string;
  alt: string;
  capturedOn?: string;
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
//   capturedOn: "2025-02-14",
//   location: "Merritt Island NWR, Florida",
//   trip: "Florida 2025",
// }
export const birdPhotoRecords: BirdPhotoRecord[] = [];
