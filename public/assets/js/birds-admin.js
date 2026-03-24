(async () => {
  const shared = window.BirdAdminShared;
  if (!shared) {
    return;
  }

  try {
  const AUTH_SESSION_KEY = "ellisJoyceBirdAdminAuthV1";
  const FIELD_HISTORY_KEY = "ellisJoyceBirdAdminFieldHistoryV1";
  const FIELD_SUGGESTION_LIMIT = 40;
  const PASSWORD_HASH_HEX = "231a72e8d401147498137268eb23cbbd5fa9de73896aa2a2012aa2b03285f176";

  const hasAccess = await ensureAccess();
  if (!hasAccess) {
    window.location.href = "/photography/birds";
    return;
  }

  document.querySelectorAll("[data-admin-protected]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.toggleAttribute("hidden", false);
      if (node.hasAttribute("data-reveal")) {
        node.classList.add("is-visible");
      }
    }
  });

  const root = document.querySelector("[data-admin-root]");
  const seedNode = document.querySelector("#bird-admin-seed");
  if (!(root instanceof HTMLElement) || !(seedNode instanceof HTMLScriptElement)) {
    return;
  }

  let seedSpecies;
  try {
    const parsed = JSON.parse(seedNode.textContent || "[]");
    seedSpecies = Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    seedSpecies = [];
  }

  if (!seedSpecies.length) {
    return;
  }

  const normalizedSpecies = seedSpecies.map((bird) => {
    const birdKey = shared.normalizeKey(bird.birdKey);
    return {
      ...bird,
      birdKey,
      rarityBand: classifyRarityBand(bird),
      searchText: [bird.commonName, bird.scientificName, bird.family, bird.order, birdKey]
        .join(" ")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    };
  });

  const speciesByKey = new Map(normalizedSpecies.map((bird) => [bird.birdKey, bird]));
  const speciesLookupByToken = buildSpeciesLookupByToken(normalizedSpecies);
  const baseDraft = shared.createSeedDraft(normalizedSpecies);
  const localDraft = shared.loadDraft();
  let draft = localDraft || deepClone(baseDraft);
  let canAdoptRemoteDraft = !localDraft;
  const remoteAvailable =
    typeof shared.isRemoteAvailable === "function" &&
    typeof shared.saveRemoteDraft === "function" &&
    shared.isRemoteAvailable();
  let remoteReady =
    remoteAvailable &&
    typeof shared.hasRemoteUser === "function" &&
    shared.hasRemoteUser();
  let remoteSyncTimer = null;
  let remoteSyncReason = "";
  let remoteSyncInFlight = false;

  const state = {
    rarityMode: "common",
    filterMode: "all",
    queryText: "",
    selectedKey: null,
    photoEditIndex: null,
    photoEditSourceKey: null,
    photoDateManuallyEdited: false,
    photoRatingManuallyEdited: false,
    pendingUploadFiles: [],
    bulkUploadQueue: [],
    activeQueueItemId: null,
  };

  const listNode = root.querySelector("[data-admin-list]");
  const listCountNode = root.querySelector("[data-admin-list-count]");
  const emptyListNode = root.querySelector("[data-admin-empty-list]");

  const emptyEditorNode = root.querySelector("[data-admin-empty-editor]");
  const editorNode = root.querySelector("[data-admin-editor]");
  const commonNameNode = root.querySelector("[data-admin-common-name]");
  const scientificNameNode = root.querySelector("[data-admin-scientific-name]");
  const taxonomyNode = root.querySelector("[data-admin-taxonomy]");
  const abaCodeNode = root.querySelector("[data-admin-aba-code]");

  const seenInput = root.querySelector("[data-admin-seen]");
  const firstSeenInput = root.querySelector("[data-admin-first-seen]");
  const notesInput = root.querySelector("[data-admin-notes]");

  const photoForm = root.querySelector("[data-admin-photo-form]");
  const photoSubmitButton = root.querySelector("[data-admin-photo-submit]");
  const photoCancelButton = root.querySelector("[data-admin-photo-cancel]");
  const photoSpeciesInput = root.querySelector("[data-admin-photo-species]");
  const photoSrcInput = root.querySelector("[data-admin-photo-src]");
  const photoAltInput = root.querySelector("[data-admin-photo-alt]");
  const photoDateInput = root.querySelector("[data-admin-photo-date]");
  const photoRatingInput = root.querySelector("[data-admin-photo-rating]");
  const photoRatingStarsNode = root.querySelector("[data-admin-photo-rating-stars]");
  const photoRatingStarButtons = Array.from(root.querySelectorAll("[data-admin-photo-rating-star]"));
  const photoCountryInput = root.querySelector("[data-admin-photo-country]");
  const photoStateInput = root.querySelector("[data-admin-photo-state]");
  const photoCountyInput = root.querySelector("[data-admin-photo-county]");
  const photoLocationInput = root.querySelector("[data-admin-photo-location]");
  const photoTripInput = root.querySelector("[data-admin-photo-trip]");
  const photoListNode = root.querySelector("[data-admin-photo-list]");
  const photoEditPreviewNode = root.querySelector("[data-admin-photo-edit-preview]");
  const photoEditPreviewImage = root.querySelector("[data-admin-photo-edit-preview-image]");
  const photoEditPreviewCaption = root.querySelector("[data-admin-photo-edit-preview-caption]");

  const localFileInput = root.querySelector("[data-admin-local-file]");
  const localPreview = root.querySelector("[data-admin-local-preview]");
  const localFileHint = root.querySelector("[data-admin-local-file-hint]");
  const uploadProgressNode = root.querySelector("[data-admin-upload-progress]");
  const uploadProgressBar = root.querySelector("[data-admin-upload-progress-bar]");
  const uploadProgressLabel = root.querySelector("[data-admin-upload-progress-label]");
  const bulkFileInput = document.querySelector("[data-admin-bulk-file]");
  const bulkDropzone = document.querySelector("[data-admin-bulk-dropzone]");
  const bulkStartButton = document.querySelector("[data-admin-bulk-start]");
  const bulkClearButton = document.querySelector("[data-admin-bulk-clear]");
  const bulkQueueNode = document.querySelector("[data-admin-bulk-queue]");
  const bulkProgressNode = document.querySelector("[data-admin-bulk-progress]");
  const bulkProgressBar = document.querySelector("[data-admin-bulk-progress-bar]");
  const bulkProgressLabel = document.querySelector("[data-admin-bulk-progress-label]");
  const suggestionNodes = {
    country: root.querySelector('[data-admin-suggestions="country"]'),
    state: root.querySelector('[data-admin-suggestions="state"]'),
    county: root.querySelector('[data-admin-suggestions="county"]'),
    location: root.querySelector('[data-admin-suggestions="location"]'),
    trip: root.querySelector('[data-admin-suggestions="trip"]'),
    species: root.querySelector('[data-admin-suggestions="species"]'),
  };
  const defaultLocalFileHintText =
    localFileHint instanceof HTMLElement ? localFileHint.textContent : "";
  let localPreviewObjectUrl = null;
  let isBulkUploading = false;
  let speciesSuggestionListReady = false;
  const supportsBulkUpload =
    bulkFileInput instanceof HTMLInputElement &&
    bulkDropzone instanceof HTMLElement &&
    bulkStartButton instanceof HTMLButtonElement &&
    bulkClearButton instanceof HTMLButtonElement &&
    bulkQueueNode instanceof HTMLElement &&
    bulkProgressNode instanceof HTMLElement &&
    bulkProgressBar instanceof HTMLElement &&
    String(bulkProgressBar.tagName || "").toLowerCase() === "progress" &&
    bulkProgressLabel instanceof HTMLElement;

  const rarityButtons = Array.from(document.querySelectorAll("[data-admin-rarity]"));
  const filterButtons = Array.from(document.querySelectorAll("[data-admin-filter]"));
  const searchInput = document.querySelector("[data-admin-search]");

  const saveButton = document.querySelector("[data-admin-save]");
  const resetButton = document.querySelector("[data-admin-reset]");
  const exportStatusButton = document.querySelector("[data-admin-export-status]");
  const exportPhotosButton = document.querySelector("[data-admin-export-photos]");
  const statusMessageNode = document.querySelector("[data-admin-status-message]");
  const hasSearchControl = searchInput instanceof HTMLInputElement;
  const hasSaveControl = saveButton instanceof HTMLButtonElement;
  const hasResetControl = resetButton instanceof HTMLButtonElement;
  const hasExportStatusControl = exportStatusButton instanceof HTMLButtonElement;
  const hasExportPhotosControl = exportPhotosButton instanceof HTMLButtonElement;

  if (
    !(listNode instanceof HTMLElement) ||
    !(listCountNode instanceof HTMLElement) ||
    !(emptyListNode instanceof HTMLElement) ||
    !(emptyEditorNode instanceof HTMLElement) ||
    !(editorNode instanceof HTMLElement) ||
    !(commonNameNode instanceof HTMLElement) ||
    !(scientificNameNode instanceof HTMLElement) ||
    !(taxonomyNode instanceof HTMLElement) ||
    !(abaCodeNode instanceof HTMLElement) ||
    !(seenInput instanceof HTMLInputElement) ||
    !(firstSeenInput instanceof HTMLInputElement) ||
    !(notesInput instanceof HTMLTextAreaElement) ||
    !(photoForm instanceof HTMLFormElement) ||
    !(photoSubmitButton instanceof HTMLButtonElement) ||
    !(photoCancelButton instanceof HTMLButtonElement) ||
    !(photoSpeciesInput instanceof HTMLInputElement) ||
    !(photoSrcInput instanceof HTMLInputElement) ||
    !(photoAltInput instanceof HTMLInputElement) ||
    !(photoDateInput instanceof HTMLInputElement) ||
    !(photoRatingInput instanceof HTMLInputElement) ||
    !(photoRatingStarsNode instanceof HTMLElement) ||
    !photoRatingStarButtons.length ||
    !(photoCountryInput instanceof HTMLInputElement) ||
    !(photoStateInput instanceof HTMLInputElement) ||
    !(photoCountyInput instanceof HTMLInputElement) ||
    !(photoLocationInput instanceof HTMLInputElement) ||
    !(photoTripInput instanceof HTMLInputElement) ||
    !(photoListNode instanceof HTMLElement) ||
    !(photoEditPreviewNode instanceof HTMLElement) ||
    !(photoEditPreviewImage instanceof HTMLImageElement) ||
    !(photoEditPreviewCaption instanceof HTMLElement) ||
    !(statusMessageNode instanceof HTMLElement)
  ) {
    return;
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function classifyRarityBand(bird) {
    const explicitBand = String(bird?.rarityBand || "").trim();
    if (explicitBand === "common" || explicitBand === "rare" || explicitBand === "world") {
      return explicitBand;
    }

    const abaCode = Number(bird?.abaCode);
    if (Number.isFinite(abaCode) && abaCode >= 1 && abaCode <= 3) {
      return "common";
    }
    if (Number.isFinite(abaCode) && abaCode >= 4 && abaCode <= 5) {
      return "rare";
    }
    return "world";
  }
  const isTagElement = (node, tagName) =>
    node instanceof HTMLElement && String(node.tagName || "").toLowerCase() === String(tagName || "").toLowerCase();
  const suggestionFields = ["country", "state", "county", "location", "trip"];
  const fieldHistory = loadFieldHistory();
  let queueIdCounter = 0;

  const setStatusMessage = (message) => {
    const now = new Date();
    const stamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    statusMessageNode.textContent = `${message} (${stamp})`;
  };

  const formatErrorMessage = (error) => {
    if (error && typeof error === "object" && "message" in error && error.message) {
      return String(error.message);
    }
    return "Unknown error";
  };

  const formatBytes = (bytes) => {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) {
      return "0 B";
    }

    if (value < 1024) {
      return `${Math.round(value)} B`;
    }
    const kb = value / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    }
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const normalizeOptionalText = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const normalizePhotoRating = (value) => normalizeRating(value) || 0;
  const renderPhotoRatingStars = () => {
    const rating = normalizePhotoRating(photoRatingInput.value);
    photoRatingStarButtons.forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }
      const value = normalizePhotoRating(node.getAttribute("data-admin-photo-rating-star"));
      const isOn = value > 0 && value <= rating;
      node.classList.toggle("is-on", isOn);
      node.setAttribute("aria-pressed", isOn ? "true" : "false");
    });
    photoRatingStarsNode.setAttribute(
      "aria-label",
      rating > 0 ? `Photo rating ${rating} of 5 stars` : "Photo rating unrated",
    );
  };
  const setPhotoRatingValue = (value, options = {}) => {
    const normalized = normalizePhotoRating(value);
    const current = normalizePhotoRating(photoRatingInput.value);
    const allowToggleOff = Boolean(options.allowToggleOff);
    const nextValue = allowToggleOff && normalized === current ? 0 : normalized;
    photoRatingInput.value = String(nextValue);
    renderPhotoRatingStars();
  };
  const highestPhotoRating = (photos) => {
    if (!Array.isArray(photos) || photos.length === 0) {
      return 0;
    }
    return photos.reduce((max, photo) => Math.max(max, normalizePhotoRating(photo?.rating)), 0);
  };
  const formatPhotoRating = (value) => {
    const rating = normalizePhotoRating(value);
    return rating > 0 ? `${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)` : "Unrated";
  };
  const buildRatingOptionsMarkup = (value) => {
    const selected = normalizePhotoRating(value);
    const options = [
      { value: 0, label: "Unrated" },
      { value: 1, label: "★☆☆☆☆" },
      { value: 2, label: "★★☆☆☆" },
      { value: 3, label: "★★★☆☆" },
      { value: 4, label: "★★★★☆" },
      { value: 5, label: "★★★★★" },
    ];
    return options
      .map((option) => {
        const isSelected = selected === option.value ? ' selected="selected"' : "";
        return `<option value="${option.value}"${isSelected}>${option.label}</option>`;
      })
      .join("");
  };
  const resolvePhotoFormBirdKey = () => {
    const normalized = normalizeQueueBirdKey(photoSpeciesInput.value);
    return normalized && speciesByKey.has(normalized) ? normalized : "";
  };
  const setPhotoEditPreview = (photo, options = {}) => {
    if (!photo || !photo.src) {
      photoEditPreviewNode.toggleAttribute("hidden", true);
      photoEditPreviewImage.removeAttribute("src");
      photoEditPreviewImage.setAttribute("alt", "");
      photoEditPreviewCaption.textContent = "";
      return;
    }

    const birdKey = String(options.birdKey || photo.birdKey || "").trim();
    const speciesName = speciesByKey.get(birdKey)?.commonName || birdKey;
    const place = [photo.county, photo.state, photo.country]
      .map((value) => normalizeOptionalText(value))
      .filter(Boolean)
      .join(", ");
    const meta = [
      speciesName,
      formatPhotoRating(photo.rating),
      normalizeOptionalText(photo.capturedOn || ""),
      normalizeOptionalText(photo.location || "") || place,
    ]
      .filter(Boolean)
      .join(" • ");

    photoEditPreviewNode.toggleAttribute("hidden", false);
    photoEditPreviewImage.setAttribute("src", String(photo.src));
    photoEditPreviewImage.setAttribute("alt", normalizeOptionalText(photo.alt) || `${speciesName} photo preview`);
    photoEditPreviewCaption.textContent = meta;
  };

  const humanizeFileName = (name) => {
    const bare = String(name || "")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!bare) {
      return "";
    }
    return bare
      .split(" ")
      .map((token) => {
        if (!token) {
          return "";
        }
        return token.charAt(0).toUpperCase() + token.slice(1);
      })
      .join(" ");
  };

  const normalizeSuggestionValue = (value) => normalizeOptionalText(value);

  function loadFieldHistory() {
    try {
      const raw = window.localStorage.getItem(FIELD_HISTORY_KEY);
      if (!raw) {
        return createEmptyFieldHistory();
      }
      const parsed = JSON.parse(raw);
      const next = createEmptyFieldHistory();
      suggestionFields.forEach((field) => {
        const values = Array.isArray(parsed?.[field]) ? parsed[field] : [];
        next[field] = values
          .map((entry) => normalizeSuggestionValue(entry))
          .filter(Boolean)
          .slice(0, FIELD_SUGGESTION_LIMIT);
      });
      return next;
    } catch (_error) {
      return createEmptyFieldHistory();
    }
  }

  function createEmptyFieldHistory() {
    return {
      country: [],
      state: [],
      county: [],
      location: [],
      trip: [],
    };
  }

  function saveFieldHistory() {
    try {
      window.localStorage.setItem(FIELD_HISTORY_KEY, JSON.stringify(fieldHistory));
    } catch (_error) {}
  }

  function rememberFieldValue(field, rawValue) {
    if (!suggestionFields.includes(field)) {
      return;
    }

    const value = normalizeSuggestionValue(rawValue);
    if (!value) {
      return;
    }

    const existing = fieldHistory[field] || [];
    const withoutValue = existing.filter((entry) => normalizeSuggestionValue(entry) !== normalizeSuggestionValue(value));
    fieldHistory[field] = [value, ...withoutValue].slice(0, FIELD_SUGGESTION_LIMIT);
    saveFieldHistory();
    renderSuggestionLists();
  }

  function rememberPhotoRecordFields(photo) {
    if (!photo || typeof photo !== "object") {
      return;
    }
    suggestionFields.forEach((field) => {
      rememberFieldValue(field, photo[field] || "");
    });
  }

  function collectSuggestionValues(field) {
    const values = [];
    const seen = new Set();

    const addValue = (candidate) => {
      const normalized = normalizeSuggestionValue(candidate);
      if (!normalized) {
        return;
      }
      const token = normalizeText(normalized);
      if (!token || seen.has(token)) {
        return;
      }
      seen.add(token);
      values.push(normalized);
    };

    (fieldHistory[field] || []).forEach(addValue);
    (draft.photos || []).forEach((photo) => addValue(photo?.[field]));
    state.bulkUploadQueue.forEach((item) => addValue(item?.[field]));
    addValue(photoCountryInput.value);
    addValue(photoStateInput.value);
    addValue(photoCountyInput.value);
    addValue(photoLocationInput.value);
    addValue(photoTripInput.value);
    return values.slice(0, FIELD_SUGGESTION_LIMIT);
  }

  function renderSuggestionLists() {
    suggestionFields.forEach((field) => {
      const node = suggestionNodes[field];
      if (!isTagElement(node, "datalist")) {
        return;
      }

      const values = collectSuggestionValues(field);
      node.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
    });

    if (isTagElement(suggestionNodes.species, "datalist") && !speciesSuggestionListReady) {
      const options = normalizedSpecies
        .slice()
        .sort((left, right) => left.commonName.localeCompare(right.commonName))
        .map((bird) => `<option value="${escapeHtml(bird.birdKey)}">${escapeHtml(bird.commonName)}</option>`)
        .join("");
      suggestionNodes.species.innerHTML = options;
      speciesSuggestionListReady = true;
    }
  }

  function getDefaultFieldValue(field, fallback = "") {
    const fromHistory = Array.isArray(fieldHistory[field]) ? fieldHistory[field][0] : "";
    const normalizedFallback = normalizeSuggestionValue(fallback);
    return normalizeSuggestionValue(fromHistory) || normalizedFallback || "";
  }

  function getBulkQueueDefaults() {
    const selected = getSelectedSpecies();
    const formBirdKey = normalizeQueueBirdKey(photoSpeciesInput.value);
    return {
      birdKey: formBirdKey || selected?.birdKey || "",
      country: getDefaultFieldValue("country", photoCountryInput.value || "United States"),
      state: getDefaultFieldValue("state", photoStateInput.value),
      county: getDefaultFieldValue("county", photoCountyInput.value),
      location: getDefaultFieldValue("location", photoLocationInput.value),
      trip: getDefaultFieldValue("trip", photoTripInput.value),
      rating: normalizePhotoRating(photoRatingInput.value),
    };
  }

  function buildQueueSignature(file) {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }

  function buildQueueId() {
    queueIdCounter += 1;
    return `queue-${Date.now()}-${queueIdCounter}`;
  }

  function createQueuePreviewUrl(file) {
    if (!(file instanceof window.File) || typeof URL.createObjectURL !== "function") {
      return "";
    }
    try {
      return URL.createObjectURL(file);
    } catch (_error) {
      return "";
    }
  }

  function revokeQueuePreviewUrl(item) {
    const previewUrl = String(item?.previewUrl || "").trim();
    if (!previewUrl || typeof URL.revokeObjectURL !== "function") {
      return;
    }
    try {
      URL.revokeObjectURL(previewUrl);
    } catch (_error) {}
  }

  function clearBulkQueue(options) {
    const clearEditorUpload = Boolean(options?.clearEditorUpload);
    state.bulkUploadQueue.forEach((item) => revokeQueuePreviewUrl(item));
    state.bulkUploadQueue = [];
    state.activeQueueItemId = null;
    if (clearEditorUpload) {
      setPendingUploadFiles([]);
    }
  }

  function createQueueItem(file) {
    const defaults = getBulkQueueDefaults();
    return {
      id: buildQueueId(),
      signature: buildQueueSignature(file),
      file,
      previewUrl: createQueuePreviewUrl(file),
      birdKey: defaults.birdKey,
      birdKeyInput: defaults.birdKey,
      alt: humanizeFileName(file.name),
      capturedOn: "",
      rating: defaults.rating,
      country: defaults.country,
      state: defaults.state,
      county: defaults.county,
      location: defaults.location,
      trip: defaults.trip,
      notes: "",
      detectingMetadata: false,
      capturedOnTouched: false,
      ratingTouched: false,
    };
  }

  function buildSpeciesLookupByToken(speciesList) {
    const lookup = new Map();
    (speciesList || []).forEach((bird) => {
      if (!bird || !bird.birdKey) {
        return;
      }

      const tokens = [bird.birdKey, bird.commonName, `${bird.commonName} (${bird.birdKey})`, bird.scientificName];
      tokens.forEach((value) => {
        const key = normalizeText(value);
        if (!key || lookup.has(key)) {
          return;
        }
        lookup.set(key, bird.birdKey);
      });
    });
    return lookup;
  }

  function normalizeQueueBirdKey(value) {
    const direct = shared.normalizeKey(value);
    if (direct && speciesByKey.has(direct)) {
      return direct;
    }
    const token = normalizeText(value);
    if (!token) {
      return "";
    }
    return speciesLookupByToken.get(token) || "";
  }

  const updateUploadProgress = ({ hidden, value, label }) => {
    if (
      !(uploadProgressNode instanceof HTMLElement) ||
      !isTagElement(uploadProgressBar, "progress") ||
      !(uploadProgressLabel instanceof HTMLElement)
    ) {
      return;
    }

    const shouldHide = hidden !== undefined ? Boolean(hidden) : false;
    uploadProgressNode.toggleAttribute("hidden", shouldHide);
    if (typeof value === "number" && Number.isFinite(value)) {
      uploadProgressBar.value = Math.max(0, Math.min(100, value));
    }
    if (typeof label === "string") {
      uploadProgressLabel.textContent = label;
    }
  };

  const updateBulkUploadProgress = ({ hidden, value, label }) => {
    if (!supportsBulkUpload) {
      return;
    }
    const shouldHide = hidden !== undefined ? Boolean(hidden) : false;
    bulkProgressNode.toggleAttribute("hidden", shouldHide);
    if (typeof value === "number" && Number.isFinite(value)) {
      bulkProgressBar.value = Math.max(0, Math.min(100, value));
    }
    if (typeof label === "string") {
      bulkProgressLabel.textContent = label;
    }
  };

  const setUploadUiBusy = (isBusy) => {
    photoSubmitButton.disabled = Boolean(isBusy);
    photoCancelButton.disabled = Boolean(isBusy);
    if (localFileInput instanceof HTMLInputElement) {
      localFileInput.disabled = Boolean(isBusy);
    }
  };

  const setBulkUploadBusy = (isBusy) => {
    if (!supportsBulkUpload) {
      return;
    }
    const busy = Boolean(isBusy);
    bulkStartButton.disabled = busy;
    bulkClearButton.disabled = busy;
    bulkFileInput.disabled = busy;
    bulkDropzone.toggleAttribute("aria-disabled", busy);
    bulkDropzone.classList.toggle("is-disabled", busy);
  };

  const syncRemoteDraft = async (reason, options = {}) => {
    if (!remoteAvailable || typeof shared.saveRemoteDraft !== "function") {
      return false;
    }

    if (!remoteReady) {
      const interactive = Boolean(options.interactive);
      remoteReady = await ensureRemoteSession(interactive);
      if (!remoteReady) {
        return false;
      }
    }

    if (remoteSyncInFlight) {
      return false;
    }

    remoteSyncInFlight = true;
    try {
      await shared.saveRemoteDraft(deepNormalizeDraft(draft));
      setStatusMessage(`${reason}. Synced to Firebase.`);
      return true;
    } catch (error) {
      setStatusMessage(`${reason}. Saved locally, but Firebase sync failed: ${formatErrorMessage(error)}`);
      return false;
    } finally {
      remoteSyncInFlight = false;
    }
  };

  const scheduleRemoteSync = (reason) => {
    if (!remoteAvailable || !remoteReady) {
      return;
    }

    remoteSyncReason = reason;
    if (remoteSyncTimer) {
      window.clearTimeout(remoteSyncTimer);
    }

    remoteSyncTimer = window.setTimeout(() => {
      remoteSyncTimer = null;
      void syncRemoteDraft(remoteSyncReason, { interactive: false });
    }, 700);
  };

  const deepNormalizeDraft = (input) => shared.sanitizeDraft(JSON.parse(JSON.stringify(input)));

  const getStatusForKey = (birdKey) => draft.status[birdKey] || { seen: false };

  const getPhotosForKey = (birdKey) => {
    return draft.photos.filter((photo) => shared.normalizeKey(photo.birdKey) === birdKey);
  };

  const setPhotosForKey = (birdKey, photosForKey) => {
    const remaining = draft.photos.filter((photo) => shared.normalizeKey(photo.birdKey) !== birdKey);
    draft.photos = remaining.concat(photosForKey.map((photo) => ({ ...photo, birdKey })));
  };

  const canOmitStatus = (status) => {
    return !status.seen && !status.firstSeenDate && !status.lastSeenDate && !status.notes;
  };

  const upsertStatusForSelected = () => {
    const selected = getSelectedSpecies();
    if (!selected) {
      return;
    }

    const nextStatus = {
      seen: seenInput.checked,
      firstSeenDate: firstSeenInput.value.trim(),
      notes: notesInput.value.trim(),
    };

    const existingStatus = draft.status[selected.birdKey];
    if (existingStatus && existingStatus.lastSeenDate) {
      nextStatus.lastSeenDate = String(existingStatus.lastSeenDate);
    }

    if (canOmitStatus(nextStatus)) {
      delete draft.status[selected.birdKey];
    } else {
      draft.status[selected.birdKey] = {
        seen: nextStatus.seen,
        ...(nextStatus.firstSeenDate ? { firstSeenDate: nextStatus.firstSeenDate } : {}),
        ...(nextStatus.lastSeenDate ? { lastSeenDate: nextStatus.lastSeenDate } : {}),
        ...(nextStatus.notes ? { notes: nextStatus.notes } : {}),
      };
    }
  };

  const getSelectedSpecies = () => {
    if (!state.selectedKey) {
      return null;
    }

    return speciesByKey.get(state.selectedKey) || null;
  };

  const refreshPhotoEditPreviewFromForm = () => {
    if (state.photoEditIndex === null) {
      return;
    }

    const previewSrc = photoSrcInput.value.trim();
    if (!previewSrc) {
      setPhotoEditPreview(null);
      return;
    }

    const selected = getSelectedSpecies();
    const previewBirdKey = resolvePhotoFormBirdKey() || state.photoEditSourceKey || selected?.birdKey || "";
    setPhotoEditPreview(
      {
        src: previewSrc,
        alt: normalizeOptionalText(photoAltInput.value),
        rating: normalizePhotoRating(photoRatingInput.value),
        capturedOn: normalizeOptionalText(photoDateInput.value),
        country: normalizeOptionalText(photoCountryInput.value),
        state: normalizeOptionalText(photoStateInput.value),
        county: normalizeOptionalText(photoCountyInput.value),
        location: normalizeOptionalText(photoLocationInput.value),
      },
      { birdKey: previewBirdKey },
    );
  };

  const isEditedKey = (birdKey) => {
    const baseStatus = baseDraft.status[birdKey] || null;
    const currentStatus = draft.status[birdKey] || null;

    const basePhotos = getPhotosForKeyFromDraft(baseDraft, birdKey);
    const currentPhotos = getPhotosForKeyFromDraft(draft, birdKey);

    if (JSON.stringify(baseStatus) !== JSON.stringify(currentStatus)) {
      return true;
    }

    return JSON.stringify(basePhotos) !== JSON.stringify(currentPhotos);
  };

  const getPhotosForKeyFromDraft = (draftPayload, birdKey) => {
    return draftPayload.photos
      .filter((photo) => shared.normalizeKey(photo.birdKey) === birdKey)
      .map((photo) => ({
        birdKey,
        src: photo.src,
        alt: photo.alt,
        ...(normalizePhotoRating(photo.rating) ? { rating: normalizePhotoRating(photo.rating) } : {}),
        ...(photo.capturedOn ? { capturedOn: photo.capturedOn } : {}),
        ...(photo.country ? { country: photo.country } : {}),
        ...(photo.state ? { state: photo.state } : {}),
        ...(photo.county ? { county: photo.county } : {}),
        ...(photo.location ? { location: photo.location } : {}),
        ...(photo.trip ? { trip: photo.trip } : {}),
        ...(photo.notes ? { notes: photo.notes } : {}),
      }))
      .sort((a, b) => a.src.localeCompare(b.src));
  };

  const matchesFilters = (bird, status, photoCount, edited, photoRating) => {
    if (state.rarityMode === "common" && bird.rarityBand !== "common") {
      return false;
    }

    if (state.rarityMode === "rare" && bird.rarityBand !== "rare") {
      return false;
    }

    if (state.queryText && !bird.searchText.includes(state.queryText)) {
      return false;
    }

    if (state.filterMode === "seen" && !status.seen) {
      return false;
    }

    if (state.filterMode === "unseen" && status.seen) {
      return false;
    }

    if (state.filterMode === "photographed" && photoCount === 0) {
      return false;
    }

    if (state.filterMode === "needs-photo" && (!status.seen || photoCount > 0)) {
      return false;
    }

    if (state.filterMode === "rated" && photoRating < 1) {
      return false;
    }

    if (state.filterMode === "unrated" && photoRating >= 1) {
      return false;
    }

    if (state.filterMode === "edited" && !edited) {
      return false;
    }

    return true;
  };

  const renderList = () => {
    const fragment = document.createDocumentFragment();
    const visibleKeys = [];

    normalizedSpecies.forEach((bird) => {
      const status = getStatusForKey(bird.birdKey);
      const photos = getPhotosForKey(bird.birdKey);
      const photoCount = photos.length;
      const photoRating = highestPhotoRating(photos);
      const edited = isEditedKey(bird.birdKey);

      if (!matchesFilters(bird, status, photoCount, edited, photoRating)) {
        return;
      }

      visibleKeys.push(bird.birdKey);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "bird-admin-item";
      if (state.selectedKey === bird.birdKey) {
        button.classList.add("is-selected");
      }

      button.setAttribute("data-key", bird.birdKey);
      button.innerHTML = `
        <span class="bird-admin-item-title">${escapeHtml(bird.commonName)}</span>
        <span class="bird-admin-item-meta"><em>${escapeHtml(bird.scientificName)}</em></span>
        <span class="bird-admin-item-badges">
          <span class="bird-state-chip ${status.seen ? "is-on" : "is-off"}">${status.seen ? "Seen" : "Not Seen"}</span>
          <span class="bird-state-chip ${photoCount > 0 ? "is-on" : "is-off"}">${photoCount > 0 ? `${photoCount} Photo${photoCount > 1 ? "s" : ""}` : "No Photo"}</span>
          ${edited ? '<span class="bird-state-chip is-edit">Edited</span>' : ""}
        </span>
      `;
      fragment.appendChild(button);
    });

    listNode.innerHTML = "";
    listNode.appendChild(fragment);

    listCountNode.textContent = `${visibleKeys.length} visible`;
    emptyListNode.toggleAttribute("hidden", visibleKeys.length !== 0);

    if (visibleKeys.length && (!state.selectedKey || !visibleKeys.includes(state.selectedKey))) {
      state.selectedKey = visibleKeys[0];
      state.photoEditIndex = null;
    }

    if (!visibleKeys.length) {
      state.selectedKey = null;
      state.photoEditIndex = null;
    }
  };

  const renderEditor = () => {
    const selected = getSelectedSpecies();
    if (!selected) {
      emptyEditorNode.toggleAttribute("hidden", false);
      editorNode.toggleAttribute("hidden", true);
      return;
    }

    emptyEditorNode.toggleAttribute("hidden", true);
    editorNode.toggleAttribute("hidden", false);

    const status = getStatusForKey(selected.birdKey);
    commonNameNode.textContent = selected.commonName;
    scientificNameNode.textContent = selected.scientificName;
    taxonomyNode.textContent = `${selected.order} · ${selected.family} · ${selected.birdKey}`;
    abaCodeNode.textContent = selected.rarityBand === "world" ? "World Checklist" : `ABA ${selected.abaCode}`;

    seenInput.checked = Boolean(status.seen);
    firstSeenInput.value = status.firstSeenDate || "";
    notesInput.value = status.notes || "";

    if (state.photoEditIndex === null && !state.activeQueueItemId) {
      photoSpeciesInput.value = selected.birdKey;
      setPhotoEditPreview(null);
    }

    renderPhotoList(selected.birdKey);
    if (!photoCountryInput.value.trim()) {
      photoCountryInput.value = "United States";
    }
  };

  const resetPhotoForm = () => {
    photoForm.reset();
    const selected = getSelectedSpecies();
    photoSpeciesInput.value = selected?.birdKey || "";
    setPhotoRatingValue(0);
    state.photoDateManuallyEdited = false;
    state.photoRatingManuallyEdited = false;
    photoCountryInput.value = "United States";
    state.photoEditIndex = null;
    state.photoEditSourceKey = null;
    state.pendingUploadFiles = [];
    state.activeQueueItemId = null;
    photoSubmitButton.textContent = "Add Photo";
    photoCancelButton.toggleAttribute("hidden", true);
    photoSubmitButton.disabled = false;
    if (localFileInput instanceof HTMLInputElement) {
      localFileInput.disabled = false;
    }
    updateUploadProgress({ hidden: true, value: 0, label: "" });

    if (localFileInput instanceof HTMLInputElement) {
      localFileInput.value = "";
    }
    clearLocalPreview();
    setPhotoEditPreview(null);
    if (localFileHint instanceof HTMLElement) {
      localFileHint.textContent = defaultLocalFileHintText || "";
    }
  };

  const renderPhotoList = (birdKey) => {
    const photos = getPhotosForKey(birdKey);
    if (!photos.length) {
      photoListNode.innerHTML = '<p class="bird-empty-state">No photos recorded yet for this species.</p>';
      return;
    }

    const cards = photos
      .map((photo, index) => {
        const place = [photo.county || "", photo.state || "", photo.country || ""]
          .filter(Boolean)
          .join(", ");
        const meta = [formatPhotoRating(photo.rating), place, photo.location || "", photo.capturedOn || "", photo.trip || ""]
          .filter(Boolean)
          .join(" • ");
        return `
          <article class="bird-admin-photo-card" data-photo-index="${index}">
            <div class="bird-admin-photo-card-head">
              <strong>${escapeHtml(photo.src)}</strong>
              <div class="bird-admin-photo-card-actions">
                <button type="button" class="btn secondary" data-photo-edit="${index}">Edit</button>
                <button type="button" class="btn secondary" data-photo-remove="${index}">Remove</button>
              </div>
            </div>
            ${photo.alt ? `<p>${escapeHtml(photo.alt)}</p>` : '<p class="bird-admin-photo-empty-alt">No alt text</p>'}
            ${meta ? `<p class="bird-admin-photo-meta">${escapeHtml(meta)}</p>` : ""}
          </article>
        `;
      })
      .join("");

    photoListNode.innerHTML = cards;
  };

  const persistDraft = (message) => {
    canAdoptRemoteDraft = false;
    draft = shared.saveDraft(deepNormalizeDraft(draft));
    renderList();
    renderEditor();
    renderSuggestionLists();
    setStatusMessage(`${message}. Saved locally.`);
    scheduleRemoteSync(message);
  };

  const flushPendingRemoteSync = () => {
    if (!remoteSyncTimer) {
      return;
    }
    window.clearTimeout(remoteSyncTimer);
    remoteSyncTimer = null;
  };

  const selectBirdKey = (birdKey) => {
    state.selectedKey = birdKey;
    state.photoEditIndex = null;
    resetPhotoForm();
    renderList();
    renderEditor();
  };

  const buildPhotoRecord = (birdKey, src, alt, existingNotes) => ({
    birdKey,
    src,
    alt,
    ...(normalizePhotoRating(photoRatingInput.value) ? { rating: normalizePhotoRating(photoRatingInput.value) } : {}),
    ...(photoDateInput.value.trim() ? { capturedOn: photoDateInput.value.trim() } : {}),
    ...(photoCountryInput.value.trim() ? { country: photoCountryInput.value.trim() } : {}),
    ...(photoStateInput.value.trim() ? { state: photoStateInput.value.trim() } : {}),
    ...(photoCountyInput.value.trim() ? { county: photoCountyInput.value.trim() } : {}),
    ...(photoLocationInput.value.trim() ? { location: photoLocationInput.value.trim() } : {}),
    ...(photoTripInput.value.trim() ? { trip: photoTripInput.value.trim() } : {}),
    ...(existingNotes ? { notes: existingNotes } : {}),
  });

  const buildPhotoRecordFromQueueItem = (item, src) => ({
    birdKey: item.birdKey,
    src,
    alt: normalizeOptionalText(item.alt),
    ...(normalizePhotoRating(item.rating) ? { rating: normalizePhotoRating(item.rating) } : {}),
    ...(normalizeOptionalText(item.capturedOn) ? { capturedOn: normalizeOptionalText(item.capturedOn) } : {}),
    ...(normalizeOptionalText(item.country) ? { country: normalizeOptionalText(item.country) } : {}),
    ...(normalizeOptionalText(item.state) ? { state: normalizeOptionalText(item.state) } : {}),
    ...(normalizeOptionalText(item.county) ? { county: normalizeOptionalText(item.county) } : {}),
    ...(normalizeOptionalText(item.location) ? { location: normalizeOptionalText(item.location) } : {}),
    ...(normalizeOptionalText(item.trip) ? { trip: normalizeOptionalText(item.trip) } : {}),
    ...(normalizeOptionalText(item.notes) ? { notes: normalizeOptionalText(item.notes) } : {}),
  });

  const onPhotoSubmit = async () => {
    const selected = getSelectedSpecies();
    if (!selected) {
      return;
    }
    const targetBirdKey = resolvePhotoFormBirdKey();
    if (!targetBirdKey) {
      setStatusMessage("Choose a valid species (bird key or name) before saving this photo.");
      return;
    }

    const manualSrc = photoSrcInput.value.trim();
    const alt = photoAltInput.value.trim();
    const uploadQueue =
      state.pendingUploadFiles.length > 0
        ? [...state.pendingUploadFiles]
        : localFileInput instanceof HTMLInputElement && localFileInput.files
          ? Array.from(localFileInput.files)
          : [];
    const isEdit = state.photoEditIndex !== null;
    const sourceBirdKey = isEdit ? state.photoEditSourceKey || selected.birdKey : targetBirdKey;
    const sourcePhotos = getPhotosForKey(sourceBirdKey);
    const existingPhoto = isEdit ? sourcePhotos[state.photoEditIndex] : null;
    if (isEdit && !existingPhoto) {
      setStatusMessage("The photo being edited no longer exists in the selected species.");
      resetPhotoForm();
      return;
    }
    const existingNotes = existingPhoto?.notes || "";
    const formFieldSnapshot = {
      country: normalizeOptionalText(photoCountryInput.value),
      state: normalizeOptionalText(photoStateInput.value),
      county: normalizeOptionalText(photoCountyInput.value),
      location: normalizeOptionalText(photoLocationInput.value),
      trip: normalizeOptionalText(photoTripInput.value),
    };

    if (uploadQueue.length > 0) {
      if (isEdit && uploadQueue.length > 1) {
        setStatusMessage("Edit mode supports one upload at a time. Remove extra queued files or add as new photos.");
        return;
      }
      if (!remoteAvailable || typeof shared.uploadRemotePhotoFile !== "function") {
        setStatusMessage("Local file selected, but Firebase Storage is unavailable in this environment.");
        return;
      }

      const authed = await ensureRemoteSession(true);
      remoteReady = remoteReady || authed;
      if (!authed) {
        setStatusMessage("Sign-in is required to upload files to Firebase Storage.");
        return;
      }

      if (typeof shared.probeRemoteStorage === "function") {
        const probe = await shared.probeRemoteStorage();
        if (!probe?.ok) {
          setStatusMessage(`Firebase Storage unavailable: ${probe?.message || "unknown error"}`);
          return;
        }
      }

      const totalUploads = uploadQueue.length;
      const uploadedSources = [];
      setUploadUiBusy(true);
      updateUploadProgress({
        hidden: false,
        value: 0,
        label: `Preparing ${totalUploads} image${totalUploads > 1 ? "s" : ""} for upload...`,
      });

      try {
        for (let index = 0; index < uploadQueue.length; index += 1) {
          const sourceFile = uploadQueue[index];
          const uploadOrdinal = `${index + 1}/${totalUploads}`;
          setStatusMessage(`Preparing image ${uploadOrdinal} for Firebase upload...`);
          updateUploadProgress({
            hidden: false,
            value: Math.round((index / totalUploads) * 100),
            label: `Preparing image ${uploadOrdinal}: ${sourceFile.name}`,
          });

          const preparedFile =
            typeof shared.prepareRemotePhotoUploadFile === "function"
              ? await shared.prepareRemotePhotoUploadFile(sourceFile)
              : sourceFile;

          setStatusMessage(`Uploading image ${uploadOrdinal} to Firebase Storage...`);
          const uploaded = await shared.uploadRemotePhotoFile({
            file: preparedFile,
            birdKey: targetBirdKey,
            onProgress: ({ bytesTransferred, totalBytes }) => {
              const safeTransferred = Math.max(0, Number(bytesTransferred) || 0);
              const safeTotal = Math.max(0, Number(totalBytes) || 0);
              const fileRatio =
                safeTotal > 0 ? Math.min(1, safeTransferred / safeTotal) : safeTransferred > 0 ? 0.01 : 0;
              const filePercent =
                safeTransferred > 0 ? Math.max(1, Math.round(fileRatio * 100)) : 0;
              const overallRatio = Math.min(1, (index + fileRatio) / totalUploads);
              const labelSuffix =
                safeTotal > 0
                  ? `${filePercent}% (${formatBytes(safeTransferred)} / ${formatBytes(safeTotal)})`
                  : `${filePercent}%`;
              updateUploadProgress({
                hidden: false,
                value: Math.round(overallRatio * 100),
                label: `Uploading image ${uploadOrdinal}: ${labelSuffix}`,
              });
            },
          });
          uploadedSources.push(uploaded.src);
        }
      } catch (error) {
        updateUploadProgress({ hidden: true, value: 0, label: "" });
        setStatusMessage(`Photo upload failed: ${formatErrorMessage(error)}`);
        return;
      } finally {
        setUploadUiBusy(false);
      }

      if (!uploadedSources.length) {
        return;
      }

      if (isEdit) {
        const updatedPhoto = buildPhotoRecord(targetBirdKey, uploadedSources[0], alt, existingNotes);
        const nextSourcePhotos = [...sourcePhotos];
        nextSourcePhotos.splice(state.photoEditIndex, 1);

        if (sourceBirdKey === targetBirdKey) {
          nextSourcePhotos.splice(state.photoEditIndex, 0, updatedPhoto);
          setPhotosForKey(targetBirdKey, nextSourcePhotos);
        } else {
          setPhotosForKey(sourceBirdKey, nextSourcePhotos);
          const targetPhotos = getPhotosForKey(targetBirdKey);
          targetPhotos.push(updatedPhoto);
          setPhotosForKey(targetBirdKey, targetPhotos);
        }
      } else {
        const targetPhotos = getPhotosForKey(targetBirdKey);
        uploadedSources.forEach((src) => {
          targetPhotos.push(buildPhotoRecord(targetBirdKey, src, alt, ""));
        });
        setPhotosForKey(targetBirdKey, targetPhotos);
      }

      state.selectedKey = targetBirdKey;
      if (state.activeQueueItemId && state.bulkUploadQueue.some((item) => item.id === state.activeQueueItemId)) {
        const activeItem = state.bulkUploadQueue.find((item) => item.id === state.activeQueueItemId);
        revokeQueuePreviewUrl(activeItem);
        state.bulkUploadQueue = state.bulkUploadQueue.filter((item) => item.id !== state.activeQueueItemId);
        state.activeQueueItemId = null;
        renderBulkQueue();
      }
      rememberPhotoRecordFields(formFieldSnapshot);
      renderSuggestionLists();
      resetPhotoForm();
      persistDraft(
        isEdit
          ? "Photo updated in browser draft"
          : `Added ${uploadedSources.length} photo${uploadedSources.length > 1 ? "s" : ""} to browser draft`,
      );
      primeNextQueueItemInEditor();
      flushPendingRemoteSync();
      await syncRemoteDraft("Photo metadata update", { interactive: false });
      return;
    }

    if (!manualSrc) {
      setStatusMessage("Enter a photo URL/path or queue at least one local file before adding.");
      return;
    }

    const nextPhoto = buildPhotoRecord(targetBirdKey, manualSrc, alt, existingNotes);
    if (!isEdit) {
      const targetPhotos = getPhotosForKey(targetBirdKey);
      targetPhotos.push(nextPhoto);
      setPhotosForKey(targetBirdKey, targetPhotos);
    } else {
      const nextSourcePhotos = [...sourcePhotos];
      nextSourcePhotos.splice(state.photoEditIndex, 1);
      if (sourceBirdKey === targetBirdKey) {
        nextSourcePhotos.splice(state.photoEditIndex, 0, nextPhoto);
        setPhotosForKey(targetBirdKey, nextSourcePhotos);
      } else {
        setPhotosForKey(sourceBirdKey, nextSourcePhotos);
        const targetPhotos = getPhotosForKey(targetBirdKey);
        targetPhotos.push(nextPhoto);
        setPhotosForKey(targetBirdKey, targetPhotos);
      }
    }

    state.selectedKey = targetBirdKey;
    if (state.activeQueueItemId && state.bulkUploadQueue.some((item) => item.id === state.activeQueueItemId)) {
      const activeItem = state.bulkUploadQueue.find((item) => item.id === state.activeQueueItemId);
      revokeQueuePreviewUrl(activeItem);
      state.bulkUploadQueue = state.bulkUploadQueue.filter((item) => item.id !== state.activeQueueItemId);
      state.activeQueueItemId = null;
      renderBulkQueue();
    }
    rememberPhotoRecordFields(nextPhoto);
    renderSuggestionLists();
    photoSrcInput.value = manualSrc;
    resetPhotoForm();
    persistDraft(isEdit ? "Photo updated in browser draft" : "Photo added to browser draft");
    primeNextQueueItemInEditor();
    flushPendingRemoteSync();
    await syncRemoteDraft("Photo metadata update", { interactive: false });
    reportIfPhotoPathMissing(manualSrc);
  };

  const onPhotoListClick = (target) => {
    const selected = getSelectedSpecies();
    if (!selected) {
      return;
    }

    const editNode = target.closest("[data-photo-edit]");
    if (editNode instanceof HTMLElement) {
      const index = Number(editNode.getAttribute("data-photo-edit"));
      const photos = getPhotosForKey(selected.birdKey);
      const photo = photos[index];
      if (!photo) {
        return;
      }

      state.photoEditIndex = index;
      state.photoEditSourceKey = selected.birdKey;
      photoSpeciesInput.value = selected.birdKey;
      photoSrcInput.value = photo.src;
      photoAltInput.value = photo.alt;
      photoDateInput.value = photo.capturedOn || "";
      setPhotoRatingValue(photo.rating);
      state.photoDateManuallyEdited = true;
      state.photoRatingManuallyEdited = true;
      photoCountryInput.value = photo.country || "";
      photoStateInput.value = photo.state || "";
      photoCountyInput.value = photo.county || "";
      photoLocationInput.value = photo.location || "";
      photoTripInput.value = photo.trip || "";
      setPhotoEditPreview(photo, { birdKey: selected.birdKey });
      photoSubmitButton.textContent = "Update Photo";
      photoCancelButton.toggleAttribute("hidden", false);
      return;
    }

    const removeNode = target.closest("[data-photo-remove]");
    if (removeNode instanceof HTMLElement) {
      const index = Number(removeNode.getAttribute("data-photo-remove"));
      const photos = getPhotosForKey(selected.birdKey);
      if (!photos[index]) {
        return;
      }

      photos.splice(index, 1);
      setPhotosForKey(selected.birdKey, photos);
      resetPhotoForm();
      persistDraft("Photo removed from browser draft");
    }
  };

  const downloadTextFile = (fileName, textContent) => {
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const exportStatusTs = () => {
    const cleaned = deepNormalizeDraft(draft);
    const output = shared.draftToStatusTs(cleaned.status);
    downloadTextFile("personalStatus.ts", output);
    setStatusMessage("Downloaded personalStatus.ts");
  };

  const exportPhotosTs = () => {
    const cleaned = deepNormalizeDraft(draft);
    const output = shared.draftToPhotosTs(cleaned.photos);
    downloadTextFile("personalPhotos.ts", output);
    setStatusMessage("Downloaded personalPhotos.ts");
  };

  const sanitizeFileName = (name) => {
    const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    return cleaned.replace(/-+/g, "-").replace(/^-|-$/g, "") || "photo.jpg";
  };

  const clearLocalPreview = () => {
    if (!(localPreview instanceof HTMLImageElement)) {
      return;
    }
    if (localPreviewObjectUrl) {
      URL.revokeObjectURL(localPreviewObjectUrl);
      localPreviewObjectUrl = null;
    }
    localPreview.removeAttribute("src");
    localPreview.toggleAttribute("hidden", true);
  };

  const setPendingUploadFiles = (files, options = {}) => {
    const queue = Array.isArray(files) ? files.filter((file) => file instanceof window.File) : [];
    state.pendingUploadFiles = queue;

    if (!queue.length) {
      updateUploadProgress({ hidden: true, value: 0, label: "" });
      if (options.resetHint !== false && localFileHint instanceof HTMLElement) {
        localFileHint.textContent = defaultLocalFileHintText || "";
      }
      clearLocalPreview();
      return;
    }

    const file = queue[0];
    if (localPreview instanceof HTMLImageElement) {
      if (localPreviewObjectUrl) {
        URL.revokeObjectURL(localPreviewObjectUrl);
        localPreviewObjectUrl = null;
      }
      localPreviewObjectUrl = URL.createObjectURL(file);
      localPreview.src = localPreviewObjectUrl;
      localPreview.toggleAttribute("hidden", false);
    }

    updateLocalFileHint(queue);
    const detectMetadata = options.detectMetadata !== false;
    if (!detectMetadata || state.photoEditIndex !== null || state.activeQueueItemId) {
      return;
    }

    const applyDetectedMetadata = (metadata) => {
      if (state.pendingUploadFiles[0] !== file) {
        return;
      }

      const detectedDate = normalizeOptionalText(metadata?.capturedOn);
      const detectedRating = normalizePhotoRating(metadata?.rating);
      if (!state.photoDateManuallyEdited && detectedDate) {
        photoDateInput.value = detectedDate;
      }
      if (!state.photoRatingManuallyEdited && detectedRating > 0) {
        setPhotoRatingValue(detectedRating);
      }
    };

    if (typeof shared.extractPhotoMetadata === "function") {
      void shared.extractPhotoMetadata(file).then(applyDetectedMetadata);
      return;
    }

    void Promise.all([
      typeof shared.extractPhotoTakenDate === "function" ? shared.extractPhotoTakenDate(file) : Promise.resolve(""),
      typeof shared.extractPhotoRating === "function" ? shared.extractPhotoRating(file) : Promise.resolve(0),
    ]).then(([capturedOn, rating]) => applyDetectedMetadata({ capturedOn, rating }));
  };

  const updateLocalFileHint = (files) => {
    const selected = getSelectedSpecies();
    const targetBirdKey = resolvePhotoFormBirdKey() || selected?.birdKey || "";
    if (!targetBirdKey || !localFileHint) {
      return;
    }

    const queue = Array.isArray(files) ? files : [];
    if (!queue.length) {
      localFileHint.textContent = defaultLocalFileHintText || "";
      return;
    }

    const totalBytes = queue.reduce((sum, file) => sum + Number(file?.size || 0), 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

    if (queue.length === 1) {
      const safeName = sanitizeFileName(queue[0].name || "photo.jpg");
      const suggestedPath = `bird-atlas-photos/${targetBirdKey}/${safeName}`;
      photoSrcInput.value = `/${suggestedPath}`;
      localFileHint.textContent =
        `Queued 1 file (~${totalMb} MB). It will be downsampled to max 2200px, then uploaded to ` +
        `${suggestedPath} when you click Add Photo.`;
    } else {
      photoSrcInput.value = "";
      localFileHint.textContent =
        `Queued ${queue.length} files (~${totalMb} MB total). They will be downsampled to max 2200px and ` +
        "uploaded sequentially when you click Add Photo.";
    }

    if (!photoCountryInput.value.trim()) {
      photoCountryInput.value = "United States";
    }
  };

  const renderBulkQueue = () => {
    if (!supportsBulkUpload) {
      return;
    }
    bulkQueueNode.textContent = "";
    if (!state.bulkUploadQueue.length) {
      const empty = document.createElement("p");
      empty.className = "bird-empty-state";
      empty.textContent = "Bulk queue is empty.";
      bulkQueueNode.appendChild(empty);
      return;
    }

    const summary = document.createElement("p");
    summary.className = "bird-admin-bulk-queue-summary";
    const totalBytes = state.bulkUploadQueue.reduce((sum, item) => sum + Number(item?.file?.size || 0), 0);
    summary.textContent = `${state.bulkUploadQueue.length} queued • ${formatBytes(totalBytes)}`;
    bulkQueueNode.appendChild(summary);

    state.bulkUploadQueue.forEach((item) => {
      const species = speciesByKey.get(item.birdKey || "");
      const row = document.createElement("article");
      row.className = "bird-admin-bulk-row";
      if (!species) {
        row.classList.add("is-invalid");
      }
      if (state.activeQueueItemId === item.id) {
        row.classList.add("is-active");
      }
      row.setAttribute("data-queue-id", item.id);
      row.innerHTML = `
        <header class="bird-admin-bulk-row-head">
          <div>
            <strong>${escapeHtml(item.file.name)}</strong>
            <p>${formatBytes(item.file.size)}${item.detectingMetadata ? " • reading metadata..." : ""}</p>
          </div>
          <div class="bird-admin-bulk-row-actions">
            <button class="btn secondary" type="button" data-queue-load="${item.id}">Load</button>
            <button class="btn secondary" type="button" data-queue-autofill="${item.id}">Use Last</button>
            <button class="btn secondary" type="button" data-queue-remove="${item.id}">Remove</button>
          </div>
        </header>
        <div class="bird-admin-bulk-row-body">
          <figure class="bird-admin-bulk-thumb">
            ${
              item.previewUrl
                ? `<img src="${escapeHtml(item.previewUrl)}" alt="Preview for ${escapeHtml(item.file.name)}" loading="lazy" decoding="async" />`
                : '<div class="bird-admin-bulk-thumb-empty">No preview</div>'
            }
          </figure>
          <div class="bird-admin-bulk-row-grid">
            <label>
              <span>Species Key</span>
              <input
                type="text"
                value="${escapeHtml(item.birdKeyInput || item.birdKey || "")}"
                data-queue-field="birdKeyInput"
                data-queue-id="${item.id}"
                list="bird-admin-species-suggestions"
                placeholder="sonspa"
              />
            </label>
            <label>
              <span>Captured On</span>
              <input type="date" value="${escapeHtml(item.capturedOn || "")}" data-queue-field="capturedOn" data-queue-id="${item.id}" />
            </label>
            <label>
              <span>Photo Rating</span>
              <select data-queue-field="rating" data-queue-id="${item.id}">
                ${buildRatingOptionsMarkup(item.rating)}
              </select>
            </label>
            <label>
              <span>Alt Text</span>
              <input type="text" value="${escapeHtml(item.alt || "")}" data-queue-field="alt" data-queue-id="${item.id}" />
            </label>
            <label>
              <span>Country</span>
              <input
                type="text"
                value="${escapeHtml(item.country || "")}"
                data-queue-field="country"
                data-queue-id="${item.id}"
                list="bird-admin-country-suggestions"
              />
            </label>
            <label>
              <span>State / Province</span>
              <input
                type="text"
                value="${escapeHtml(item.state || "")}"
                data-queue-field="state"
                data-queue-id="${item.id}"
                list="bird-admin-state-suggestions"
              />
            </label>
            <label>
              <span>County</span>
              <input
                type="text"
                value="${escapeHtml(item.county || "")}"
                data-queue-field="county"
                data-queue-id="${item.id}"
                list="bird-admin-county-suggestions"
              />
            </label>
            <label>
              <span>Location</span>
              <input
                type="text"
                value="${escapeHtml(item.location || "")}"
                data-queue-field="location"
                data-queue-id="${item.id}"
                list="bird-admin-location-suggestions"
              />
            </label>
            <label>
              <span>Trip</span>
              <input
                type="text"
                value="${escapeHtml(item.trip || "")}"
                data-queue-field="trip"
                data-queue-id="${item.id}"
                list="bird-admin-trip-suggestions"
              />
            </label>
            <label class="bird-admin-bulk-row-notes">
              <span>Notes</span>
              <input type="text" value="${escapeHtml(item.notes || "")}" data-queue-field="notes" data-queue-id="${item.id}" />
            </label>
          </div>
        </div>
        <p class="bird-admin-bulk-row-meta">
          ${species ? `${escapeHtml(species.commonName)} (${escapeHtml(species.birdKey)})` : "Set a valid species key before upload."}
        </p>
      `;
      bulkQueueNode.appendChild(row);
    });
  };

  const applyAutofillToQueueItem = (itemId) => {
    const item = state.bulkUploadQueue.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    suggestionFields.forEach((field) => {
      if (!normalizeOptionalText(item[field])) {
        item[field] = getDefaultFieldValue(field, item[field]);
      }
    });

    renderBulkQueue();
  };

  const loadQueueItemIntoEditor = (itemId, options = {}) => {
    const item = state.bulkUploadQueue.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    if (!item.birdKey || !speciesByKey.has(item.birdKey)) {
      setStatusMessage(`Set a valid species key for ${item.file.name} before loading.`);
      return;
    }

    if (state.selectedKey !== item.birdKey) {
      selectBirdKey(item.birdKey);
    }

    photoAltInput.value = normalizeOptionalText(item.alt);
    photoDateInput.value = normalizeOptionalText(item.capturedOn);
    setPhotoRatingValue(item.rating);
    state.photoDateManuallyEdited = true;
    state.photoRatingManuallyEdited = true;
    photoSpeciesInput.value = item.birdKey || "";
    photoCountryInput.value = normalizeOptionalText(item.country) || "United States";
    photoStateInput.value = normalizeOptionalText(item.state);
    photoCountyInput.value = normalizeOptionalText(item.county);
    photoLocationInput.value = normalizeOptionalText(item.location);
    photoTripInput.value = normalizeOptionalText(item.trip);
    photoSrcInput.value = "";
    state.photoEditIndex = null;
    state.photoEditSourceKey = null;
    state.activeQueueItemId = item.id;
    if (localFileInput instanceof HTMLInputElement) {
      localFileInput.value = "";
    }
    setPendingUploadFiles([item.file], { detectMetadata: false });
    renderBulkQueue();
    if (!options.silent) {
      const queueIndex = state.bulkUploadQueue.findIndex((entry) => entry.id === item.id);
      setStatusMessage(`Loaded queued photo ${queueIndex + 1}/${state.bulkUploadQueue.length} into species uploader.`);
    }
  };

  const primeNextQueueItemInEditor = (options = {}) => {
    if (!state.bulkUploadQueue.length) {
      return;
    }

    if (state.activeQueueItemId) {
      const stillExists = state.bulkUploadQueue.some((entry) => entry.id === state.activeQueueItemId);
      if (stillExists) {
        return;
      }
      state.activeQueueItemId = null;
    }

    if (!options.force && (state.pendingUploadFiles.length > 0 || state.photoEditIndex !== null || photoSrcInput.value.trim())) {
      return;
    }

    const nextItem = state.bulkUploadQueue.find((entry) => entry.birdKey && speciesByKey.has(entry.birdKey));
    if (!nextItem) {
      return;
    }

    loadQueueItemIntoEditor(nextItem.id, { silent: Boolean(options.silent) });
  };

  const onBulkQueueInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
      return;
    }

    const field = target.getAttribute("data-queue-field");
    const itemId = target.getAttribute("data-queue-id");
    if (!field || !itemId) {
      return;
    }

    const item = state.bulkUploadQueue.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    if (field === "birdKeyInput") {
      item.birdKeyInput = normalizeOptionalText(target.value);
      item.birdKey = normalizeQueueBirdKey(item.birdKeyInput);
      if (event.type === "change") {
        if (item.birdKey) {
          item.birdKeyInput = item.birdKey;
        }
        renderBulkQueue();
      }
      return;
    }

    if (field === "capturedOn") {
      item.capturedOn = normalizeOptionalText(target.value);
      item.capturedOnTouched = true;
      return;
    }

    if (field === "rating") {
      item.rating = normalizePhotoRating(target.value);
      item.ratingTouched = true;
      return;
    }

    item[field] = normalizeOptionalText(target.value);
    if (suggestionFields.includes(field) && event.type === "change") {
      rememberFieldValue(field, item[field]);
    }
  };

  const onBulkQueueClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const removeNode = target.closest("[data-queue-remove]");
    if (removeNode instanceof HTMLElement) {
      const itemId = String(removeNode.getAttribute("data-queue-remove") || "");
      const removedActiveItem = state.activeQueueItemId === itemId;
      const removedItem = state.bulkUploadQueue.find((item) => item.id === itemId);
      revokeQueuePreviewUrl(removedItem);
      state.bulkUploadQueue = state.bulkUploadQueue.filter((item) => item.id !== itemId);
      if (removedActiveItem) {
        state.activeQueueItemId = null;
        setPendingUploadFiles([]);
      }
      renderBulkQueue();
      renderSuggestionLists();
      primeNextQueueItemInEditor({ silent: true });
      return;
    }

    const loadNode = target.closest("[data-queue-load]");
    if (loadNode instanceof HTMLElement) {
      const itemId = String(loadNode.getAttribute("data-queue-load") || "");
      loadQueueItemIntoEditor(itemId);
      return;
    }

    const autofillNode = target.closest("[data-queue-autofill]");
    if (autofillNode instanceof HTMLElement) {
      const itemId = String(autofillNode.getAttribute("data-queue-autofill") || "");
      applyAutofillToQueueItem(itemId);
    }
  };

  const enrichQueueMetadataFromFile = async (itemId, file) => {
    const item = state.bulkUploadQueue.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    item.detectingMetadata = true;
    renderBulkQueue();

    let detectedMetadata = { capturedOn: "", rating: 0 };
    if (typeof shared.extractPhotoMetadata === "function") {
      try {
        detectedMetadata = await shared.extractPhotoMetadata(file);
      } catch (_error) {
        detectedMetadata = { capturedOn: "", rating: 0 };
      }
    } else {
      try {
        const [capturedOn, rating] = await Promise.all([
          typeof shared.extractPhotoTakenDate === "function" ? shared.extractPhotoTakenDate(file) : Promise.resolve(""),
          typeof shared.extractPhotoRating === "function" ? shared.extractPhotoRating(file) : Promise.resolve(0),
        ]);
        detectedMetadata = { capturedOn, rating };
      } catch (_error) {
        detectedMetadata = { capturedOn: "", rating: 0 };
      }
    }

    const queueItem = state.bulkUploadQueue.find((entry) => entry.id === itemId);
    if (!queueItem) {
      return;
    }

    queueItem.detectingMetadata = false;
    const normalizedDate = normalizeOptionalText(detectedMetadata?.capturedOn);
    const normalizedRating = normalizePhotoRating(detectedMetadata?.rating);
    if (!queueItem.capturedOnTouched && normalizedDate) {
      queueItem.capturedOn = normalizedDate;
    }
    if (!queueItem.ratingTouched && normalizedRating > 0) {
      queueItem.rating = normalizedRating;
    }
    renderBulkQueue();
  };

  const enqueueBulkFiles = async (files) => {
    if (!Array.isArray(files) || !files.length || isBulkUploading) {
      return;
    }

    const existingSignatures = new Set(state.bulkUploadQueue.map((item) => item.signature));
    const newItems = [];
    files.forEach((file) => {
      if (!(file instanceof window.File)) {
        return;
      }
      if (!String(file.type || "").startsWith("image/")) {
        return;
      }
      const signature = buildQueueSignature(file);
      if (existingSignatures.has(signature)) {
        return;
      }
      existingSignatures.add(signature);
      newItems.push(createQueueItem(file));
    });

    if (!newItems.length) {
      return;
    }

    state.bulkUploadQueue.push(...newItems);
    renderBulkQueue();
    renderSuggestionLists();
    setStatusMessage(`Queued ${newItems.length} image${newItems.length > 1 ? "s" : ""} for bulk upload.`);

    await Promise.all(newItems.map((item) => enrichQueueMetadataFromFile(item.id, item.file)));
    primeNextQueueItemInEditor({ silent: true });
  };

  const uploadBulkQueue = async () => {
    if (!supportsBulkUpload) {
      setStatusMessage("Bulk upload controls are unavailable in this build.");
      return;
    }
    if (isBulkUploading) {
      return;
    }

    if (!state.bulkUploadQueue.length) {
      setStatusMessage("Queue at least one image before starting bulk upload.");
      return;
    }

    const invalidItem = state.bulkUploadQueue.find((item) => !item.birdKey || !speciesByKey.has(item.birdKey));
    if (invalidItem) {
      setStatusMessage(`Set a valid species key for ${invalidItem.file.name} before uploading.`);
      return;
    }

    if (!remoteAvailable || typeof shared.uploadRemotePhotoFile !== "function") {
      setStatusMessage("Firebase Storage is unavailable in this environment.");
      return;
    }

    const authed = await ensureRemoteSession(true);
    remoteReady = remoteReady || authed;
    if (!authed) {
      setStatusMessage("Sign-in is required to upload queued files to Firebase.");
      return;
    }

    if (typeof shared.probeRemoteStorage === "function") {
      const probe = await shared.probeRemoteStorage();
      if (!probe?.ok) {
        setStatusMessage(`Firebase Storage unavailable: ${probe?.message || "unknown error"}`);
        return;
      }
    }

    const queue = [...state.bulkUploadQueue];
    const uploadedRecords = [];
    isBulkUploading = true;
    setBulkUploadBusy(true);
    updateBulkUploadProgress({
      hidden: false,
      value: 0,
      label: `Preparing ${queue.length} image${queue.length > 1 ? "s" : ""}...`,
    });

    try {
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        const ordinal = `${index + 1}/${queue.length}`;
        updateBulkUploadProgress({
          hidden: false,
          value: Math.round((index / queue.length) * 100),
          label: `Preparing image ${ordinal}: ${item.file.name}`,
        });

        const preparedFile =
          typeof shared.prepareRemotePhotoUploadFile === "function"
            ? await shared.prepareRemotePhotoUploadFile(item.file)
            : item.file;

        const uploaded = await shared.uploadRemotePhotoFile({
          file: preparedFile,
          birdKey: item.birdKey,
          onProgress: ({ bytesTransferred, totalBytes }) => {
            const transferred = Math.max(0, Number(bytesTransferred) || 0);
            const total = Math.max(0, Number(totalBytes) || 0);
            const ratio = total > 0 ? Math.min(1, transferred / total) : transferred > 0 ? 0.01 : 0;
            const overall = Math.min(1, (index + ratio) / queue.length);
            const labelSuffix =
              total > 0
                ? `${Math.round(ratio * 100)}% (${formatBytes(transferred)} / ${formatBytes(total)})`
                : `${Math.round(ratio * 100)}%`;
            updateBulkUploadProgress({
              hidden: false,
              value: Math.round(overall * 100),
              label: `Uploading image ${ordinal}: ${labelSuffix}`,
            });
          },
        });

        uploadedRecords.push(buildPhotoRecordFromQueueItem(item, uploaded.src));
      }
    } catch (error) {
      updateBulkUploadProgress({ hidden: true, value: 0, label: "" });
      setStatusMessage(`Bulk upload failed: ${formatErrorMessage(error)}`);
      isBulkUploading = false;
      setBulkUploadBusy(false);
      return;
    }

    const photosByBird = new Map();
    uploadedRecords.forEach((record) => {
      const key = record.birdKey;
      if (!photosByBird.has(key)) {
        photosByBird.set(key, getPhotosForKey(key));
      }
      photosByBird.get(key).push(record);
      rememberPhotoRecordFields(record);
    });
    photosByBird.forEach((photos, birdKey) => {
      setPhotosForKey(birdKey, photos);
    });

    const firstUploaded = uploadedRecords[0];
    if (firstUploaded?.birdKey) {
      state.selectedKey = firstUploaded.birdKey;
      state.photoEditIndex = null;
    }

    clearBulkQueue({ clearEditorUpload: true });
    if (bulkFileInput instanceof HTMLInputElement) {
      bulkFileInput.value = "";
    }
    renderBulkQueue();
    renderSuggestionLists();
    updateBulkUploadProgress({ hidden: true, value: 0, label: "" });
    isBulkUploading = false;
    setBulkUploadBusy(false);

    persistDraft(`Added ${uploadedRecords.length} photo${uploadedRecords.length > 1 ? "s" : ""} from bulk queue`);
    flushPendingRemoteSync();
    await syncRemoteDraft("Bulk upload metadata update", { interactive: false });
  };

  const reportIfPhotoPathMissing = (src) => {
    if (!src.startsWith("/assets/")) {
      return;
    }

    fetch(src, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (response.ok) {
          return;
        }

        setStatusMessage(`Photo record saved, but file is not reachable at ${src}. Copy it into /public${src}.`);
      })
      .catch(() => {
        setStatusMessage(`Photo record saved, but file is not reachable at ${src}. Copy it into /public${src}.`);
      });
  };

  listNode.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const item = target.closest("[data-key]");
    if (!(item instanceof HTMLElement)) {
      return;
    }

    const birdKey = item.getAttribute("data-key");
    if (!birdKey) {
      return;
    }

    selectBirdKey(birdKey);
  });

  rarityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-admin-rarity");
      if (!mode) return;

      state.rarityMode = mode;
      rarityButtons.forEach((node) => node.classList.toggle("is-active", node === button));
      renderList();
      renderEditor();
    });
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-admin-filter");
      if (!mode) return;

      state.filterMode = mode;
      filterButtons.forEach((node) => node.classList.toggle("is-active", node === button));
      renderList();
      renderEditor();
    });
  });

  if (hasSearchControl) {
    searchInput.addEventListener("input", () => {
      state.queryText = normalizeText(searchInput.value);
      renderList();
      renderEditor();
    });
  }

  const onStatusChange = () => {
    upsertStatusForSelected();
    persistDraft("Status saved to local draft");
  };

  seenInput.addEventListener("change", onStatusChange);
  firstSeenInput.addEventListener("change", onStatusChange);
  notesInput.addEventListener("change", onStatusChange);

  photoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await onPhotoSubmit();
  });

  photoCancelButton.addEventListener("click", () => {
    resetPhotoForm();
  });

  photoListNode.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    onPhotoListClick(target);
  });

  if (localFileInput instanceof HTMLInputElement) {
    localFileInput.addEventListener("change", () => {
      const files = localFileInput.files ? Array.from(localFileInput.files) : [];
      state.activeQueueItemId = null;
      setPendingUploadFiles(files);
    });
  }

  photoSpeciesInput.addEventListener("input", () => {
    if (state.pendingUploadFiles.length) {
      updateLocalFileHint(state.pendingUploadFiles);
    }
    refreshPhotoEditPreviewFromForm();
  });

  photoSpeciesInput.addEventListener("change", () => {
    const normalized = normalizeQueueBirdKey(photoSpeciesInput.value);
    if (normalized) {
      photoSpeciesInput.value = normalized;
    }
    if (state.pendingUploadFiles.length) {
      updateLocalFileHint(state.pendingUploadFiles);
    }
    refreshPhotoEditPreviewFromForm();
  });

  [photoSrcInput, photoAltInput, photoDateInput, photoRatingInput, photoLocationInput].forEach((input) => {
    input.addEventListener("input", refreshPhotoEditPreviewFromForm);
    input.addEventListener("change", refreshPhotoEditPreviewFromForm);
  });

  photoDateInput.addEventListener("input", () => {
    state.photoDateManuallyEdited = true;
  });
  photoDateInput.addEventListener("change", () => {
    state.photoDateManuallyEdited = true;
  });

  const focusPhotoRatingStarButton = (value) => {
    const safeValue = Math.min(5, Math.max(1, normalizePhotoRating(value)));
    const nextButton = photoRatingStarButtons.find((node) => {
      if (!(node instanceof HTMLElement)) {
        return false;
      }
      return normalizePhotoRating(node.getAttribute("data-admin-photo-rating-star")) === safeValue;
    });
    if (nextButton instanceof HTMLElement) {
      nextButton.focus();
    }
  };

  photoRatingStarButtons.forEach((node) => {
    if (!(node instanceof HTMLButtonElement)) {
      return;
    }

    node.addEventListener("click", () => {
      const value = node.getAttribute("data-admin-photo-rating-star");
      state.photoRatingManuallyEdited = true;
      setPhotoRatingValue(value, { allowToggleOff: true });
      refreshPhotoEditPreviewFromForm();
    });

    node.addEventListener("keydown", (event) => {
      const current = normalizePhotoRating(photoRatingInput.value);
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = Math.min(5, current + 1);
        state.photoRatingManuallyEdited = true;
        setPhotoRatingValue(next);
        focusPhotoRatingStarButton(next);
        refreshPhotoEditPreviewFromForm();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = Math.max(0, current - 1);
        state.photoRatingManuallyEdited = true;
        setPhotoRatingValue(next);
        if (next > 0) {
          focusPhotoRatingStarButton(next);
        }
        refreshPhotoEditPreviewFromForm();
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        state.photoRatingManuallyEdited = true;
        setPhotoRatingValue(1);
        focusPhotoRatingStarButton(1);
        refreshPhotoEditPreviewFromForm();
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        state.photoRatingManuallyEdited = true;
        setPhotoRatingValue(5);
        focusPhotoRatingStarButton(5);
        refreshPhotoEditPreviewFromForm();
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        state.photoRatingManuallyEdited = true;
        setPhotoRatingValue(0);
        refreshPhotoEditPreviewFromForm();
      }
    });
  });

  [
    { input: photoCountryInput, field: "country" },
    { input: photoStateInput, field: "state" },
    { input: photoCountyInput, field: "county" },
    { input: photoLocationInput, field: "location" },
    { input: photoTripInput, field: "trip" },
  ].forEach(({ input, field }) => {
    input.addEventListener("change", () => {
      rememberFieldValue(field, input.value);
    });
  });

  if (supportsBulkUpload) {
    bulkDropzone.addEventListener("click", () => {
      if (!isBulkUploading) {
        bulkFileInput.click();
      }
    });

    bulkDropzone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      if (!isBulkUploading) {
        bulkFileInput.click();
      }
    });

    bulkDropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!isBulkUploading) {
        bulkDropzone.classList.add("is-drag-over");
      }
    });

    bulkDropzone.addEventListener("dragleave", () => {
      bulkDropzone.classList.remove("is-drag-over");
    });

    bulkDropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      bulkDropzone.classList.remove("is-drag-over");
      void enqueueBulkFiles(event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []);
    });

    bulkFileInput.addEventListener("change", () => {
      const files = bulkFileInput.files ? Array.from(bulkFileInput.files) : [];
      void enqueueBulkFiles(files);
      bulkFileInput.value = "";
    });

    bulkQueueNode.addEventListener("input", onBulkQueueInput);
    bulkQueueNode.addEventListener("change", onBulkQueueInput);
    bulkQueueNode.addEventListener("click", onBulkQueueClick);

    bulkStartButton.addEventListener("click", () => {
      void uploadBulkQueue();
    });

    bulkClearButton.addEventListener("click", () => {
      if (isBulkUploading) {
        return;
      }
      const hadActiveQueueItem = Boolean(state.activeQueueItemId);
      clearBulkQueue({ clearEditorUpload: hadActiveQueueItem });
      renderBulkQueue();
      renderSuggestionLists();
      updateBulkUploadProgress({ hidden: true, value: 0, label: "" });
      setStatusMessage("Bulk queue cleared.");
    });
  }

  if (hasSaveControl) {
    saveButton.addEventListener("click", async () => {
      canAdoptRemoteDraft = false;
      draft = shared.saveDraft(deepNormalizeDraft(draft));
      setStatusMessage("Draft saved to browser storage.");
      await syncRemoteDraft("Manual save", { interactive: true });
    });
  }

  if (hasResetControl) {
    resetButton.addEventListener("click", () => {
      const confirmed = window.confirm("Reset local draft and return to repository baseline values?");
      if (!confirmed) {
        return;
      }

      if (remoteSyncTimer) {
        window.clearTimeout(remoteSyncTimer);
        remoteSyncTimer = null;
      }

      shared.clearDraft();
      canAdoptRemoteDraft = false;
      draft = deepClone(baseDraft);
      clearBulkQueue({ clearEditorUpload: true });
      state.photoEditIndex = null;
      resetPhotoForm();
      renderList();
      renderEditor();
      renderBulkQueue();
      renderSuggestionLists();
      setStatusMessage("Local draft reset to baseline (remote data unchanged).");
    });
  }

  if (hasExportStatusControl) {
    exportStatusButton.addEventListener("click", exportStatusTs);
  }
  if (hasExportPhotosControl) {
    exportPhotosButton.addEventListener("click", exportPhotosTs);
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== shared.STORAGE_KEY) {
      return;
    }

    draft = shared.loadDraft() || deepClone(baseDraft);
    renderList();
    renderEditor();
    renderSuggestionLists();
    setStatusMessage("Draft refreshed from another browser tab");
  });

  window.addEventListener("beforeunload", () => {
    state.bulkUploadQueue.forEach((item) => revokeQueuePreviewUrl(item));
  });

  const initialVisible = normalizedSpecies.find((bird) => bird.rarityBand === "common") || normalizedSpecies[0];
  state.selectedKey = initialVisible ? initialVisible.birdKey : null;
  renderList();
  renderEditor();
  renderBulkQueue();
  renderSuggestionLists();
  resetPhotoForm();
  renderPhotoRatingStars();
  const loadSourceMessage = localDraft
    ? "Loaded local browser draft."
    : "Loaded repository baseline data.";
  const syncMessage = remoteAvailable
    ? remoteReady
      ? "Firebase sync enabled."
      : "Firebase sync available after sign-in."
    : "Firebase services unavailable in this environment.";
  setStatusMessage(`${loadSourceMessage} ${syncMessage}`);

  if (remoteAvailable && typeof shared.loadRemoteDraft === "function") {
    shared
      .loadRemoteDraft()
      .then((loadedRemoteDraft) => {
        if (!loadedRemoteDraft || !canAdoptRemoteDraft) {
          return;
        }

        canAdoptRemoteDraft = false;
        draft = shared.saveDraft(deepNormalizeDraft(loadedRemoteDraft));
        renderList();
        renderEditor();
        renderSuggestionLists();
        resetPhotoForm();
        setStatusMessage("Loaded remote Firebase draft.");
      })
      .catch(() => {});
  }

  async function ensureRemoteSession(interactive) {
    if (!remoteAvailable || typeof shared.hasRemoteUser !== "function") {
      return false;
    }

    if (shared.hasRemoteUser()) {
      remoteReady = true;
      return true;
    }

    if (!interactive || typeof shared.signInRemote !== "function") {
      return false;
    }

    if (typeof shared.signInRemoteWithGoogle === "function") {
      const useGoogle = window.confirm(
        "Use Google sign-in for Firebase sync? Click OK for Google, or Cancel for email/password.",
      );
      if (useGoogle) {
        try {
          await shared.signInRemoteWithGoogle();
          remoteReady = true;
          setStatusMessage("Signed in to Firebase with Google.");
          return true;
        } catch (error) {
          const message = getFirebaseAuthErrorMessage(error);
          setStatusMessage(`Google sign-in failed: ${message}`);
          if (
            isPopupAuthError(error) &&
            typeof shared.signInRemoteWithGoogleRedirect === "function" &&
            window.confirm("Popup sign-in failed. Continue with Google redirect sign-in instead?")
          ) {
            try {
              await shared.signInRemoteWithGoogleRedirect();
              return false;
            } catch (redirectError) {
              const redirectMessage = getFirebaseAuthErrorMessage(redirectError);
              setStatusMessage(`Google redirect sign-in failed: ${redirectMessage}`);
              window.alert(`Google redirect sign-in failed: ${redirectMessage}`);
            }
          } else {
            window.alert(`Google sign-in failed: ${message}`);
          }
        }
      }
    }

    let lastErrorMessage = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const emailPrompt =
        attempt === 0
          ? "Sign in to Firebase to sync Bird Atlas uploads. Enter admin email:"
          : `Sign-in failed${lastErrorMessage ? ` (${lastErrorMessage})` : ""}. Enter Firebase admin email:`;
      const email = window.prompt(emailPrompt);
      if (email === null) {
        return false;
      }

      const password = window.prompt("Enter Firebase admin password:");
      if (password === null) {
        return false;
      }

      try {
        await shared.signInRemote(email.trim(), password);
        remoteReady = true;
        setStatusMessage("Signed in to Firebase.");
        return true;
      } catch (error) {
        lastErrorMessage = getFirebaseAuthErrorMessage(error);
        setStatusMessage(`Firebase sign-in failed: ${lastErrorMessage}`);
      }
    }

    window.alert(
      `Firebase sign-in failed${lastErrorMessage ? `: ${lastErrorMessage}` : ""}. Continuing in local-only mode.`,
    );
    return false;
  }

  function getFirebaseAuthErrorMessage(error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code || "") : "";
    switch (code) {
      case "auth/user-not-found":
        return "No Firebase Auth user exists for this email.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email/password for Firebase Auth.";
      case "auth/invalid-email":
        return "Email format is invalid.";
      case "auth/user-disabled":
        return "This Firebase Auth user is disabled.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again in a few minutes.";
      case "auth/network-request-failed":
        return "Network request failed while contacting Firebase.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in is not enabled in Firebase Auth.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized in Firebase Auth settings.";
      case "auth/popup-closed-by-user":
        return "Google popup was closed before sign-in completed.";
      case "auth/popup-blocked":
        return "Browser blocked the Google popup window.";
      case "auth/cancelled-popup-request":
        return "Google popup request was cancelled before completion.";
      default:
        return formatErrorMessage(error);
    }
  }

  function isPopupAuthError(error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code || "") : "";
    return code === "auth/popup-closed-by-user" || code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
  }

  async function ensureAccess() {
    const existingToken = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    if (existingToken === PASSWORD_HASH_HEX) {
      return true;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const promptLabel =
        attempt === 0
          ? "Enter admin password for Bird Atlas:"
          : "Incorrect password. Try again:";
      const input = window.prompt(promptLabel);
      if (input === null) {
        return false;
      }

      const candidateHash = await sha256Hex(input);
      if (candidateHash === PASSWORD_HASH_HEX) {
        window.sessionStorage.setItem(AUTH_SESSION_KEY, PASSWORD_HASH_HEX);
        return true;
      }
    }

    window.alert("Admin access denied.");
    return false;
  }

  async function sha256Hex(text) {
    if (!window.crypto?.subtle) {
      return text;
    }

    const payload = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", payload);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeRating(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return undefined;
    }

    const rounded = Math.round(number);
    if (rounded < 1 || rounded > 5) {
      return undefined;
    }

    return rounded;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  } catch (error) {
    const statusNode = document.querySelector("[data-admin-status-message]");
    if (statusNode instanceof HTMLElement) {
      statusNode.textContent =
        "Bird admin script error. Open browser console and share the first red error line so it can be fixed.";
    }
    // Keep a full stack in the browser console for debugging.
    console.error("Bird admin initialization failed", error);
  }
})();
