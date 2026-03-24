export interface PhotographyTrip {
  slug: string;
  title: string;
  year: string;
  legacyPath: string;
  coverImage: string;
  highlights: string[];
  showOnPhotographyPage?: boolean;
  showInBasePage?: boolean;
  showInCarousel?: boolean;
}

// Add or edit trips here to update /photography.
export const photographyTrips: PhotographyTrip[] = [
  {
    slug: "peru-birds",
    title: "Peru Birds",
    year: "2024",
    legacyPath: "/photography/peru",
    coverImage: "/assets/images/photography/peru-01.jpg",
    showOnPhotographyPage: true,
    showInBasePage: true,
    showInCarousel: true,
    highlights: [
      "/assets/images/photography/peru-01.jpg",
      "/assets/images/photography/peru-02.jpg",
    ],
  },
  {
    slug: "mid-atlantic-2024",
    title: "Mid-Atlantic 2024",
    year: "2024",
    legacyPath: "/photography/md2024",
    coverImage: "/assets/images/photography/midatlantic-01.jpg",
    showOnPhotographyPage: true,
    showInBasePage: true,
    showInCarousel: true,
    highlights: [
      "/assets/images/photography/midatlantic-01.jpg",
      "/assets/images/photography/midatlantic-02.jpg",
    ],
  },
  {
    slug: "florida-2025",
    title: "Florida 2025",
    year: "2025",
    legacyPath: "/photography/florida-2025",
    coverImage: "/assets/images/photography/florida-01.jpg",
    showOnPhotographyPage: true,
    showInBasePage: true,
    showInCarousel: true,
    highlights: [
      "/assets/images/photography/florida-01.jpg",
      "/assets/images/photography/florida-02.jpg",
    ],
  },
];
