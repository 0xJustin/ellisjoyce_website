(() => {
  const root = document.querySelector("[data-photo-gallery-root]");
  const seedNode = document.querySelector("#photo-gallery-seed");
  if (!(root instanceof HTMLElement) || !(seedNode instanceof HTMLScriptElement)) {
    return;
  }

  const favoritesGrid = root.querySelector("[data-photo-gallery-favorites-grid]");
  const tripCarouselTrack = root.querySelector("[data-photo-gallery-trip-carousel-track]");
  const tripStreamList = root.querySelector("[data-photo-gallery-trip-stream]");
  if (
    !(favoritesGrid instanceof HTMLElement) ||
    !(tripCarouselTrack instanceof HTMLElement) ||
    !(tripStreamList instanceof HTMLElement)
  ) {
    return;
  }

  const STORAGE_KEY = "ellisJoycePhotoAdminDraftV1";
  const REMOTE_COLLECTION = "birdAtlas";
  const REMOTE_DOCUMENT = "publicData";
  const REMOTE_FIELD = "photographyGallery";

  let parsedSeed = {};
  try {
    parsedSeed = JSON.parse(seedNode.textContent || "{}");
  } catch (_error) {
    parsedSeed = {};
  }

  const seedDraft = sanitizeDraft(parsedSeed);
  const seedTripSlugSet = new Set(seedDraft.trips.map((trip) => trip.slug));
  let remoteDraftCache = null;
  let localDraft = loadLocalDraft();
  let activeDraft = localDraft ? mergeDrafts(seedDraft, localDraft, { mode: "override" }) : seedDraft;

  window.addEventListener("resize", () => {
    syncTripCarouselViewport();
  });

  render(activeDraft);

  loadRemoteDraft().then((remoteDraft) => {
    if (!remoteDraft) {
      return;
    }

    remoteDraftCache = remoteDraft;
    localDraft = loadLocalDraft();
    const seeded = mergeDrafts(seedDraft, remoteDraft, { mode: "override" });
    const merged = localDraft ? mergeDrafts(seeded, localDraft, { mode: "override" }) : seeded;
    if (isSameDraft(activeDraft, merged)) {
      return;
    }

    activeDraft = merged;
    render(activeDraft);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    localDraft = loadLocalDraft();
    const seeded = remoteDraftCache ? mergeDrafts(seedDraft, remoteDraftCache, { mode: "override" }) : seedDraft;
    const merged = localDraft ? mergeDrafts(seeded, localDraft, { mode: "override" }) : seeded;
    if (isSameDraft(activeDraft, merged)) {
      return;
    }
    activeDraft = merged;
    render(activeDraft);
  });

  function render(draft) {
    const sortedTrips = sortTrips(draft.trips);
    const baseTrips = sortedTrips.filter((trip) => trip.showInBasePage !== false);
    const carouselTrips = sortedTrips.filter((trip) => trip.showInCarousel !== false);
    const activeTripSlugSet = new Set([
      ...baseTrips.map((trip) => trip.slug),
      ...carouselTrips.map((trip) => trip.slug),
    ]);
    const activeTrips = sortedTrips.filter((trip) => activeTripSlugSet.has(trip.slug));

    const sortedPhotos = [...draft.photos]
      .filter((photo) => activeTripSlugSet.has(photo.tripSlug))
      .sort(comparePhotosByDate);

    const photosByTrip = new Map();
    sortedPhotos.forEach((photo) => {
      if (!photosByTrip.has(photo.tripSlug)) {
        photosByTrip.set(photo.tripSlug, []);
      }
      photosByTrip.get(photo.tripSlug).push(photo);
    });

    const favorites = sortedPhotos.filter((photo) => isFavoritePhoto(photo));
    const spotlightPhotos = [...favorites].sort(comparePhotosByRating).slice(0, 24);

    renderFavorites(spotlightPhotos, activeTrips);
    renderTripStreams(baseTrips, photosByTrip);
    renderTripCards(carouselTrips, photosByTrip, sortedPhotos);
    syncTripCarouselViewport();
  }

  function renderFavorites(photos, trips) {
    favoritesGrid.textContent = "";
    if (!photos.length) {
      favoritesGrid.appendChild(buildEmptyState("No favorite photos yet."));
      return;
    }

    const tripBySlug = new Map(trips.map((trip) => [trip.slug, trip]));
    photos.forEach((photo) => {
      const trip = tripBySlug.get(photo.tripSlug);
      const tripTitle = trip?.title || toTitleCase(String(photo.tripSlug || "Trip").replace(/-/g, " "));
      const figure = document.createElement("figure");
      figure.className = "favorites-photo-card";

      const anchor = document.createElement("a");
      anchor.href = photo.src;
      setPhotoModalData(anchor, photo, {
        title: tripTitle,
        caption: [photo.subject || "", photo.location || "", photo.capturedOn || ""].filter(Boolean).join(" • "),
      });

      const image = document.createElement("img");
      image.src = photo.src;
      image.alt = photo.alt || `${tripTitle} photograph`;
      image.loading = "lazy";
      image.decoding = "async";

      const caption = document.createElement("figcaption");
      const title = document.createElement("strong");
      title.textContent = tripTitle;
      const meta = document.createElement("span");
      meta.textContent = [photoRatingLabel(photo), photo.capturedOn || "", photo.location || ""]
        .filter(Boolean)
        .join(" • ");

      caption.appendChild(title);
      caption.appendChild(meta);
      anchor.appendChild(image);
      figure.appendChild(anchor);
      figure.appendChild(caption);
      favoritesGrid.appendChild(figure);
    });
  }

  function renderTripCards(trips, photosByTrip, allPhotos) {
    tripCarouselTrack.textContent = "";
    if (!trips.length) {
      tripCarouselTrack.appendChild(buildEmptyState("No trips are available yet."));
      return;
    }

    trips.forEach((trip) => {
      const tripPhotos = photosByTrip.get(trip.slug) || [];
      const highlights = resolveTripHighlights(trip, tripPhotos);
      const coverImage = normalizePhotoSrc(trip.coverImage) || highlights[0] || allPhotos[0]?.src || "";
      if (!coverImage) {
        return;
      }

      const card = document.createElement("article");
      card.className = "trip-card";
      card.dataset.tripSlug = trip.slug;

      const coverLink = document.createElement("a");
      coverLink.className = "trip-cover";
      coverLink.href = tripLinkFor(trip);

      const cover = document.createElement("img");
      cover.src = coverImage;
      cover.alt = `${trip.title} cover`;
      cover.loading = "lazy";
      cover.decoding = "async";

      const overlay = document.createElement("div");
      overlay.className = "trip-cover-overlay";
      const year = document.createElement("p");
      year.textContent = trip.year || "";
      const title = document.createElement("h2");
      title.textContent = trip.title;
      overlay.appendChild(year);
      overlay.appendChild(title);

      coverLink.appendChild(cover);
      coverLink.appendChild(overlay);
      card.appendChild(coverLink);

      const highlightGrid = document.createElement("div");
      highlightGrid.className = "trip-highlight-grid";
      highlights.forEach((source) => {
        const thumb = document.createElement("img");
        thumb.src = source;
        thumb.alt = `${trip.title} highlight`;
        thumb.loading = "lazy";
        thumb.decoding = "async";
        highlightGrid.appendChild(thumb);
      });
      card.appendChild(highlightGrid);

      const tripLink = document.createElement("a");
      tripLink.className = "trip-link";
      tripLink.href = tripLinkFor(trip);
      tripLink.textContent = "Open full trip gallery";
      card.appendChild(tripLink);

      tripCarouselTrack.appendChild(card);
    });
  }

  function renderTripStreams(trips, photosByTrip) {
    tripStreamList.textContent = "";
    let renderedCount = 0;

    trips.forEach((trip) => {
      const tripPhotos = photosByTrip.get(trip.slug) || [];
      const topTripPhotos = [...tripPhotos].sort(comparePhotosByRating).slice(0, 10);
      if (!topTripPhotos.length) {
        return;
      }
      renderedCount += 1;

      const article = document.createElement("article");
      article.className = "trip-stream-card";
      article.dataset.tripSlug = trip.slug;

      const header = document.createElement("header");
      header.className = "trip-stream-head";

      const headerCopy = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = trip.title;
      headerCopy.appendChild(heading);

      const tripLink = document.createElement("a");
      tripLink.className = "trip-link";
      tripLink.href = tripLinkFor(trip);
      tripLink.textContent = "Open full trip gallery";

      header.appendChild(headerCopy);
      header.appendChild(tripLink);
      article.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "trip-stream-grid";
      topTripPhotos.forEach((photo) => {
        const figure = document.createElement("figure");
        figure.className = "trip-photo-card";

        const anchor = document.createElement("a");
        anchor.href = photo.src;
        setPhotoModalData(anchor, photo, {
          title: trip.title,
          caption: [photo.subject || "", photo.location || "", photo.capturedOn || ""].filter(Boolean).join(" • "),
        });

        const image = document.createElement("img");
        image.src = photo.src;
        image.alt = photo.alt || `${trip.title} photograph`;
        image.loading = "lazy";
        image.decoding = "async";

        const caption = document.createElement("figcaption");
        const rating = document.createElement("strong");
        rating.textContent = photoRatingLabel(photo);
        const meta = document.createElement("span");
        meta.textContent = [photo.subject || "", photo.location || "", photo.capturedOn || ""]
          .filter(Boolean)
          .join(" • ");
        caption.appendChild(rating);
        caption.appendChild(meta);

        anchor.appendChild(image);
        figure.appendChild(anchor);
        figure.appendChild(caption);
        grid.appendChild(figure);
      });

      article.appendChild(grid);
      tripStreamList.appendChild(article);
    });

    if (renderedCount === 0) {
      tripStreamList.appendChild(buildEmptyState("No photos are available for the selected trips."));
    }
  }

  function resolveTripHighlights(trip, tripPhotos) {
    const explicit = Array.isArray(trip.highlights)
      ? trip.highlights.map((source) => normalizePhotoSrc(source)).filter(Boolean)
      : [];
    if (explicit.length >= 2) {
      return explicit.slice(0, 3);
    }

    const inferred = tripPhotos.slice(0, 3).map((photo) => normalizePhotoSrc(photo.src)).filter(Boolean);
    const merged = [...explicit, ...inferred];
    const seen = new Set();
    const deduped = [];
    merged.forEach((source) => {
      if (seen.has(source)) {
        return;
      }
      seen.add(source);
      deduped.push(source);
    });
    return deduped.slice(0, 3);
  }

  function tripLinkFor(trip) {
    const rawPath = String(trip.legacyPath || "").trim();
    if (!rawPath) {
      return `/photography#trip-${trip.slug}`;
    }

    if (/^https?:\/\//i.test(rawPath) || /^mailto:/i.test(rawPath)) {
      return rawPath;
    }

    const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    if (normalized.startsWith("/photography/") && !seedTripSlugSet.has(trip.slug)) {
      return `/photography#trip-${trip.slug}`;
    }
    return normalized;
  }

  function setPhotoModalData(anchor, photo, options = {}) {
    if (!(anchor instanceof HTMLElement) || !photo || typeof photo !== "object") {
      return;
    }

    anchor.setAttribute("data-photo-modal", "");
    anchor.setAttribute("data-photo-full-res", String(photo.src || ""));
    anchor.setAttribute("data-photo-title", String(options.title || ""));
    anchor.setAttribute("data-photo-caption", String(options.caption || ""));
    anchor.setAttribute("data-photo-rating", photoRatingLabel(photo));

    setOptionalData(anchor, "photoIso", photo.iso);
    setOptionalData(anchor, "photoShutter", photo.shutterSpeed);
    setOptionalData(anchor, "photoAperture", photo.aperture);
    setOptionalData(anchor, "photoCamera", photo.camera);
    setOptionalData(anchor, "photoLens", photo.lens);
  }

  function setOptionalData(node, key, value) {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const normalized = String(value ?? "").trim();
    if (!normalized) {
      delete node.dataset[key];
      return;
    }
    node.dataset[key] = normalized;
  }

  function syncTripCarouselViewport() {
    const maxScroll = Math.max(0, tripCarouselTrack.scrollWidth - tripCarouselTrack.clientWidth);
    if (maxScroll <= 0) {
      tripCarouselTrack.scrollLeft = 0;
      return;
    }

    if (tripCarouselTrack.scrollLeft > maxScroll) {
      tripCarouselTrack.scrollLeft = maxScroll;
    }
  }

  function buildEmptyState(text) {
    const node = document.createElement("p");
    node.className = "bird-empty-state";
    node.textContent = String(text || "");
    return node;
  }

  function loadLocalDraft() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return sanitizeDraft(JSON.parse(raw));
    } catch (_error) {
      return null;
    }
  }

  async function loadRemoteDraft() {
    const firebase = window.firebase;
    if (!firebase || typeof firebase !== "object" || !Array.isArray(firebase.apps) || !firebase.apps.length) {
      return null;
    }

    try {
      const app = firebase.app();
      if (!app || typeof app.firestore !== "function") {
        return null;
      }
      const snapshot = await app.firestore().collection(REMOTE_COLLECTION).doc(REMOTE_DOCUMENT).get();
      if (!snapshot.exists) {
        return null;
      }
      const payload = snapshot.data();
      const remoteValue = payload?.[REMOTE_FIELD];
      const hasGallery =
        remoteValue &&
        typeof remoteValue === "object" &&
        (Array.isArray(remoteValue.trips) || Array.isArray(remoteValue.photos));
      const atlasPhotos = mapAtlasPhotosToGalleryPhotos(payload?.photos);
      if (!hasGallery && !atlasPhotos.length) {
        return null;
      }
      const baseGallery = hasGallery ? sanitizeDraft(remoteValue) : { trips: [], photos: [] };
      return mergeAtlasPhotosIntoDraft(baseGallery, atlasPhotos);
    } catch (_error) {
      return null;
    }
  }

  function mergeAtlasPhotosIntoDraft(baseGalleryDraft, atlasPhotos) {
    if (!Array.isArray(atlasPhotos) || !atlasPhotos.length) {
      return sanitizeDraft(baseGalleryDraft);
    }

    return mergeDrafts(
      {
        trips: [],
        photos: atlasPhotos,
      },
      sanitizeDraft(baseGalleryDraft),
      { mode: "union" },
    );
  }

  function mapAtlasPhotosToGalleryPhotos(rawPhotos) {
    if (!Array.isArray(rawPhotos)) {
      return [];
    }

    const seenIds = new Set();
    const mapped = [];
    rawPhotos.forEach((rawPhoto, index) => {
      if (!rawPhoto || typeof rawPhoto !== "object") {
        return;
      }

      const src = normalizePhotoSrc(rawPhoto.src);
      if (!src) {
        return;
      }

      const tripSlug = slugify(normalizeOptionalText(rawPhoto.trip)) || "bird-atlas";
      const baseIdSource =
        normalizeOptionalText(rawPhoto.birdKey) ||
        removeFileExtension(String(src).split("/").pop() || "") ||
        `atlas-${index + 1}`;
      let id = slugify(`${tripSlug}-${baseIdSource}`) || `${tripSlug}-atlas-${index + 1}`;
      if (seenIds.has(id)) {
        let suffix = 2;
        while (seenIds.has(`${id}-${suffix}`)) {
          suffix += 1;
        }
        id = `${id}-${suffix}`;
      }
      seenIds.add(id);

      const locationParts = [
        normalizeOptionalText(rawPhoto.county),
        normalizeOptionalText(rawPhoto.state),
        normalizeOptionalText(rawPhoto.country),
      ].filter(Boolean);
      const location = normalizeOptionalText(rawPhoto.location) || locationParts.join(", ");
      const tags = ["bird-atlas"];
      const birdTag = slugify(normalizeOptionalText(rawPhoto.birdKey));
      if (birdTag) {
        tags.push(`bird:${birdTag}`);
      }

      mapped.push({
        id,
        tripSlug,
        src,
        alt: normalizeOptionalText(rawPhoto.alt) || `${toTitleCase(tripSlug.replace(/-/g, " "))} photograph`,
        rating: 0,
        isFavorite: false,
        capturedOn: normalizeDate(rawPhoto.capturedOn),
        location,
        subject: "",
        tags,
        iso: normalizePhotoIso(rawPhoto.iso),
        shutterSpeed: normalizeOptionalText(rawPhoto.shutterSpeed),
        aperture: normalizeOptionalText(rawPhoto.aperture),
        camera: normalizeOptionalText(rawPhoto.camera),
        lens: normalizeOptionalText(rawPhoto.lens),
      });
    });

    return mapped;
  }

  function sanitizeDraft(raw) {
    const draftInput = raw && typeof raw === "object" ? raw : {};
    const inputTrips = Array.isArray(draftInput.trips) ? draftInput.trips : [];
    const inputPhotos = Array.isArray(draftInput.photos) ? draftInput.photos : [];

    const seenTripSlugs = new Set();
    const trips = [];
    inputTrips.forEach((trip, index) => {
      if (!trip || typeof trip !== "object") {
        return;
      }

      let slug = slugify(normalizeOptionalText(trip.slug) || normalizeOptionalText(trip.title) || `trip-${index + 1}`);
      if (!slug) {
        slug = `trip-${index + 1}`;
      }
      if (seenTripSlugs.has(slug)) {
        let suffix = 2;
        while (seenTripSlugs.has(`${slug}-${suffix}`)) {
          suffix += 1;
        }
        slug = `${slug}-${suffix}`;
      }
      seenTripSlugs.add(slug);

      const legacyVisible = trip.showOnPhotographyPage !== false;
      const showInBasePage =
        typeof trip.showInBasePage === "boolean" ? Boolean(trip.showInBasePage) : legacyVisible;
      const showInCarousel =
        typeof trip.showInCarousel === "boolean" ? Boolean(trip.showInCarousel) : legacyVisible;

      trips.push({
        slug,
        title: normalizeOptionalText(trip.title) || toTitleCase(slug.replace(/-/g, " ")),
        year: normalizeOptionalText(trip.year) || "",
        legacyPath: normalizeLegacyPath(trip.legacyPath || `/photography/${slug}`),
        coverImage: normalizePhotoSrc(trip.coverImage || ""),
        highlights: Array.isArray(trip.highlights)
          ? trip.highlights.map((source) => normalizePhotoSrc(source)).filter(Boolean)
          : [],
        showOnPhotographyPage: showInBasePage || showInCarousel,
        showInBasePage,
        showInCarousel,
      });
    });

    if (!trips.length) {
      trips.push({
        slug: "general",
        title: "General",
        year: "",
        legacyPath: "/photography",
        coverImage: "",
        highlights: [],
        showOnPhotographyPage: true,
        showInBasePage: true,
        showInCarousel: true,
      });
      seenTripSlugs.add("general");
    }

    const firstTripSlug = trips[0].slug;
    const seenPhotoIds = new Set();
    const photos = [];
    inputPhotos.forEach((photo, index) => {
      if (!photo || typeof photo !== "object") {
        return;
      }

      const src = normalizePhotoSrc(photo.src);
      if (!src) {
        return;
      }

      let tripSlug = slugify(normalizeOptionalText(photo.tripSlug));
      if (!tripSlug) {
        tripSlug = firstTripSlug;
      } else if (!seenTripSlugs.has(tripSlug)) {
        seenTripSlugs.add(tripSlug);
        trips.push({
          slug: tripSlug,
          title: toTitleCase(tripSlug.replace(/-/g, " ")),
          year: "",
          legacyPath: normalizeLegacyPath(`/photography/${tripSlug}`),
          coverImage: "",
          highlights: [],
          showOnPhotographyPage: true,
          showInBasePage: true,
          showInCarousel: true,
        });
      }

      let id = slugify(normalizeOptionalText(photo.id) || `${tripSlug}-photo-${index + 1}`);
      if (!id) {
        id = `${tripSlug}-photo-${index + 1}`;
      }
      if (seenPhotoIds.has(id)) {
        let suffix = 2;
        while (seenPhotoIds.has(`${id}-${suffix}`)) {
          suffix += 1;
        }
        id = `${id}-${suffix}`;
      }
      seenPhotoIds.add(id);

      photos.push({
        id,
        tripSlug,
        src,
        alt: normalizeOptionalText(photo.alt) || `${toTitleCase(tripSlug.replace(/-/g, " "))} photograph`,
        rating: clampRating(Number(photo.rating)),
        isFavorite: Boolean(photo.isFavorite) || hasFeaturedTag(photo.tags),
        capturedOn: normalizeDate(photo.capturedOn),
        location: normalizeOptionalText(photo.location),
        subject: normalizeOptionalText(photo.subject),
        tags: parseTags(photo.tags),
        iso: normalizePhotoIso(photo.iso),
        shutterSpeed: normalizeOptionalText(photo.shutterSpeed),
        aperture: normalizeOptionalText(photo.aperture),
        camera: normalizeOptionalText(photo.camera),
        lens: normalizeOptionalText(photo.lens),
      });
    });

    return {
      trips: sortTrips(trips),
      photos: photos.sort(comparePhotosByDate),
    };
  }

  function mergeDrafts(baseDraftInput, overrideDraftInput, options = {}) {
    const base = sanitizeDraft(baseDraftInput);
    const override = sanitizeDraft(overrideDraftInput);
    const mode = options?.mode === "union" ? "union" : "override";
    const overrideHasTrips = Boolean(
      overrideDraftInput &&
        typeof overrideDraftInput === "object" &&
        Array.isArray(overrideDraftInput.trips),
    );
    const overrideHasPhotos = Boolean(
      overrideDraftInput &&
        typeof overrideDraftInput === "object" &&
        Array.isArray(overrideDraftInput.photos),
    );

    const tripMap = new Map();
    if (mode === "override") {
      const sourceTrips = overrideHasTrips ? override.trips : base.trips;
      sourceTrips.forEach((trip) => {
        tripMap.set(trip.slug, { ...trip });
      });
    } else {
      base.trips.forEach((trip) => {
        tripMap.set(trip.slug, { ...trip });
      });
      override.trips.forEach((trip) => {
        const existing = tripMap.get(trip.slug);
        tripMap.set(trip.slug, existing ? { ...existing, ...trip } : { ...trip });
      });
    }

    const photoMap = new Map();
    if (mode === "override") {
      const sourcePhotos = overrideHasPhotos ? override.photos : base.photos;
      sourcePhotos.forEach((photo) => {
        photoMap.set(photo.id, { ...photo, tags: parseTags(photo.tags) });
      });
    } else {
      base.photos.forEach((photo) => {
        photoMap.set(photo.id, { ...photo, tags: parseTags(photo.tags) });
      });
      override.photos.forEach((photo) => {
        const existing = photoMap.get(photo.id);
        photoMap.set(
          photo.id,
          existing
            ? { ...existing, ...photo, tags: parseTags(photo.tags) }
            : { ...photo, tags: parseTags(photo.tags) },
        );
      });
    }

    return sanitizeDraft({
      trips: Array.from(tripMap.values()),
      photos: Array.from(photoMap.values()),
    });
  }

  function isSameDraft(left, right) {
    try {
      return JSON.stringify(sanitizeDraft(left)) === JSON.stringify(sanitizeDraft(right));
    } catch (_error) {
      return false;
    }
  }

  function comparePhotosByDate(left, right) {
    const dateDiff = toTimestamp(right.capturedOn) - toTimestamp(left.capturedOn);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(left.id).localeCompare(String(right.id));
  }

  function comparePhotosByRating(left, right) {
    const ratingDiff = clampRating(Number(right?.rating)) - clampRating(Number(left?.rating));
    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    return comparePhotosByDate(left, right);
  }

  function sortTrips(trips) {
    return [...trips].sort((left, right) => {
      const yearDiff = extractYear(right.year) - extractYear(left.year);
      if (yearDiff !== 0) {
        return yearDiff;
      }
      return String(left.title).localeCompare(String(right.title));
    });
  }

  function photoRatingLabel(photo) {
    const rating = clampRating(Number(photo?.rating));
    return rating > 0 ? `${"\u2605".repeat(rating)} ${rating}/5` : "Unrated";
  }

  function parseTags(value) {
    if (Array.isArray(value)) {
      return value
        .map((tag) => normalizeOptionalText(tag))
        .filter(Boolean);
    }

    return String(value || "")
      .split(",")
      .map((tag) => normalizeOptionalText(tag))
      .filter(Boolean);
  }

  function hasFeaturedTag(value) {
    return parseTags(value).includes("featured");
  }

  function isFavoritePhoto(photo) {
    if (!photo || typeof photo !== "object") {
      return false;
    }
    return Boolean(photo.isFavorite) || hasFeaturedTag(photo.tags);
  }

  function normalizeDate(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function normalizePhotoIso(value) {
    const text = String(value ?? "").trim();
    if (!text) {
      return null;
    }

    const numeric = Number(text);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }

    return Math.round(numeric);
  }

  function normalizeLegacyPath(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "/photography";
    }

    if (/^https?:\/\//i.test(text) || /^mailto:/i.test(text)) {
      return text;
    }

    return text.startsWith("/") ? text : `/${text}`;
  }

  function normalizePhotoSrc(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }

    if (/^(https?:)?\/\//i.test(text) || /^data:/i.test(text) || /^blob:/i.test(text)) {
      return text;
    }

    if (text.startsWith("/")) {
      return text;
    }

    const cleaned = text.replace(/^\.?\/*/, "");
    return cleaned ? `/${cleaned}` : "";
  }

  function normalizeOptionalText(value) {
    return String(value || "").trim();
  }

  function extractYear(value) {
    const match = String(value || "").match(/(\d{4})/);
    if (!match) {
      return 0;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function toTimestamp(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clampRating(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(5, Math.round(numeric)));
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function removeFileExtension(value) {
    return String(value || "").replace(/\.[a-z0-9]+$/i, "");
  }

  function toTitleCase(value) {
    return String(value || "")
      .trim()
      .split(/\s+/)
      .map((chunk) => chunk.slice(0, 1).toUpperCase() + chunk.slice(1).toLowerCase())
      .join(" ");
  }
})();
