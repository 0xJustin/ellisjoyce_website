(() => {
  const controls = document.querySelector("[data-bird-controls]");
  if (!(controls instanceof HTMLElement)) return;

  const rows = Array.from(document.querySelectorAll("[data-bird-row]"));
  if (!rows.length) return;

  const rarityButtons = Array.from(controls.querySelectorAll("[data-rarity-mode]"));
  const filterButtons = Array.from(controls.querySelectorAll("[data-bird-filter]"));
  const ratingButtons = Array.from(controls.querySelectorAll("[data-bird-rating-min]"));
  const searchInput = controls.querySelector("[data-bird-search]");

  const totalNode = document.querySelector("[data-stat-total]");
  const seenNode = document.querySelector("[data-stat-seen]");
  const photoNode = document.querySelector("[data-stat-photo]");
  const backlogNode = document.querySelector("[data-stat-backlog]");
  const emptyState = document.querySelector("[data-bird-empty]");

  const familyBlocks = Array.from(document.querySelectorAll(".bird-family"));
  const orderBlocks = Array.from(document.querySelectorAll("[data-bird-order]"));
  const taxonomyRoot = document.querySelector("[data-bird-list-root]");
  const familySortIndex = new WeakMap();
  const orderSortIndex = new WeakMap();
  familyBlocks.forEach((family, index) => {
    familySortIndex.set(family, index);
  });
  orderBlocks.forEach((order, index) => {
    orderSortIndex.set(order, index);
  });

  const baselineByRow = new WeakMap();
  const locationTokensByRow = new WeakMap();
  const photosByRow = new WeakMap();
  const previewSelectionIndexByRow = new WeakMap();
  const previewCandidatesByRow = new WeakMap();
  const FILTER_MODES = new Set(["all", "seen", "unseen", "photographed", "needs-photo", "rated", "unrated"]);
  const RARITY_MODES = new Set(["common", "rare", "world"]);
  let rarityMode = "common";
  let filterMode = "all";
  let ratingMinimum = 0;
  let queryText = "";
  let mapLocationFilter = null;
  let remoteDraft = null;
  const shared = window.BirdAdminShared;

  const normalize = (value) =>
    String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const normalizeKey = (value) => {
    if (shared && typeof shared.normalizeKey === "function") {
      return shared.normalizeKey(value);
    }
    return normalize(value);
  };

  const normalizeGeoToken = (value) =>
    String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  const normalizeCountyToken = (value) =>
    normalizeGeoToken(value)
      .replace(/\b(county|parish|borough|municipality|census area|city and borough|city)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const STATE_ABBREVIATIONS = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    "district of columbia": "DC",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
    alberta: "AB",
    "british columbia": "BC",
    manitoba: "MB",
    "new brunswick": "NB",
    "newfoundland and labrador": "NL",
    "nova scotia": "NS",
    ontario: "ON",
    "prince edward island": "PE",
    quebec: "QC",
    saskatchewan: "SK",
    nunavut: "NU",
    yukon: "YT",
    "northwest territories": "NT",
  };

  const addGeoTokenVariants = (tokens, value) => {
    const normalized = normalizeGeoToken(value);
    if (!normalized) {
      return;
    }

    tokens.add(normalized);

    // Accept subdivision-style tokens like "US-VA" and "US VA" when map emits "VA".
    const subdivisionMatch = normalized.match(/^[a-z]{2}\s+([a-z0-9]{2,})$/);
    if (subdivisionMatch) {
      tokens.add(subdivisionMatch[1]);
    }
  };

  const addCountyTokenVariants = (tokens, value) => {
    addGeoTokenVariants(tokens, value);
    const countyNormalized = normalizeCountyToken(value);
    if (countyNormalized) {
      tokens.add(countyNormalized);
    }
  };

  const parseTokenSet = (value, options) => {
    const tokens = new Set();
    const isCountySet = Boolean(options?.isCountySet);
    String(value || "")
      .split("|")
      .forEach((token) => {
        if (isCountySet) {
          addCountyTokenVariants(tokens, token);
          return;
        }
        addGeoTokenVariants(tokens, token);
      });
    return tokens;
  };

  const normalizePhoto = (photo) => {
    if (!photo || typeof photo !== "object") {
      return null;
    }

    const src = String(photo.src || "").trim();
    if (!src || /^file:/i.test(src) || /^\/(Users|home|private)\//.test(src) || /^[A-Za-z]:[\\/]/.test(src)) {
      return null;
    }

    return {
      src,
      alt: String(photo.alt || ""),
      rating: Number.isFinite(Number(photo.rating)) ? Math.max(0, Math.min(5, Math.round(Number(photo.rating)))) : 0,
      capturedOn: photo.capturedOn ? String(photo.capturedOn) : "",
      country: photo.country ? String(photo.country) : "",
      state: photo.state ? String(photo.state) : "",
      county: photo.county ? String(photo.county) : "",
      location: photo.location ? String(photo.location) : "",
    };
  };

  const formatPreviewCaption = (photo) => {
    const state = abbreviateStateForLocation(photo?.state);
    const place = [photo.county || "", state, photo.country || ""].filter(Boolean).join(", ");
    return [place || photo.location || "Uploaded photo", photo.location || "", photo.capturedOn || ""].filter(Boolean).join(
      " • ",
    );
  };

  const abbreviateStateForLocation = (state) => {
    const raw = String(state || "").trim();
    if (!raw) {
      return "";
    }

    if (/^[A-Za-z]{2}$/.test(raw)) {
      return raw.toUpperCase();
    }

    const normalized = raw.toLowerCase().replace(/[.]/g, "").replace(/\s+/g, " ").trim();
    return STATE_ABBREVIATIONS[normalized] || raw;
  };

  const normalizeFilterMode = (value, fallback = "all") => {
    const normalized = String(value || "").trim();
    if (FILTER_MODES.has(normalized)) {
      return normalized;
    }
    return fallback;
  };

  const normalizeRarityMode = (value, fallback = "common") => {
    const normalized = String(value || "").trim();
    if (RARITY_MODES.has(normalized)) {
      return normalized;
    }
    return fallback;
  };

  const formatSeenChipLabel = (isSeen, firstSeenDate) => {
    if (!isSeen) {
      return "Not Seen";
    }
    const seenDate = String(firstSeenDate || "").trim();
    return seenDate ? `Seen ${seenDate}` : "Seen";
  };

  const formatRatingStars = (value) => {
    const rating = Number(value || 0);
    const normalized = Number.isFinite(rating) ? Math.max(0, Math.min(5, Math.round(rating))) : 0;
    return `${"★".repeat(normalized)}${"☆".repeat(5 - normalized)}`;
  };

  const formatPreviewRatingTag = (photo) => {
    const rating = Number.isFinite(Number(photo?.rating)) ? Math.max(0, Math.min(5, Math.round(Number(photo.rating)))) : 0;
    return rating > 0 ? formatRatingStars(rating) : "";
  };

  const buildRowPhotoKeyCandidates = (row) => {
    const candidates = new Set();
    const rawCandidates = [
      row.getAttribute("data-bird-key"),
      row.getAttribute("data-common-name"),
      row.getAttribute("data-scientific-name"),
    ];

    rawCandidates.forEach((candidate) => {
      const normalized = normalizeKey(candidate);
      if (normalized) {
        candidates.add(normalized);
      }
    });

    return Array.from(candidates);
  };

  const setPreviewState = (row, preview) => {
    const previewNode = row.querySelector("[data-photo-preview]");
    const previewEmptyNode = row.querySelector("[data-photo-preview-empty]");
    const previewImage = row.querySelector("[data-photo-preview-image]");
    const previewRating = row.querySelector("[data-photo-preview-rating]");
    const previewPrevButton = row.querySelector("[data-photo-preview-prev]");
    const previewNextButton = row.querySelector("[data-photo-preview-next]");
    const previewCaption = row.querySelector("[data-photo-preview-caption]");
    const previewEmptyText = previewEmptyNode?.querySelector("p");
    const baseline = baselineByRow.get(row);
    const defaultEmptyText =
      baseline?.previewEmptyText || "Upload a photo to complete this entry.";

    if (!(previewNode instanceof HTMLElement)) return;
    if (!(previewEmptyNode instanceof HTMLElement)) return;
    if (!(previewImage instanceof HTMLImageElement)) return;
    if (!(previewCaption instanceof HTMLElement)) return;

    if (preview && preview.src) {
      previewNode.toggleAttribute("hidden", false);
      previewEmptyNode.toggleAttribute("hidden", true);
      previewImage.setAttribute("src", preview.src);
      previewImage.setAttribute("alt", preview.alt || "");
      if (previewRating instanceof HTMLElement) {
        previewRating.textContent = preview.ratingTag || "";
        previewRating.toggleAttribute("hidden", !preview.ratingTag);
      }
      const totalCount = Number(preview.totalCount || 0);
      const hasMultiplePreviews = totalCount > 1;
      const currentIndex = Number(preview.currentIndex || 0);
      if (previewPrevButton instanceof HTMLButtonElement) {
        previewPrevButton.toggleAttribute("hidden", !hasMultiplePreviews);
        previewPrevButton.disabled = !hasMultiplePreviews;
        previewPrevButton.setAttribute(
          "aria-label",
          hasMultiplePreviews ? `Previous photo (${currentIndex + 1} of ${totalCount})` : "Previous photo",
        );
      }
      if (previewNextButton instanceof HTMLButtonElement) {
        previewNextButton.toggleAttribute("hidden", !hasMultiplePreviews);
        previewNextButton.disabled = !hasMultiplePreviews;
        previewNextButton.setAttribute(
          "aria-label",
          hasMultiplePreviews ? `Next photo (${currentIndex + 1} of ${totalCount})` : "Next photo",
        );
      }
      previewCaption.textContent = preview.caption || "";
      if (previewEmptyText instanceof HTMLElement) {
        previewEmptyText.textContent = defaultEmptyText;
      }
      return;
    }

    previewNode.toggleAttribute("hidden", true);
    previewEmptyNode.toggleAttribute("hidden", false);
    previewImage.removeAttribute("src");
    previewImage.setAttribute("alt", "");
    if (previewRating instanceof HTMLElement) {
      previewRating.textContent = "";
      previewRating.toggleAttribute("hidden", true);
    }
    if (previewPrevButton instanceof HTMLButtonElement) {
      previewPrevButton.toggleAttribute("hidden", true);
      previewPrevButton.disabled = true;
    }
    if (previewNextButton instanceof HTMLButtonElement) {
      previewNextButton.toggleAttribute("hidden", true);
      previewNextButton.disabled = true;
    }
    previewCaption.textContent = "";
    if (previewEmptyText instanceof HTMLElement) {
      previewEmptyText.textContent = preview.emptyText || defaultEmptyText;
    }
  };

  const comparePreviewPhotos = (left, right) => {
    const ratingDiff = Number(right?.rating || 0) - Number(left?.rating || 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    const leftStamp = Date.parse(String(left?.capturedOn || ""));
    const rightStamp = Date.parse(String(right?.capturedOn || ""));
    if (Number.isFinite(leftStamp) && Number.isFinite(rightStamp) && rightStamp !== leftStamp) {
      return rightStamp - leftStamp;
    }

    return String(left?.src || "").localeCompare(String(right?.src || ""));
  };

  const highestPhotoRating = (photos) => {
    if (!Array.isArray(photos)) {
      return 0;
    }
    return photos.reduce((max, photo) => {
      const rating = Number(photo?.rating || 0);
      const normalized = Number.isFinite(rating) ? Math.max(0, Math.min(5, Math.round(rating))) : 0;
      return Math.max(max, normalized);
    }, 0);
  };

  const setPhotoChipState = (row, hasPhoto, count) => {
    const photoChip = row.querySelector("[data-photo-chip]");
    if (!(photoChip instanceof HTMLElement)) {
      return;
    }

    photoChip.textContent = hasPhoto ? `${count} Photo${count > 1 ? "s" : ""}` : "No Photo";
    photoChip.classList.toggle("is-on", hasPhoto);
    photoChip.classList.toggle("is-off", !hasPhoto);
  };

  const setSeenChipState = (row, isSeen, hasPhoto, label) => {
    const seenChip = row.querySelector("[data-seen-chip]");
    if (!(seenChip instanceof HTMLElement)) {
      return;
    }

    if (typeof label === "string") {
      seenChip.textContent = label;
    }
    seenChip.classList.toggle("is-on", isSeen);
    seenChip.classList.toggle("is-off", !isSeen);
    seenChip.classList.toggle("is-seen-without-photo", isSeen && !hasPhoto);
  };

  const unionTokenSets = (first, second) => {
    const merged = new Set(first || []);
    if (second instanceof Set) {
      second.forEach((token) => merged.add(token));
    }
    return merged;
  };

  const setLocationTokensForRow = (row, photos) => {
    const current = locationTokensByRow.get(row);
    const seenCountries =
      current?.seenCountries instanceof Set
        ? current.seenCountries
        : parseTokenSet(row.getAttribute("data-seen-country-tokens"));
    const seenStates =
      current?.seenStates instanceof Set
        ? current.seenStates
        : parseTokenSet(row.getAttribute("data-seen-state-tokens"));
    const seenCounties =
      current?.seenCounties instanceof Set
        ? current.seenCounties
        : parseTokenSet(row.getAttribute("data-seen-county-tokens"), { isCountySet: true });

    if (Array.isArray(photos)) {
      const photoCountries = new Set();
      const photoStates = new Set();
      const photoCounties = new Set();

      photos.forEach((photo) => {
        addGeoTokenVariants(photoCountries, photo?.country);
        addGeoTokenVariants(photoStates, photo?.state);
        addCountyTokenVariants(photoCounties, photo?.county);
      });

      locationTokensByRow.set(row, {
        photoCountries,
        photoStates,
        photoCounties,
        seenCountries,
        seenStates,
        seenCounties,
      });
      return;
    }

    locationTokensByRow.set(row, {
      photoCountries: parseTokenSet(row.getAttribute("data-photo-country-tokens")),
      photoStates: parseTokenSet(row.getAttribute("data-photo-state-tokens")),
      photoCounties: parseTokenSet(row.getAttribute("data-photo-county-tokens"), { isCountySet: true }),
      seenCountries,
      seenStates,
      seenCounties,
    });
  };

  const locationTokensForMode = (row) => {
    const tokens = locationTokensByRow.get(row);
    if (!tokens) {
      return null;
    }

    if (filterMode === "photographed") {
      return {
        countries: tokens.photoCountries,
        states: tokens.photoStates,
        counties: tokens.photoCounties,
      };
    }

    if (filterMode === "seen" || filterMode === "needs-photo") {
      return {
        countries: tokens.seenCountries,
        states: tokens.seenStates,
        counties: tokens.seenCounties,
      };
    }

    return {
      countries: unionTokenSets(tokens.photoCountries, tokens.seenCountries),
      states: unionTokenSets(tokens.photoStates, tokens.seenStates),
      counties: unionTokenSets(tokens.photoCounties, tokens.seenCounties),
    };
  };

  const locationFilteringEnabled = () =>
    Boolean(mapLocationFilter) && (filterMode === "seen" || filterMode === "photographed" || filterMode === "needs-photo");

  const syncRowStateClasses = (row) => {
    const isSeen = row.getAttribute("data-seen") === "true";
    const hasPhoto = row.getAttribute("data-photo") === "true";

    row.classList.toggle("is-seen", isSeen);
    row.classList.toggle("has-photo", hasPhoto);
    row.classList.toggle("is-seen-no-photo", isSeen && !hasPhoto);
  };

  const matchesLocationFilter = (row) => {
    if (!locationFilteringEnabled()) {
      return true;
    }

    const tokens = locationTokensForMode(row);
    if (!tokens) {
      return false;
    }

    const hasCountryFilter = mapLocationFilter.countryTokens.length > 0;
    const hasStateFilter = mapLocationFilter.stateTokens.length > 0;
    const hasCountyFilter = mapLocationFilter.countyTokens.length > 0;

    if (hasCountyFilter) {
      const countyMatches = mapLocationFilter.countyTokens.some((countyToken) => tokens.counties.has(countyToken));
      if (!countyMatches) {
        return false;
      }
    }

    if (hasStateFilter) {
      const stateMatches = mapLocationFilter.stateTokens.some((stateToken) => tokens.states.has(stateToken));
      if (!stateMatches) {
        return false;
      }
    }

    if (hasCountryFilter) {
      if (tokens.countries.size === 0) {
        if (!hasStateFilter) {
          return false;
        }
      } else {
        const countryMatches = mapLocationFilter.countryTokens.some((countryToken) =>
          tokens.countries.has(countryToken),
        );
        if (!countryMatches) {
          return false;
        }
      }
    }

    return true;
  };

  const tokenSetsMatchFilter = (tokenSets, filter) => {
    if (!filter) {
      return true;
    }

    const countries = tokenSets?.countries instanceof Set ? tokenSets.countries : new Set();
    const states = tokenSets?.states instanceof Set ? tokenSets.states : new Set();
    const counties = tokenSets?.counties instanceof Set ? tokenSets.counties : new Set();

    const hasCountryFilter = filter.countryTokens.length > 0;
    const hasStateFilter = filter.stateTokens.length > 0;
    const hasCountyFilter = filter.countyTokens.length > 0;

    if (hasCountyFilter) {
      const countyMatches = filter.countyTokens.some((countyToken) => counties.has(countyToken));
      if (!countyMatches) {
        return false;
      }
    }

    if (hasStateFilter) {
      const stateMatches = filter.stateTokens.some((stateToken) => states.has(stateToken));
      if (!stateMatches) {
        return false;
      }
    }

    if (hasCountryFilter) {
      if (countries.size === 0) {
        if (!hasStateFilter) {
          return false;
        }
      } else {
        const countryMatches = filter.countryTokens.some((countryToken) => countries.has(countryToken));
        if (!countryMatches) {
          return false;
        }
      }
    }

    return true;
  };

  const photoMatchesLocationFilter = (photo, filter) => {
    if (!filter) {
      return true;
    }

    const countries = new Set();
    const states = new Set();
    const counties = new Set();
    addGeoTokenVariants(countries, photo?.country);
    addGeoTokenVariants(states, photo?.state);
    addCountyTokenVariants(counties, photo?.county);
    return tokenSetsMatchFilter({ countries, states, counties }, filter);
  };

  const rowSeenMatchesLocationFilter = (row, filter) => {
    const tokens = locationTokensByRow.get(row);
    if (!tokens) {
      return false;
    }

    return tokenSetsMatchFilter(
      {
        countries: tokens.seenCountries,
        states: tokens.seenStates,
        counties: tokens.seenCounties,
      },
      filter,
    );
  };

  const fallbackLocationLabel = (row, filter) => {
    if (!filter) {
      return "";
    }

    const seenInSelection = rowSeenMatchesLocationFilter(row, filter);
    if (filter.countyTokens.length > 0) {
      return seenInSelection
        ? "Seen in selected county; photo from a different county"
        : "Photo from a different county";
    }
    if (filter.stateTokens.length > 0) {
      return seenInSelection
        ? "Seen in selected state; photo from a different state"
        : "Photo from a different state";
    }
    if (filter.countryTokens.length > 0) {
      return seenInSelection
        ? "Seen in selected country; photo from a different country"
        : "Photo from a different country";
    }
    return "Photo from a different location";
  };

  const getPreviewCandidatesForRow = (row) => {
    const photos = photosByRow.get(row) || [];
    if (!photos.length) {
      return {
        candidates: [],
        usingFallback: false,
        activeLocationFilter: null,
      };
    }

    const ranked = [...photos].sort(comparePreviewPhotos);
    const activeLocationFilter = locationFilteringEnabled() ? mapLocationFilter : null;
    const matching = activeLocationFilter
      ? ranked.filter((photo) => photoMatchesLocationFilter(photo, activeLocationFilter))
      : ranked;
    const usingFallback = Boolean(activeLocationFilter && matching.length === 0);
    const candidates = matching.length > 0 ? matching : ranked;

    return {
      candidates,
      usingFallback,
      activeLocationFilter,
    };
  };

  const renderSelectedPreviewForRow = (row) => {
    const previewState = previewCandidatesByRow.get(row);
    const candidates = Array.isArray(previewState?.candidates) ? previewState.candidates : [];
    if (!candidates.length) {
      previewSelectionIndexByRow.delete(row);
      setPreviewState(row, null);
      return;
    }

    let selectedIndex = Number(previewSelectionIndexByRow.get(row));
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= candidates.length) {
      selectedIndex = 0;
    }
    previewSelectionIndexByRow.set(row, selectedIndex);

    const primary = candidates[selectedIndex];
    const captionPrefix = previewState?.usingFallback
      ? fallbackLocationLabel(row, previewState.activeLocationFilter)
      : "";
    const caption = [captionPrefix, formatPreviewCaption(primary)].filter(Boolean).join(" • ");
    const ratingTag = formatPreviewRatingTag(primary);

    setPreviewState(row, {
      src: primary.src,
      alt: primary.alt,
      ratingTag,
      caption,
      currentIndex: selectedIndex,
      totalCount: candidates.length,
    });
  };

  const shiftPreviewForRow = (row, delta) => {
    const previewState = previewCandidatesByRow.get(row);
    const candidates = Array.isArray(previewState?.candidates) ? previewState.candidates : [];
    if (candidates.length < 2) {
      return;
    }

    const currentRaw = Number(previewSelectionIndexByRow.get(row));
    const currentIndex = Number.isInteger(currentRaw) ? currentRaw : 0;
    const nextIndex = ((currentIndex + delta) % candidates.length + candidates.length) % candidates.length;
    previewSelectionIndexByRow.set(row, nextIndex);
    renderSelectedPreviewForRow(row);
  };

  const applyPreviewForRow = (row) => {
    if (!photosByRow.has(row)) {
      return;
    }
    const previewState = getPreviewCandidatesForRow(row);
    previewCandidatesByRow.set(row, previewState);

    if (!previewState.candidates.length) {
      previewSelectionIndexByRow.delete(row);
      setPreviewState(row, null);
      return;
    }

    const currentRaw = Number(previewSelectionIndexByRow.get(row));
    if (!Number.isInteger(currentRaw) || currentRaw < 0 || currentRaw >= previewState.candidates.length) {
      previewSelectionIndexByRow.set(row, 0);
    }

    renderSelectedPreviewForRow(row);
  };

  const emitFilterChange = (visibleBirdKeys) => {
    window.__birdAtlasVisibleBirdKeys = visibleBirdKeys;
    window.dispatchEvent(
      new window.CustomEvent("bird-atlas:filters-changed", {
        detail: {
          visibleBirdKeys,
          rarityMode,
          filterMode,
          ratingMinimum,
          queryText,
          mapLocationFilter,
        },
      }),
    );
  };

  rows.forEach((row) => {
    const seenChip = row.querySelector("[data-seen-chip]");
    const photoChip = row.querySelector("[data-photo-chip]");
    const ratingChip = row.querySelector("[data-rating-chip]");
    const noteNode = row.querySelector("[data-note]");
    const previewNode = row.querySelector("[data-photo-preview]");
    const previewEmptyNode = row.querySelector("[data-photo-preview-empty]");
    const previewImage = row.querySelector("[data-photo-preview-image]");
    const previewRating = row.querySelector("[data-photo-preview-rating]");
    const previewPrevButton = row.querySelector("[data-photo-preview-prev]");
    const previewNextButton = row.querySelector("[data-photo-preview-next]");
    const previewCaption = row.querySelector("[data-photo-preview-caption]");

    baselineByRow.set(row, {
      seen: row.getAttribute("data-seen") || "false",
      photo: row.getAttribute("data-photo") || "false",
      rating: row.getAttribute("data-rating") || "0",
      firstSeenDate: row.getAttribute("data-first-seen-date") || "",
      seenChipText: seenChip ? seenChip.textContent : "",
      photoChipText: photoChip ? photoChip.textContent : "",
      ratingChipText: ratingChip ? ratingChip.textContent : "",
      noteText: noteNode ? noteNode.textContent : "",
      noteHidden: noteNode ? noteNode.hasAttribute("hidden") : true,
      previewHidden: previewNode ? previewNode.hasAttribute("hidden") : true,
      previewEmptyHidden: previewEmptyNode ? previewEmptyNode.hasAttribute("hidden") : true,
      previewSrc: previewImage ? previewImage.getAttribute("src") : "",
      previewAlt: previewImage ? previewImage.getAttribute("alt") : "",
      previewRatingText: previewRating ? previewRating.textContent : "",
      previewRatingHidden: previewRating ? previewRating.hasAttribute("hidden") : true,
      previewCaptionText: previewCaption ? previewCaption.textContent : "",
      previewEmptyText:
        previewEmptyNode && previewEmptyNode.querySelector("p")
          ? previewEmptyNode.querySelector("p").textContent
          : "Upload a photo to complete this entry.",
    });
    setLocationTokensForRow(row, null);
    syncRowStateClasses(row);

    if (previewImage instanceof HTMLImageElement) {
      previewImage.addEventListener("error", () => {
        const failedSrc = previewImage.getAttribute("src") || "";
        if (!failedSrc) {
          return;
        }

        setPreviewState(row, {
          emptyText: `Photo record found, but file is missing at ${failedSrc}`,
        });
        applyFilters();
      });
    }

    if (previewPrevButton instanceof HTMLButtonElement) {
      previewPrevButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        shiftPreviewForRow(row, -1);
      });
    }
    if (previewNextButton instanceof HTMLButtonElement) {
      previewNextButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        shiftPreviewForRow(row, 1);
      });
    }
  });

  const visibleMatch = (row) => {
    const rarity = row.getAttribute("data-rarity") || "common";
    const seen = row.getAttribute("data-seen") === "true";
    const hasPhoto = row.getAttribute("data-photo") === "true";

    if (rarityMode === "common" && rarity !== "common") {
      return false;
    }

    if (rarityMode === "rare" && rarity !== "rare") {
      return false;
    }

    if (filterMode === "seen" && !seen) {
      return false;
    }

    if (filterMode === "unseen" && seen) {
      return false;
    }

    if (filterMode === "photographed" && !hasPhoto) {
      return false;
    }

    if (filterMode === "needs-photo" && (!seen || hasPhoto)) {
      return false;
    }

    const rating = Number(row.getAttribute("data-rating") || "0");
    if (ratingMinimum > 0 && rating < ratingMinimum) {
      return false;
    }

    if (filterMode === "rated" && rating < 1) {
      return false;
    }

    if (filterMode === "unrated" && rating >= 1) {
      return false;
    }

    if (!matchesLocationFilter(row)) {
      return false;
    }

    if (!queryText) {
      return true;
    }

    const haystack = [
      row.getAttribute("data-common-name") || "",
      row.getAttribute("data-scientific-name") || "",
      row.getAttribute("data-family") || "",
      row.getAttribute("data-order") || "",
    ].join(" ");

    return normalize(haystack).includes(queryText);
  };

  const applyFilters = () => {
    const activeFilterButton = filterButtons.find((node) => node.classList.contains("is-active"));
    if (activeFilterButton) {
      filterMode = normalizeFilterMode(activeFilterButton.getAttribute("data-bird-filter"), filterMode);
    }

    let visibleCount = 0;
    let seenCount = 0;
    let photoCount = 0;
    let seenNeedsPhoto = 0;
    const visibleBirdKeys = [];

    rows.forEach((row) => {
      let isVisible = true;
      try {
        isVisible = visibleMatch(row);
      } catch (_error) {
        isVisible = true;
      }

      try {
        applyPreviewForRow(row);
      } catch (_error) {
        // Keep checklist filtering resilient even if one preview record is malformed.
      }
      row.toggleAttribute("hidden", !isVisible);

      if (!isVisible) {
        return;
      }

      visibleCount += 1;

      const key = normalizeKey(row.getAttribute("data-bird-key"));
      if (key) {
        visibleBirdKeys.push(key);
      }

      const seen = row.getAttribute("data-seen") === "true";
      const hasPhoto = row.getAttribute("data-photo") === "true";

      if (seen) {
        seenCount += 1;
      }

      if (hasPhoto) {
        photoCount += 1;
      }

      if (seen && !hasPhoto) {
        seenNeedsPhoto += 1;
      }
    });

    const familyVisibleCounts = new Map();
    familyBlocks.forEach((family) => {
      const visibleRows = family.querySelectorAll("[data-bird-row]:not([hidden])").length;
      familyVisibleCounts.set(family, visibleRows);
      family.toggleAttribute("hidden", visibleRows === 0);
      family.classList.toggle("is-filter-empty", visibleRows === 0);
    });

    const orderVisibleCounts = new Map();
    orderBlocks.forEach((order) => {
      const orderBody = order.querySelector(".bird-order-body");
      if (!(orderBody instanceof HTMLElement)) {
        orderVisibleCounts.set(order, 0);
        return;
      }

      const familyChildren = Array.from(orderBody.children).filter(
        (child) => child instanceof HTMLElement && child.classList.contains("bird-family"),
      );
      familyChildren.sort((left, right) => {
        const visibleDiff = (familyVisibleCounts.get(right) || 0) - (familyVisibleCounts.get(left) || 0);
        if (visibleDiff !== 0) {
          return visibleDiff;
        }

        return (familySortIndex.get(left) || 0) - (familySortIndex.get(right) || 0);
      });
      familyChildren.forEach((family) => {
        orderBody.appendChild(family);
      });

      const visibleRows = familyChildren.reduce((sum, family) => sum + (familyVisibleCounts.get(family) || 0), 0);
      orderVisibleCounts.set(order, visibleRows);
      order.toggleAttribute("hidden", visibleRows === 0);
      order.classList.toggle("is-filter-empty", visibleRows === 0);
    });

    if (taxonomyRoot instanceof HTMLElement) {
      const sortedOrders = [...orderBlocks].sort((left, right) => {
        const visibleDiff = (orderVisibleCounts.get(right) || 0) - (orderVisibleCounts.get(left) || 0);
        if (visibleDiff !== 0) {
          return visibleDiff;
        }

        return (orderSortIndex.get(left) || 0) - (orderSortIndex.get(right) || 0);
      });

      sortedOrders.forEach((order) => {
        taxonomyRoot.appendChild(order);
      });
    }

    if (totalNode) totalNode.textContent = String(visibleCount);
    if (seenNode) seenNode.textContent = String(seenCount);
    if (photoNode) photoNode.textContent = String(photoCount);
    if (backlogNode) backlogNode.textContent = String(seenNeedsPhoto);
    if (emptyState) emptyState.toggleAttribute("hidden", visibleCount !== 0);

    emitFilterChange(visibleBirdKeys);
  };

  const applyDraftOverrides = () => {
    if (!shared) {
      return;
    }

    let draft = null;
    try {
      draft = remoteDraft || shared.loadDraft();
    } catch (_error) {
      draft = remoteDraft || null;
    }
    if (!draft || typeof draft !== "object") {
      return;
    }

    const statusByKey = draft.status && typeof draft.status === "object" ? draft.status : {};
    let photoMap = new Map();
    if (typeof shared.buildPhotoMap === "function") {
      try {
        photoMap = shared.buildPhotoMap(Array.isArray(draft.photos) ? draft.photos : []);
      } catch (_error) {
        photoMap = new Map();
      }
    }
    if (!(photoMap instanceof Map)) {
      photoMap = new Map();
    }

    rows.forEach((row) => {
      try {
      const baseline = baselineByRow.get(row);
      if (!baseline) {
        return;
      }

      row.setAttribute("data-seen", baseline.seen);
      row.setAttribute("data-photo", baseline.photo);
      row.setAttribute("data-rating", baseline.rating);
      if (baseline.firstSeenDate) {
        row.setAttribute("data-first-seen-date", baseline.firstSeenDate);
      } else {
        row.removeAttribute("data-first-seen-date");
      }

      const baseSeen = baseline.seen === "true";
      const basePhoto = baseline.photo === "true";
      const baseRating = Number(baseline.rating || "0");

      setSeenChipState(row, baseSeen, basePhoto, formatSeenChipLabel(baseSeen, baseline.firstSeenDate));

      const photoChip = row.querySelector("[data-photo-chip]");
      if (photoChip) {
        photoChip.textContent = baseline.photoChipText;
        photoChip.classList.toggle("is-on", basePhoto);
        photoChip.classList.toggle("is-off", !basePhoto);
      }

      const ratingChip = row.querySelector("[data-rating-chip]");
      if (ratingChip) {
        ratingChip.textContent = formatRatingStars(baseRating);
        ratingChip.classList.toggle("is-on", baseRating >= 1);
        ratingChip.classList.toggle("is-off", baseRating < 1);
        ratingChip.removeAttribute("hidden");
      }

      const noteNode = row.querySelector("[data-note]");
      if (noteNode) {
        noteNode.textContent = baseline.noteText;
        noteNode.toggleAttribute("hidden", baseline.noteHidden);
      }

      const previewNode = row.querySelector("[data-photo-preview]");
      const previewEmptyNode = row.querySelector("[data-photo-preview-empty]");
      const previewImage = row.querySelector("[data-photo-preview-image]");
      const previewRating = row.querySelector("[data-photo-preview-rating]");
      const previewCaption = row.querySelector("[data-photo-preview-caption]");
      if (previewNode && previewEmptyNode && previewImage && previewCaption) {
        previewNode.toggleAttribute("hidden", baseline.previewHidden);
        previewEmptyNode.toggleAttribute("hidden", baseline.previewEmptyHidden);
        if (baseline.previewSrc) {
          previewImage.setAttribute("src", baseline.previewSrc);
        } else {
          previewImage.removeAttribute("src");
        }
        previewImage.setAttribute("alt", baseline.previewAlt || "");
        if (previewRating instanceof HTMLElement) {
          previewRating.textContent = baseline.previewRatingText || "";
          previewRating.toggleAttribute("hidden", baseline.previewRatingHidden);
        }
        previewCaption.textContent = baseline.previewCaptionText || "";
      }

      const key = normalizeKey(row.getAttribute("data-bird-key"));
      if (!key) {
        return;
      }

      const status = statusByKey[key];
      if (status) {
        const isSeen = Boolean(status.seen);
        row.setAttribute("data-seen", isSeen ? "true" : "false");
        if (Object.prototype.hasOwnProperty.call(status, "firstSeenDate")) {
          const normalizedFirstSeen = String(status.firstSeenDate || "").trim();
          if (normalizedFirstSeen) {
            row.setAttribute("data-first-seen-date", normalizedFirstSeen);
          } else {
            row.removeAttribute("data-first-seen-date");
          }
        }

        if (noteNode) {
          const noteText = String(status.notes || "").trim();
          noteNode.textContent = noteText;
          noteNode.toggleAttribute("hidden", !noteText);
        }
      }

      const photoCandidates = buildRowPhotoKeyCandidates(row);
      const mergedPhotos = [];
      const seenPhotoSignatures = new Set();
      photoCandidates.forEach((candidateKey) => {
        (photoMap.get(candidateKey) || []).forEach((photo) => {
          const signature = `${candidateKey}|${photo?.src || ""}|${photo?.capturedOn || ""}|${photo?.alt || ""}`;
          if (seenPhotoSignatures.has(signature)) {
            return;
          }
          seenPhotoSignatures.add(signature);
          mergedPhotos.push(photo);
        });
      });

      const photos = mergedPhotos.map(normalizePhoto).filter(Boolean);
      const photoCount = photos.length;
      const hasPhoto = photoCount > 0;
      const rowRating = highestPhotoRating(photos);

      row.setAttribute("data-photo", hasPhoto ? "true" : "false");
      row.setAttribute("data-rating", String(rowRating));
      setPhotoChipState(row, hasPhoto, photoCount);
      setLocationTokensForRow(row, photos);
      photosByRow.set(row, photos);
      const isSeen = row.getAttribute("data-seen") === "true";
      const firstSeenDate = row.getAttribute("data-first-seen-date");
      setSeenChipState(row, isSeen, hasPhoto, formatSeenChipLabel(isSeen, firstSeenDate));
      syncRowStateClasses(row);
      applyPreviewForRow(row);
      } catch (_error) {
        // Continue hydrating remaining rows if one record is malformed.
      }
    });
  };

  const applyDraftOverridesSafely = () => {
    try {
      applyDraftOverrides();
    } catch (_error) {
      // Preserve checklist filtering even when draft data is malformed.
    }
  };

  const refreshRemoteDraft = () => {
    if (!shared || typeof shared.loadRemoteDraft !== "function") {
      return;
    }

    shared.loadRemoteDraft().then((draftFromRemote) => {
      if (!draftFromRemote) {
        return;
      }

      remoteDraft = draftFromRemote;
      if (typeof shared.saveDraft === "function") {
        shared.saveDraft(draftFromRemote);
      }
      applyDraftOverridesSafely();
      applyFilters();
    });
  };

  window.addEventListener("bird-atlas:location-selected", (event) => {
    const detail = event?.detail || {};
    const countryTokens = Array.isArray(detail.countryTokens)
      ? detail.countryTokens.map(normalizeGeoToken).filter(Boolean)
      : [];
    const stateTokens = Array.isArray(detail.stateTokens)
      ? detail.stateTokens.map(normalizeGeoToken).filter(Boolean)
      : [];
    const countyTokens = Array.isArray(detail.countyTokens)
      ? detail.countyTokens.map(normalizeCountyToken).filter(Boolean)
      : [];
    const fallbackCountry = normalizeGeoToken(detail.country);
    const fallbackState = normalizeGeoToken(detail.state);
    const fallbackCounty = normalizeCountyToken(detail.county);

    if (!countryTokens.length && fallbackCountry) {
      countryTokens.push(fallbackCountry);
    }
    if (!stateTokens.length && fallbackState) {
      stateTokens.push(fallbackState);
    }
    if (!countyTokens.length && fallbackCounty) {
      countyTokens.push(fallbackCounty);
    }

    const hasFilter = Boolean(countryTokens.length || stateTokens.length || countyTokens.length);
    mapLocationFilter = hasFilter
      ? {
          countryTokens,
          stateTokens,
          countyTokens,
        }
      : null;
    applyFilters();
  });

  window.addEventListener("bird-atlas:location-cleared", () => {
    if (!mapLocationFilter) {
      return;
    }
    mapLocationFilter = null;
    applyFilters();
  });

  rarityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-rarity-mode");
      if (!mode) return;

      rarityMode = normalizeRarityMode(mode, rarityMode);
      rarityButtons.forEach((node) => {
        node.classList.toggle("is-active", node === button);
      });
      applyFilters();
    });
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-bird-filter");
      if (!mode) return;

      filterMode = normalizeFilterMode(mode, filterMode);
      filterButtons.forEach((node) => {
        node.classList.toggle("is-active", node === button);
      });
      mapLocationFilter = null;
      window.dispatchEvent(new window.CustomEvent("bird-atlas:reset-selection"));
      applyFilters();
    });
  });

  ratingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const rawMinimum = Number(button.getAttribute("data-bird-rating-min"));
      ratingMinimum = Number.isFinite(rawMinimum) ? Math.max(0, Math.min(5, rawMinimum)) : 0;
      ratingButtons.forEach((node) => {
        node.classList.toggle("is-active", node === button);
      });
      applyFilters();
    });
  });

  if (searchInput instanceof HTMLInputElement) {
    searchInput.addEventListener("input", () => {
      queryText = normalize(searchInput.value);
      applyFilters();
    });
  }

  const activeRarityButton = rarityButtons.find((node) => node.classList.contains("is-active"));
  const activeRarityMode = activeRarityButton?.getAttribute("data-rarity-mode");
  if (activeRarityMode) {
    rarityMode = normalizeRarityMode(activeRarityMode, rarityMode);
  }

  const activeFilterButton = filterButtons.find((node) => node.classList.contains("is-active"));
  const activeFilterMode = activeFilterButton?.getAttribute("data-bird-filter");
  const defaultFilterMode = filterButtons[0]?.getAttribute("data-bird-filter");
  filterMode = normalizeFilterMode(activeFilterMode, normalizeFilterMode(defaultFilterMode, "all"));

  const activeRatingButton = ratingButtons.find((node) => node.classList.contains("is-active"));
  const initialRatingMinimum = Number(activeRatingButton?.getAttribute("data-bird-rating-min"));
  if (Number.isFinite(initialRatingMinimum)) {
    ratingMinimum = Math.max(0, Math.min(5, initialRatingMinimum));
  }

  rarityButtons.forEach((node) => {
    node.classList.toggle("is-active", node.getAttribute("data-rarity-mode") === rarityMode);
  });
  filterButtons.forEach((node) => {
    node.classList.toggle("is-active", node.getAttribute("data-bird-filter") === filterMode);
  });
  ratingButtons.forEach((node) => {
    const rawMinimum = Number(node.getAttribute("data-bird-rating-min"));
    const minimum = Number.isFinite(rawMinimum) ? Math.max(0, Math.min(5, rawMinimum)) : 0;
    node.classList.toggle("is-active", minimum === ratingMinimum);
  });

  if (shared && typeof shared.loadRemoteDraft === "function") {
    refreshRemoteDraft();
    window.setTimeout(refreshRemoteDraft, 1500);
  }

  if (shared && typeof shared.subscribeRemoteDraft === "function") {
    shared.subscribeRemoteDraft((draftFromRemote) => {
      remoteDraft = draftFromRemote;
      applyDraftOverridesSafely();
      applyFilters();
    });
  }

  applyDraftOverridesSafely();
  applyFilters();

  window.addEventListener("storage", (event) => {
    if (!shared || event.key !== shared.STORAGE_KEY) {
      return;
    }

    applyDraftOverridesSafely();
    applyFilters();
  });

  window.addEventListener("focus", refreshRemoteDraft);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshRemoteDraft();
    }
  });
})();
