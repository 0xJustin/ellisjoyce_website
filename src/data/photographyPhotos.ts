export interface PhotographyPhotoRecord {
  id: string;
  tripSlug: string;
  src: string;
  alt: string;
  rating: number;
  isFavorite?: boolean;
  capturedOn?: string;
  location?: string;
  subject?: string;
  tags?: string[];
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  camera?: string;
  lens?: string;
}

// Trip-linked photo catalog for /photography.
// This schema is the foundation for a future trip admin uploader.
export const photographyPhotoRecords: PhotographyPhotoRecord[] = [
  {
    id: "peru-01",
    tripSlug: "peru-birds",
    src: "/assets/images/photography/peru-01.jpg",
    alt: "Bird portrait from Peru",
    rating: 5,
    isFavorite: true,
    capturedOn: "2024-05-18",
    location: "Peru",
    subject: "Peru field portrait",
    tags: ["bird"],
  },
  {
    id: "peru-02",
    tripSlug: "peru-birds",
    src: "/assets/images/photography/peru-02.jpg",
    alt: "Peru rainforest perch",
    rating: 4,
    capturedOn: "2024-05-20",
    location: "Peru",
    subject: "Rainforest detail",
    tags: ["bird"],
  },
  {
    id: "midatlantic-01",
    tripSlug: "mid-atlantic-2024",
    src: "/assets/images/photography/midatlantic-01.jpg",
    alt: "Mid-Atlantic migration portrait",
    rating: 4,
    capturedOn: "2024-09-11",
    location: "Mid-Atlantic, USA",
    subject: "Migration portrait",
    tags: ["bird", "east-coast"],
  },
  {
    id: "midatlantic-02",
    tripSlug: "mid-atlantic-2024",
    src: "/assets/images/photography/midatlantic-02.jpg",
    alt: "Morning bird frame from the Mid-Atlantic",
    rating: 3,
    capturedOn: "2024-09-14",
    location: "Mid-Atlantic, USA",
    subject: "Morning field frame",
    tags: ["bird", "east-coast"],
  },
  {
    id: "florida-01",
    tripSlug: "florida-2025",
    src: "/assets/images/photography/florida-01.jpg",
    alt: "Wading bird portrait from Florida",
    rating: 5,
    isFavorite: true,
    capturedOn: "2025-01-22",
    location: "Florida, USA",
    subject: "Florida coastal portrait",
    tags: ["bird"],
  },
  {
    id: "florida-02",
    tripSlug: "florida-2025",
    src: "/assets/images/photography/florida-02.jpg",
    alt: "Wetland bird frame from Florida",
    rating: 4,
    capturedOn: "2025-01-25",
    location: "Florida, USA",
    subject: "Wetland frame",
    tags: ["bird"],
  },
];
