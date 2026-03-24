(() => {
  const root = document.querySelector("[data-photo-admin-root]");
  const seedNode = document.querySelector("#photo-admin-seed");
  if (!(root instanceof HTMLElement) || !(seedNode instanceof HTMLScriptElement)) {
    return;
  }

  const shared = window.BirdAdminShared || null;
  const STORAGE_KEY = "ellisJoycePhotoAdminDraftV1";
  const REMOTE_COLLECTION = "birdAtlas";
  const REMOTE_DOCUMENT = "publicData";
  const REMOTE_FIELD = "photographyGallery";

  const searchInput = document.querySelector("[data-photo-admin-search]");
  const tripFilterSelect = document.querySelector("[data-photo-admin-trip-filter]");
  const ratingFilterSelect = document.querySelector("[data-photo-admin-rating-filter]");
  const clearFiltersButton = document.querySelector("[data-photo-admin-clear-filters]");
  const saveButton = document.querySelector("[data-photo-admin-save]");
  const resetButton = document.querySelector("[data-photo-admin-reset]");
  const syncButton = document.querySelector("[data-photo-admin-sync]");
  const signInButton = document.querySelector("[data-photo-admin-signin]");
  const exportPhotosButton = document.querySelector("[data-photo-admin-export-photos]");
  const exportTripsButton = document.querySelector("[data-photo-admin-export-trips]");
  const authStateNode = document.querySelector("[data-photo-admin-auth-state]");
  const statusNode = document.querySelector("[data-photo-admin-status-message]");

  const listNode = root.querySelector("[data-photo-admin-list]");
  const listCountNode = root.querySelector("[data-photo-admin-list-count]");
  const emptyListNode = root.querySelector("[data-photo-admin-empty-list]");

  const emptyEditorNode = root.querySelector("[data-photo-admin-empty-editor]");
  const editorNode = root.querySelector("[data-photo-admin-editor]");
  const ratingChipNode = root.querySelector("[data-photo-admin-rating-chip]");
  const titleNode = root.querySelector("[data-photo-admin-photo-title]");
  const tripNode = root.querySelector("[data-photo-admin-photo-trip]");
  const previewImageNode = root.querySelector("[data-photo-admin-preview-image]");
  const idInput = root.querySelector("[data-photo-admin-id]");
  const tripSelect = root.querySelector("[data-photo-admin-trip]");
  const ratingSelect = root.querySelector("[data-photo-admin-rating]");
  const starInput = root.querySelector("[data-photo-admin-star]");
  const dateInput = root.querySelector("[data-photo-admin-date]");
  const subjectInput = root.querySelector("[data-photo-admin-subject]");
  const locationInput = root.querySelector("[data-photo-admin-location]");
  const altInput = root.querySelector("[data-photo-admin-alt]");
  const tagsInput = root.querySelector("[data-photo-admin-tags]");
  const srcInput = root.querySelector("[data-photo-admin-src]");
  const deleteButton = root.querySelector("[data-photo-admin-delete]");

  const dropzoneNode = root.querySelector("[data-photo-admin-dropzone]");
  const fileInput = root.querySelector("[data-photo-admin-file-input]");
  const uploadTripSelect = root.querySelector("[data-photo-admin-upload-trip]");
  const uploadRatingSelect = root.querySelector("[data-photo-admin-upload-rating]");
  const uploadDateInput = root.querySelector("[data-photo-admin-upload-date]");
  const uploadLocationInput = root.querySelector("[data-photo-admin-upload-location]");
  const uploadProgressNode = root.querySelector("[data-photo-admin-upload-progress]");
  const uploadProgressBar = root.querySelector("[data-photo-admin-upload-progress-bar]");
  const uploadProgressLabel = root.querySelector("[data-photo-admin-upload-progress-label]");
  const uploadStartButton = root.querySelector("[data-photo-admin-upload-start]");
  const uploadClearButton = root.querySelector("[data-photo-admin-upload-clear]");
  const uploadQueueNode = root.querySelector("[data-photo-admin-queue]");

  const newTripTitleInput = root.querySelector("[data-photo-admin-new-trip-title]");
  const newTripYearInput = root.querySelector("[data-photo-admin-new-trip-year]");
  const newTripPathInput = root.querySelector("[data-photo-admin-new-trip-path]");
  const newTripBaseInput = root.querySelector("[data-photo-admin-new-trip-base]");
  const newTripCarouselInput = root.querySelector("[data-photo-admin-new-trip-carousel]");
  const createTripButton = root.querySelector("[data-photo-admin-create-trip]");
  const tripBaseListNode = root.querySelector("[data-photo-admin-trip-base-list]");
  const tripCarouselListNode = root.querySelector("[data-photo-admin-trip-carousel-list]");

  if (
    !(searchInput instanceof HTMLInputElement) ||
    !(tripFilterSelect instanceof HTMLSelectElement) ||
    !(ratingFilterSelect instanceof HTMLSelectElement) ||
    !(clearFiltersButton instanceof HTMLButtonElement) ||
    !(saveButton instanceof HTMLButtonElement) ||
    !(resetButton instanceof HTMLButtonElement) ||
    !(syncButton instanceof HTMLButtonElement) ||
    !(signInButton instanceof HTMLButtonElement) ||
    !(exportPhotosButton instanceof HTMLButtonElement) ||
    !(exportTripsButton instanceof HTMLButtonElement) ||
    !(authStateNode instanceof HTMLElement) ||
    !(statusNode instanceof HTMLElement) ||
    !(listNode instanceof HTMLElement) ||
    !(listCountNode instanceof HTMLElement) ||
    !(emptyListNode instanceof HTMLElement) ||
    !(emptyEditorNode instanceof HTMLElement) ||
    !(editorNode instanceof HTMLElement) ||
    !(ratingChipNode instanceof HTMLElement) ||
    !(titleNode instanceof HTMLElement) ||
    !(tripNode instanceof HTMLElement) ||
    !(previewImageNode instanceof HTMLImageElement) ||
    !(idInput instanceof HTMLInputElement) ||
    !(tripSelect instanceof HTMLSelectElement) ||
    !(ratingSelect instanceof HTMLSelectElement) ||
    !(starInput instanceof HTMLInputElement) ||
    !(dateInput instanceof HTMLInputElement) ||
    !(subjectInput instanceof HTMLInputElement) ||
    !(locationInput instanceof HTMLInputElement) ||
    !(altInput instanceof HTMLTextAreaElement) ||
    !(tagsInput instanceof HTMLInputElement) ||
    !(srcInput instanceof HTMLInputElement) ||
    !(deleteButton instanceof HTMLButtonElement) ||
    !(dropzoneNode instanceof HTMLElement) ||
    !(fileInput instanceof HTMLInputElement) ||
    !(uploadTripSelect instanceof HTMLSelectElement) ||
    !(uploadRatingSelect instanceof HTMLSelectElement) ||
    !(uploadDateInput instanceof HTMLInputElement) ||
    !(uploadLocationInput instanceof HTMLInputElement) ||
    !(uploadProgressNode instanceof HTMLElement) ||
    !(uploadProgressBar instanceof HTMLProgressElement) ||
    !(uploadProgressLabel instanceof HTMLElement) ||
    !(uploadStartButton instanceof HTMLButtonElement) ||
    !(uploadClearButton instanceof HTMLButtonElement) ||
    !(uploadQueueNode instanceof HTMLElement) ||
    !(newTripTitleInput instanceof HTMLInputElement) ||
    !(newTripYearInput instanceof HTMLInputElement) ||
    !(newTripPathInput instanceof HTMLInputElement) ||
    !(newTripBaseInput instanceof HTMLInputElement) ||
    !(newTripCarouselInput instanceof HTMLInputElement) ||
    !(createTripButton instanceof HTMLButtonElement) ||
    !(tripBaseListNode instanceof HTMLElement) ||
    !(tripCarouselListNode instanceof HTMLElement)
  ) {
    return;
  }

  let parsedSeed = {};
  try {
    parsedSeed = JSON.parse(seedNode.textContent || "{}");
  } catch (_error) {
    parsedSeed = {};
  }

  const baseDraft = sanitizeDraft(parsedSeed);
  const localDraft = loadLocalDraft();
  let draft = localDraft ? mergeDrafts(baseDraft, localDraft, { mode: "override" }) : deepClone(baseDraft);
  let canAdoptRemoteDraft = !localDraft;
  const remoteAvailable = Boolean(getGalleryDocRef());
  let remoteReady = Boolean(shared?.hasRemoteUser && shared.hasRemoteUser());
  let remoteSyncTimer = null;
  let remoteSyncInFlight = false;
  let remoteSyncReason = "";
  let isUploadingQueue = false;
  const uploadDefaultState = {
    ratingTouched: false,
    dateTouched: false,
  };

  const state = {
    queryText: "",
    tripFilter: "all",
    minimumRating: 0,
    selectedPhotoId: draft.photos[0]?.id || null,
    uploadQueue: [],
  };

  ensureSelectedPhoto();
  populateTripSelects();
  renderPhotoList();
  renderEditor();
  renderTripVisibilityList();
  renderUploadQueue();
  updateUploadProgress({ hidden: true, value: 0, label: "" });
  updateAuthState();

  if (remoteAvailable) {
    loadRemoteDraft().then((loadedRemoteDraft) => {
      if (!loadedRemoteDraft) {
        return;
      }

      if (canAdoptRemoteDraft || Boolean(localDraft)) {
        draft = localDraft ? mergeDrafts(loadedRemoteDraft, draft, { mode: "override" }) : loadedRemoteDraft;
        canAdoptRemoteDraft = false;
        storeLocalDraftSilently(draft);
        ensureSelectedPhoto();
        populateTripSelects();
        renderPhotoList();
        renderEditor();
        renderTripVisibilityList();
        setStatusMessage(localDraft ? "Merged local and Firebase photography drafts." : "Loaded photography draft from Firebase.");
      }
    });

    subscribeRemoteDraft((incomingRemoteDraft) => {
      if (!incomingRemoteDraft || remoteSyncInFlight) {
        return;
      }

      const merged = canAdoptRemoteDraft
        ? incomingRemoteDraft
        : mergeDrafts(incomingRemoteDraft, draft, { mode: "override" });
      canAdoptRemoteDraft = false;
      if (isSameDraft(merged, draft)) {
        return;
      }

      draft = merged;
      storeLocalDraftSilently(draft);
      ensureSelectedPhoto();
      populateTripSelects();
      renderPhotoList();
      renderEditor();
      renderTripVisibilityList();
      setStatusMessage("Applied Firebase photography update.");
    });
  }

  searchInput.addEventListener("input", () => {
    state.queryText = normalizeText(searchInput.value);
    renderPhotoList();
  });

  tripFilterSelect.addEventListener("change", () => {
    state.tripFilter = tripFilterSelect.value || "all";
    renderPhotoList();
  });

  ratingFilterSelect.addEventListener("change", () => {
    state.minimumRating = clampRating(Number(ratingFilterSelect.value));
    renderPhotoList();
  });

  clearFiltersButton.addEventListener("click", () => {
    state.queryText = "";
    state.tripFilter = "all";
    state.minimumRating = 0;
    searchInput.value = "";
    tripFilterSelect.value = "all";
    ratingFilterSelect.value = "0";
    renderPhotoList();
    setStatusMessage("Photo filters cleared.");
  });

  tripSelect.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.tripSlug = tripSelect.value || photo.tripSlug;
    }, "Updated photo trip.");
  });

  ratingSelect.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.rating = clampRating(Number(ratingSelect.value));
    }, "Updated photo rating.");
  });

  starInput.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.isFavorite = starInput.checked;
    }, starInput.checked ? "Starred photo." : "Removed star from photo.");
  });

  dateInput.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.capturedOn = normalizeDate(dateInput.value);
    }, "Updated capture date.");
  });

  subjectInput.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.subject = normalizeOptionalText(subjectInput.value);
    }, "Updated subject.");
  });

  locationInput.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.location = normalizeOptionalText(locationInput.value);
    }, "Updated location.");
  });

  altInput.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.alt = normalizeOptionalText(altInput.value);
    }, "Updated alt text.");
  });

  tagsInput.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.tags = parseTags(tagsInput.value);
    }, "Updated tags.");
  });

  srcInput.addEventListener("change", () => {
    updateSelectedPhoto((photo) => {
      photo.src = normalizePhotoSrc(srcInput.value);
    }, "Updated source path.");
  });

  deleteButton.addEventListener("click", () => {
    const selected = getSelectedPhoto();
    if (!selected) {
      return;
    }

    const confirmed = window.confirm(`Delete photo "${selected.id}"?`);
    if (!confirmed) {
      return;
    }

    draft.photos = draft.photos.filter((photo) => photo.id !== selected.id);
    ensureSelectedPhoto();
    persistDraft("Photo deleted.");
    renderPhotoList();
    renderEditor();
  });

  dropzoneNode.addEventListener("click", () => {
    fileInput.click();
  });

  dropzoneNode.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  dropzoneNode.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzoneNode.classList.add("is-drag-over");
  });

  dropzoneNode.addEventListener("dragleave", () => {
    dropzoneNode.classList.remove("is-drag-over");
  });

  dropzoneNode.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzoneNode.classList.remove("is-drag-over");
    enqueueFiles(event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []);
  });

  fileInput.addEventListener("change", () => {
    enqueueFiles(fileInput.files ? Array.from(fileInput.files) : []);
    fileInput.value = "";
  });

  uploadRatingSelect.addEventListener("change", () => {
    uploadDefaultState.ratingTouched = true;
  });

  uploadDateInput.addEventListener("input", () => {
    uploadDefaultState.dateTouched = true;
  });

  uploadDateInput.addEventListener("change", () => {
    uploadDefaultState.dateTouched = true;
  });

  uploadStartButton.addEventListener("click", () => {
    void uploadQueuedFiles();
  });

  uploadClearButton.addEventListener("click", () => {
    state.uploadQueue = [];
    renderUploadQueue();
    setStatusMessage("Upload queue cleared.");
  });

  createTripButton.addEventListener("click", () => {
    const title = normalizeOptionalText(newTripTitleInput.value);
    const year = normalizeOptionalText(newTripYearInput.value);
    if (!title) {
      setStatusMessage("Trip title is required.");
      return;
    }

    const slug = buildUniqueTripSlug(slugify(`${title}-${year || ""}`) || slugify(title));
    const legacyPathRaw = normalizeOptionalText(newTripPathInput.value);
    const legacyPath = normalizeLegacyPath(legacyPathRaw || `/photography/${slug}`);
    const showInBasePage = newTripBaseInput.checked;
    const showInCarousel = newTripCarouselInput.checked;

    draft.trips.push({
      slug,
      title,
      year: year || "",
      legacyPath,
      coverImage: "",
      showOnPhotographyPage: showInBasePage || showInCarousel,
      showInBasePage,
      showInCarousel,
    });
    draft.trips = sortTrips(draft.trips);
    populateTripSelects();
    renderTripVisibilityList();
    persistDraft(`Trip "${title}" added.`);
    newTripTitleInput.value = "";
    newTripYearInput.value = "";
    newTripPathInput.value = "";
    newTripBaseInput.checked = true;
    newTripCarouselInput.checked = true;
  });

  saveButton.addEventListener("click", () => {
    persistDraft("Draft saved locally.");
    scheduleRemoteSync("Manual save");
  });

  resetButton.addEventListener("click", () => {
    const confirmed = window.confirm("Reset photography draft to seeded data?");
    if (!confirmed) {
      return;
    }

    draft = deepClone(baseDraft);
    state.queryText = "";
    state.tripFilter = "all";
    state.minimumRating = 0;
    state.uploadQueue = [];
    searchInput.value = "";
    tripFilterSelect.value = "all";
    ratingFilterSelect.value = "0";
    ensureSelectedPhoto();
    persistDraft("Draft reset to seeded data.");
    populateTripSelects();
    renderPhotoList();
    renderEditor();
    renderTripVisibilityList();
    renderUploadQueue();
    scheduleRemoteSync("Draft reset");
  });

  syncButton.addEventListener("click", () => {
    void syncRemoteDraft("Manual sync", { interactive: true });
  });

  signInButton.addEventListener("click", () => {
    void ensureRemoteSession(true);
  });

  exportPhotosButton.addEventListener("click", () => {
    downloadTextFile("photographyPhotos.ts", draftToPhotosTs(draft.photos));
    setStatusMessage("Downloaded photographyPhotos.ts.");
  });

  exportTripsButton.addEventListener("click", () => {
    downloadTextFile("photographyTrips.ts", draftToTripsTs(draft.trips));
    setStatusMessage("Downloaded photographyTrips.ts.");
  });

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

  function persistDraft(reason) {
    draft = sanitizeDraft(draft);
    storeLocalDraftSilently(draft);
    setStatusMessage(reason);
    scheduleRemoteSync(reason);
  }

  function storeLocalDraftSilently(nextDraft) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeDraft(nextDraft)));
    } catch (_error) {}
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

  function setStatusMessage(message) {
    const now = new Date();
    const stamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    statusNode.textContent = `${message} (${stamp})`;
  }

  function updateAuthState() {
    if (!remoteAvailable) {
      authStateNode.textContent = "Firebase Firestore is unavailable in this environment.";
      signInButton.disabled = true;
      syncButton.disabled = true;
      return;
    }

    const user = getCurrentRemoteUser();
    if (user) {
      remoteReady = true;
      const userLabel = user.email ? String(user.email) : "authenticated user";
      authStateNode.textContent = `Firebase connected as ${userLabel}. Auto-sync is enabled.`;
      signInButton.disabled = true;
      syncButton.disabled = false;
      return;
    }

    remoteReady = false;
    authStateNode.textContent = "Not signed in to Firebase. Local draft still works; sign in to sync.";
    signInButton.disabled = false;
    syncButton.disabled = false;
  }

  function getCurrentRemoteUser() {
    const app = getFirebaseApp();
    if (!app || typeof app.auth !== "function") {
      return null;
    }

    try {
      const auth = app.auth();
      return auth?.currentUser || null;
    } catch (_error) {
      return null;
    }
  }

  async function ensureRemoteSession(forcePrompt) {
    if (!remoteAvailable || !shared || typeof shared.hasRemoteUser !== "function") {
      updateAuthState();
      return false;
    }

    if (shared.hasRemoteUser()) {
      updateAuthState();
      return true;
    }

    if (!forcePrompt) {
      updateAuthState();
      return false;
    }

    if (typeof shared.signInRemoteWithGoogle !== "function") {
      setStatusMessage("Google sign-in is unavailable in this environment.");
      updateAuthState();
      return false;
    }

    try {
      await shared.signInRemoteWithGoogle();
      updateAuthState();
      setStatusMessage("Signed in to Firebase.");
      return true;
    } catch (error) {
      const message = formatErrorMessage(error);
      setStatusMessage(`Sign-in failed: ${message}`);
      updateAuthState();
      return false;
    }
  }

  function scheduleRemoteSync(reason) {
    if (!remoteAvailable || !remoteReady) {
      return;
    }

    remoteSyncReason = reason;
    if (remoteSyncTimer !== null) {
      window.clearTimeout(remoteSyncTimer);
    }
    remoteSyncTimer = window.setTimeout(() => {
      void syncRemoteDraft(remoteSyncReason, { interactive: false });
    }, 900);
  }

  async function syncRemoteDraft(reason, options = {}) {
    const interactive = Boolean(options?.interactive);
    if (!remoteAvailable) {
      if (interactive) {
        setStatusMessage("Firebase sync is unavailable.");
      }
      return false;
    }

    if (remoteSyncInFlight) {
      return false;
    }

    if (!remoteReady) {
      const authed = await ensureRemoteSession(interactive);
      if (!authed) {
        return false;
      }
    }

    const docRef = getGalleryDocRef();
    if (!docRef) {
      if (interactive) {
        setStatusMessage("Unable to access Firestore document.");
      }
      return false;
    }

    remoteSyncInFlight = true;
    try {
      await docRef.set(
        {
          [REMOTE_FIELD]: {
            trips: draft.trips,
            photos: draft.photos,
            schemaVersion: 1,
            updatedAtIso: new Date().toISOString(),
          },
        },
        { merge: true },
      );
      if (interactive) {
        setStatusMessage(`Synced to Firebase (${reason}).`);
      }
      return true;
    } catch (error) {
      if (interactive) {
        setStatusMessage(`Firebase sync failed: ${formatErrorMessage(error)}`);
      }
      return false;
    } finally {
      remoteSyncInFlight = false;
    }
  }

  async function loadRemoteDraft() {
    const docRef = getGalleryDocRef();
    if (!docRef) {
      return null;
    }

    try {
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return null;
      }
      const payload = snapshot.data();
      return mergeAtlasPhotosIntoDraft(
        sanitizeDraft(payload?.[REMOTE_FIELD]),
        mapAtlasPhotosToGalleryPhotos(payload?.photos),
      );
    } catch (_error) {
      return null;
    }
  }

  function subscribeRemoteDraft(listener) {
    const docRef = getGalleryDocRef();
    if (!docRef || typeof listener !== "function") {
      return () => {};
    }

    try {
      return docRef.onSnapshot(
        (snapshot) => {
          if (!snapshot.exists) {
            return;
          }
          const payload = snapshot.data();
          listener(
            mergeAtlasPhotosIntoDraft(
              sanitizeDraft(payload?.[REMOTE_FIELD]),
              mapAtlasPhotosToGalleryPhotos(payload?.photos),
            ),
          );
        },
        () => {},
      );
    } catch (_error) {
      return () => {};
    }
  }

  function getGalleryDocRef() {
    const app = getFirebaseApp();
    if (!app || typeof app.firestore !== "function") {
      return null;
    }

    try {
      return app.firestore().collection(REMOTE_COLLECTION).doc(REMOTE_DOCUMENT);
    } catch (_error) {
      return null;
    }
  }

  function getFirebaseApp() {
    const firebase = window.firebase;
    if (!firebase || typeof firebase !== "object" || !Array.isArray(firebase.apps) || !firebase.apps.length) {
      return null;
    }

    try {
      return firebase.app();
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

  function renderPhotoList() {
    const filtered = getFilteredPhotos();
    listNode.textContent = "";

    filtered.forEach((photo) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "bird-admin-item photo-admin-item";
      if (photo.id === state.selectedPhotoId) {
        item.classList.add("is-selected");
      }
      item.addEventListener("click", () => {
        state.selectedPhotoId = photo.id;
        renderPhotoList();
        renderEditor();
      });

      const thumb = document.createElement("img");
      thumb.className = "photo-admin-item-thumb";
      thumb.src = photo.src;
      thumb.alt = photo.alt || photo.id;
      thumb.loading = "lazy";
      thumb.decoding = "async";

      const body = document.createElement("div");
      body.className = "photo-admin-item-body";

      const title = document.createElement("p");
      title.className = "bird-admin-item-title";
      title.textContent = `${isFavoritePhoto(photo) ? "★ " : ""}${photo.subject || photo.alt || "Untitled photo"}`;

      const tripMeta = document.createElement("p");
      tripMeta.className = "bird-admin-item-meta";
      const tripTitle = tripTitleForSlug(photo.tripSlug);
      tripMeta.textContent = `${tripTitle}${tripVisibleLabel(photo.tripSlug)} • ${ratingLabel(photo.rating)}`;

      const secondary = document.createElement("p");
      secondary.className = "bird-admin-item-meta";
      secondary.textContent = [photo.capturedOn || "", photo.location || ""].filter(Boolean).join(" • ") || photo.id;

      body.appendChild(title);
      body.appendChild(tripMeta);
      body.appendChild(secondary);
      item.appendChild(thumb);
      item.appendChild(body);
      listNode.appendChild(item);
    });

    emptyListNode.toggleAttribute("hidden", filtered.length !== 0);
    listCountNode.textContent = `${filtered.length} visible of ${draft.photos.length} photos`;
  }

  function renderEditor() {
    const selected = getSelectedPhoto();
    const hasSelected = Boolean(selected);
    emptyEditorNode.toggleAttribute("hidden", hasSelected);
    editorNode.toggleAttribute("hidden", !hasSelected);

    if (!selected) {
      return;
    }

    const tripTitle = tripTitleForSlug(selected.tripSlug);
    ratingChipNode.textContent = ratingLabel(selected.rating);
    titleNode.textContent = selected.subject || selected.alt || "Untitled photo";
    tripNode.textContent = `${tripTitle}${tripVisibleLabel(selected.tripSlug)} • ${selected.capturedOn || "Date unknown"}`;
    previewImageNode.src = selected.src;
    previewImageNode.alt = selected.alt || selected.id;

    idInput.value = selected.id;
    tripSelect.value = selected.tripSlug;
    ratingSelect.value = String(clampRating(selected.rating));
    starInput.checked = isFavoritePhoto(selected);
    dateInput.value = selected.capturedOn || "";
    subjectInput.value = selected.subject || "";
    locationInput.value = selected.location || "";
    altInput.value = selected.alt || "";
    tagsInput.value = Array.isArray(selected.tags) ? selected.tags.join(", ") : "";
    srcInput.value = selected.src || "";
  }

  function populateTripSelects() {
    const previousFilter = tripFilterSelect.value || state.tripFilter;
    const previousEditor = tripSelect.value;
    const previousUpload = uploadTripSelect.value;

    populateTripSelect(tripFilterSelect, draft.trips, { includeAll: true });
    populateTripSelect(tripSelect, draft.trips, { includeAll: false });
    populateTripSelect(uploadTripSelect, draft.trips, { includeAll: false });

    tripFilterSelect.value = draft.trips.some((trip) => trip.slug === previousFilter) ? previousFilter : "all";
    state.tripFilter = tripFilterSelect.value;

    const selectedPhoto = getSelectedPhoto();
    tripSelect.value =
      selectedPhoto && draft.trips.some((trip) => trip.slug === selectedPhoto.tripSlug)
        ? selectedPhoto.tripSlug
        : draft.trips[0]?.slug || "";
    uploadTripSelect.value =
      draft.trips.some((trip) => trip.slug === previousUpload)
        ? previousUpload
        : selectedPhoto?.tripSlug || draft.trips[0]?.slug || "";
    if (selectedPhoto) {
      selectedPhoto.tripSlug = tripSelect.value;
    }
    if (!previousEditor && selectedPhoto) {
      tripSelect.value = selectedPhoto.tripSlug;
    }
  }

  function populateTripSelect(selectNode, trips, options) {
    selectNode.textContent = "";

    if (options?.includeAll) {
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "All trips";
      selectNode.appendChild(allOption);
    }

    trips.forEach((trip) => {
      const option = document.createElement("option");
      option.value = trip.slug;
      option.textContent = `${trip.title}${trip.year ? ` (${trip.year})` : ""}${tripVisibleLabel(trip.slug)}`;
      selectNode.appendChild(option);
    });
  }

  function renderTripVisibilityList() {
    tripBaseListNode.textContent = "";
    tripCarouselListNode.textContent = "";
    if (!draft.trips.length) {
      const emptyBase = document.createElement("p");
      emptyBase.className = "bird-empty-state";
      emptyBase.textContent = "No trips available.";
      tripBaseListNode.appendChild(emptyBase);

      const emptyCarousel = document.createElement("p");
      emptyCarousel.className = "bird-empty-state";
      emptyCarousel.textContent = "No trips available.";
      tripCarouselListNode.appendChild(emptyCarousel);
      return;
    }

    renderTripToggleList(tripBaseListNode, "showInBasePage", "base-page");
    renderTripToggleList(tripCarouselListNode, "showInCarousel", "carousel");
  }

  function renderTripToggleList(container, field, label) {
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const rows = sortTrips(draft.trips);
    rows.forEach((trip) => {
      const row = document.createElement("label");
      row.className = "photo-admin-trip-visibility-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = field === "showInBasePage" ? trip.showInBasePage !== false : trip.showInCarousel !== false;
      checkbox.addEventListener("change", () => {
        const target = draft.trips.find((entry) => entry.slug === trip.slug);
        if (!target) {
          return;
        }
        if (field === "showInBasePage") {
          target.showInBasePage = checkbox.checked;
        } else {
          target.showInCarousel = checkbox.checked;
        }
        target.showOnPhotographyPage = target.showInBasePage !== false || target.showInCarousel !== false;
        populateTripSelects();
        renderPhotoList();
        renderEditor();
        renderTripVisibilityList();
        persistDraft(`Updated ${label} visibility for "${target.title}".`);
      });

      const body = document.createElement("div");
      body.className = "photo-admin-trip-visibility-item-body";
      const titleNode = document.createElement("strong");
      titleNode.textContent = trip.title;
      const metaNode = document.createElement("span");
      metaNode.textContent = [
        trip.year || "",
        trip.slug,
        trip.showInBasePage === false && trip.showInCarousel === false ? "Hidden everywhere" : "",
      ]
        .filter(Boolean)
        .join(" • ");
      body.appendChild(titleNode);
      body.appendChild(metaNode);

      row.appendChild(checkbox);
      row.appendChild(body);
      container.appendChild(row);
    });
  }

  function getFilteredPhotos() {
    const query = state.queryText;
    const tripFilter = state.tripFilter;
    const minimumRating = state.minimumRating;

    return [...draft.photos]
      .filter((photo) => {
        if (tripFilter !== "all" && photo.tripSlug !== tripFilter) {
          return false;
        }

        if (minimumRating > 0 && clampRating(photo.rating) < minimumRating) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchText = normalizeText(
          [
            photo.id,
            photo.alt,
            photo.subject,
            photo.location,
            photo.capturedOn,
            photo.tripSlug,
            tripTitleForSlug(photo.tripSlug),
            Array.isArray(photo.tags) ? photo.tags.join(" ") : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
        return searchText.includes(query);
      })
      .sort(comparePhotos);
  }

  function comparePhotos(left, right) {
    const dateDiff = toTimestamp(right.capturedOn) - toTimestamp(left.capturedOn);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(left.id).localeCompare(String(right.id));
  }

  function updateSelectedPhoto(mutate, reason) {
    const selected = getSelectedPhoto();
    if (!selected || typeof mutate !== "function") {
      return;
    }

    const previous = {
      ...selected,
      tags: Array.isArray(selected.tags) ? [...selected.tags] : [],
    };
    mutate(selected);
    selected.alt = normalizeOptionalText(selected.alt);
    selected.subject = normalizeOptionalText(selected.subject);
    selected.location = normalizeOptionalText(selected.location);
    selected.src = normalizePhotoSrc(selected.src);
    selected.rating = clampRating(selected.rating);
    selected.isFavorite = Boolean(selected.isFavorite);
    selected.capturedOn = normalizeDate(selected.capturedOn);
    selected.tags = parseTags(selected.tags);
    if (!selected.src) {
      Object.assign(selected, previous);
      setStatusMessage("Photo source cannot be empty.");
      renderEditor();
      return;
    }

    renderPhotoList();
    renderEditor();
    persistDraft(reason);
  }

  function getSelectedPhoto() {
    if (!state.selectedPhotoId) {
      return null;
    }
    return draft.photos.find((photo) => photo.id === state.selectedPhotoId) || null;
  }

  function ensureSelectedPhoto() {
    if (!draft.photos.length) {
      state.selectedPhotoId = null;
      return;
    }
    if (!draft.photos.some((photo) => photo.id === state.selectedPhotoId)) {
      state.selectedPhotoId = draft.photos[0].id;
    }
  }

  async function resolvePhotoMetadata(file) {
    if (!(file instanceof window.File)) {
      return { capturedOn: "", rating: 0 };
    }

    if (shared && typeof shared.extractPhotoMetadata === "function") {
      try {
        const metadata = await shared.extractPhotoMetadata(file);
        return {
          capturedOn: normalizeDate(metadata?.capturedOn),
          rating: clampRating(metadata?.rating),
        };
      } catch (_error) {
        return { capturedOn: "", rating: 0 };
      }
    }

    try {
      const [capturedOn, rating] = await Promise.all([
        shared && typeof shared.extractPhotoTakenDate === "function"
          ? shared.extractPhotoTakenDate(file)
          : Promise.resolve(""),
        shared && typeof shared.extractPhotoRating === "function"
          ? shared.extractPhotoRating(file)
          : Promise.resolve(0),
      ]);
      return {
        capturedOn: normalizeDate(capturedOn),
        rating: clampRating(rating),
      };
    } catch (_error) {
      return { capturedOn: "", rating: 0 };
    }
  }

  async function maybePrefillUploadDefaultsFromMetadata(files) {
    const queue = Array.isArray(files) ? files.filter((file) => file instanceof window.File) : [];
    if (!queue.length || state.uploadQueue.length !== 1 || queue.length !== 1) {
      return;
    }

    const canPrefillDate = !uploadDefaultState.dateTouched;
    const canPrefillRating = !uploadDefaultState.ratingTouched;
    if (!canPrefillDate && !canPrefillRating) {
      return;
    }

    const file = queue[0];
    const metadata = await resolvePhotoMetadata(file);
    if (state.uploadQueue[0] !== file) {
      return;
    }

    if (canPrefillDate && metadata.capturedOn) {
      uploadDateInput.value = metadata.capturedOn;
    }
    if (canPrefillRating && metadata.rating > 0) {
      uploadRatingSelect.value = String(metadata.rating);
    }
  }

  function enqueueFiles(files) {
    if (!Array.isArray(files) || !files.length) {
      return;
    }

    let added = 0;
    const addedFiles = [];
    const existingSignatures = new Set(
      state.uploadQueue.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
    );

    files.forEach((file) => {
      if (!(file instanceof window.File)) {
        return;
      }
      if (!String(file.type || "").startsWith("image/")) {
        return;
      }

      const signature = `${file.name}:${file.size}:${file.lastModified}`;
      if (existingSignatures.has(signature)) {
        return;
      }
      existingSignatures.add(signature);
      state.uploadQueue.push(file);
      addedFiles.push(file);
      added += 1;
    });

    renderUploadQueue();
    if (added > 0) {
      setStatusMessage(`Queued ${added} image${added > 1 ? "s" : ""}.`);
      void maybePrefillUploadDefaultsFromMetadata(addedFiles);
    }
  }

  function renderUploadQueue() {
    uploadQueueNode.textContent = "";
    if (!state.uploadQueue.length) {
      const empty = document.createElement("p");
      empty.className = "bird-empty-state";
      empty.textContent = "Upload queue is empty.";
      uploadQueueNode.appendChild(empty);
      return;
    }

    const totalBytes = state.uploadQueue.reduce((sum, file) => sum + Number(file.size || 0), 0);
    const summary = document.createElement("p");
    summary.className = "photo-admin-queue-summary";
    summary.textContent = `${state.uploadQueue.length} files queued • ${formatBytes(totalBytes)}`;
    uploadQueueNode.appendChild(summary);

    state.uploadQueue.forEach((file, index) => {
      const row = document.createElement("div");
      row.className = "photo-admin-queue-item";

      const label = document.createElement("p");
      label.textContent = `${file.name} • ${formatBytes(file.size)}`;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "btn secondary";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        state.uploadQueue.splice(index, 1);
        renderUploadQueue();
      });

      row.appendChild(label);
      row.appendChild(removeButton);
      uploadQueueNode.appendChild(row);
    });
  }

  async function uploadQueuedFiles() {
    if (isUploadingQueue) {
      return;
    }
    if (!state.uploadQueue.length) {
      setStatusMessage("Queue at least one image first.");
      return;
    }

    const selectedTripSlug = uploadTripSelect.value || draft.trips[0]?.slug || "";
    if (!selectedTripSlug) {
      setStatusMessage("Create a trip before uploading.");
      return;
    }

    if (!shared || typeof shared.uploadRemotePhotoFile !== "function") {
      setStatusMessage("Upload helper is unavailable.");
      return;
    }

    const authed = await ensureRemoteSession(true);
    if (!authed) {
      setStatusMessage("Sign in to Firebase before uploading.");
      return;
    }

    const queue = [...state.uploadQueue];
    const defaultRating = clampRating(Number(uploadRatingSelect.value));
    const defaultDate = normalizeDate(uploadDateInput.value);
    const defaultLocation = normalizeOptionalText(uploadLocationInput.value);
    const useMetadataRating = !uploadDefaultState.ratingTouched;
    const useMetadataDate = !uploadDefaultState.dateTouched;
    const createdPhotos = [];

    isUploadingQueue = true;
    setUploadBusy(true);
    updateUploadProgress({
      hidden: false,
      value: 0,
      label: `Preparing ${queue.length} image${queue.length > 1 ? "s" : ""}...`,
    });

    try {
      for (let index = 0; index < queue.length; index += 1) {
        const sourceFile = queue[index];
        const ordinal = `${index + 1}/${queue.length}`;
        updateUploadProgress({
          hidden: false,
          value: Math.round((index / queue.length) * 100),
          label: `Preparing image ${ordinal}: ${sourceFile.name}`,
        });

        const preparedFile =
          typeof shared.prepareRemotePhotoUploadFile === "function"
            ? await shared.prepareRemotePhotoUploadFile(sourceFile)
            : sourceFile;

        const metadata =
          useMetadataRating || useMetadataDate
            ? await resolvePhotoMetadata(sourceFile)
            : { capturedOn: "", rating: 0 };

        const uploaded = await shared.uploadRemotePhotoFile({
          file: preparedFile,
          birdKey: `gallery-${selectedTripSlug}`,
          onProgress: ({ bytesTransferred, totalBytes }) => {
            const transferred = Math.max(0, Number(bytesTransferred) || 0);
            const total = Math.max(0, Number(totalBytes) || 0);
            const ratio = total > 0 ? Math.min(1, transferred / total) : transferred > 0 ? 0.01 : 0;
            const overall = Math.min(1, (index + ratio) / queue.length);
            const labelSuffix =
              total > 0
                ? `${Math.round(ratio * 100)}% (${formatBytes(transferred)} / ${formatBytes(total)})`
                : `${Math.round(ratio * 100)}%`;
            updateUploadProgress({
              hidden: false,
              value: Math.round(overall * 100),
              label: `Uploading image ${ordinal}: ${labelSuffix}`,
            });
          },
        });

        createdPhotos.push({
          id: buildUniquePhotoId(selectedTripSlug, sourceFile.name),
          tripSlug: selectedTripSlug,
          src: normalizePhotoSrc(uploaded.src),
          alt: buildDefaultAltText(selectedTripSlug),
          rating: useMetadataRating && metadata.rating > 0 ? metadata.rating : defaultRating,
          isFavorite: false,
          capturedOn: useMetadataDate && metadata.capturedOn ? metadata.capturedOn : defaultDate,
          location: defaultLocation,
          subject: "",
          tags: [],
        });
      }
    } catch (error) {
      setStatusMessage(`Upload failed: ${formatErrorMessage(error)}`);
      updateUploadProgress({ hidden: true, value: 0, label: "" });
      isUploadingQueue = false;
      setUploadBusy(false);
      return;
    }

    draft.photos = sanitizeDraft({
      trips: draft.trips,
      photos: [...createdPhotos, ...draft.photos],
    }).photos;
    state.uploadQueue = [];
    state.selectedPhotoId = createdPhotos[0]?.id || state.selectedPhotoId;
    persistDraft(`Uploaded ${createdPhotos.length} image${createdPhotos.length > 1 ? "s" : ""}.`);
    renderUploadQueue();
    renderPhotoList();
    renderEditor();
    updateUploadProgress({ hidden: true, value: 0, label: "" });
    isUploadingQueue = false;
    setUploadBusy(false);
    await syncRemoteDraft("Upload metadata sync", { interactive: false });
  }

  function setUploadBusy(isBusy) {
    uploadStartButton.disabled = isBusy;
    uploadClearButton.disabled = isBusy;
    fileInput.disabled = isBusy;
    dropzoneNode.classList.toggle("is-disabled", isBusy);
  }

  function updateUploadProgress({ hidden, value, label }) {
    uploadProgressNode.toggleAttribute("hidden", Boolean(hidden));
    uploadProgressBar.value = Math.max(0, Math.min(100, Number(value) || 0));
    uploadProgressLabel.textContent = String(label || "");
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
      photos: photos.sort(comparePhotos),
    };
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

  function buildUniqueTripSlug(baseSlug) {
    const normalizedBase = slugify(baseSlug) || "trip";
    const existing = new Set(draft.trips.map((trip) => trip.slug));
    if (!existing.has(normalizedBase)) {
      return normalizedBase;
    }

    let suffix = 2;
    while (existing.has(`${normalizedBase}-${suffix}`)) {
      suffix += 1;
    }
    return `${normalizedBase}-${suffix}`;
  }

  function buildUniquePhotoId(tripSlug, fileName) {
    const existing = new Set(draft.photos.map((photo) => photo.id));
    const baseName = slugify(removeFileExtension(fileName)) || "photo";
    const baseId = slugify(`${tripSlug}-${baseName}`) || `${tripSlug}-photo`;
    if (!existing.has(baseId)) {
      return baseId;
    }

    let suffix = 2;
    while (existing.has(`${baseId}-${suffix}`)) {
      suffix += 1;
    }
    return `${baseId}-${suffix}`;
  }

  function ratingLabel(value) {
    const rating = clampRating(Number(value));
    return rating > 0 ? `${"\u2605".repeat(rating)} ${rating}/5` : "Unrated";
  }

  function tripTitleForSlug(slug) {
    const match = draft.trips.find((trip) => trip.slug === slug);
    return match ? match.title : toTitleCase(String(slug || "Unsorted"));
  }

  function tripVisibleLabel(slug) {
    const match = draft.trips.find((trip) => trip.slug === slug);
    if (!match) {
      return "";
    }
    const baseOn = match.showInBasePage !== false;
    const carouselOn = match.showInCarousel !== false;
    if (!baseOn && !carouselOn) {
      return " (Hidden)";
    }
    if (baseOn && carouselOn) {
      return "";
    }
    if (!baseOn) {
      return " (Base Off)";
    }
    return " (Carousel Off)";
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

  function removeFileExtension(value) {
    return String(value || "").replace(/\.[a-z0-9]+$/i, "");
  }

  function buildDefaultAltText(tripSlug) {
    const tripTitle = tripTitleForSlug(tripSlug);
    return tripTitle ? `${tripTitle} photograph` : "Photograph";
  }

  function humanizeFileName(value) {
    return toTitleCase(
      removeFileExtension(String(value || "photo"))
        .replace(/[-_]+/g, " ")
        .trim(),
    );
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function toTitleCase(value) {
    return String(value || "")
      .trim()
      .split(/\s+/)
      .map((chunk) => chunk.slice(0, 1).toUpperCase() + chunk.slice(1).toLowerCase())
      .join(" ");
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function deepClone(value) {
    if (typeof window.structuredClone === "function") {
      return window.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function formatBytes(bytes) {
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
  }

  function formatErrorMessage(error) {
    if (error && typeof error === "object" && "message" in error && error.message) {
      return String(error.message);
    }
    return "Unknown error";
  }

  function downloadTextFile(filename, contents) {
    const blob = new window.Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  function draftToPhotosTs(photos) {
    const rows = [...photos].sort(comparePhotos);
    const lines = [];
    lines.push("export interface PhotographyPhotoRecord {");
    lines.push("  id: string;");
    lines.push("  tripSlug: string;");
    lines.push("  src: string;");
    lines.push("  alt: string;");
    lines.push("  rating: number;");
    lines.push("  isFavorite?: boolean;");
    lines.push("  capturedOn?: string;");
    lines.push("  location?: string;");
    lines.push("  subject?: string;");
    lines.push("  tags?: string[];");
    lines.push("  iso?: number;");
    lines.push("  shutterSpeed?: string;");
    lines.push("  aperture?: string;");
    lines.push("  camera?: string;");
    lines.push("  lens?: string;");
    lines.push("}");
    lines.push("");
    lines.push("// Generated from /photography/admin");
    lines.push("export const photographyPhotoRecords: PhotographyPhotoRecord[] = [");
    rows.forEach((photo) => {
      lines.push("  {");
      lines.push(`    id: ${JSON.stringify(photo.id)},`);
      lines.push(`    tripSlug: ${JSON.stringify(photo.tripSlug)},`);
      lines.push(`    src: ${JSON.stringify(photo.src)},`);
      lines.push(`    alt: ${JSON.stringify(photo.alt)},`);
      lines.push(`    rating: ${clampRating(photo.rating)},`);
      if (photo.isFavorite) {
        lines.push("    isFavorite: true,");
      }
      if (photo.capturedOn) {
        lines.push(`    capturedOn: ${JSON.stringify(photo.capturedOn)},`);
      }
      if (photo.location) {
        lines.push(`    location: ${JSON.stringify(photo.location)},`);
      }
      if (photo.subject) {
        lines.push(`    subject: ${JSON.stringify(photo.subject)},`);
      }
      if (photo.tags && photo.tags.length) {
        lines.push(`    tags: ${JSON.stringify(photo.tags)},`);
      }
      if (Number.isFinite(photo.iso) && Number(photo.iso) > 0) {
        lines.push(`    iso: ${Math.round(Number(photo.iso))},`);
      }
      if (photo.shutterSpeed) {
        lines.push(`    shutterSpeed: ${JSON.stringify(photo.shutterSpeed)},`);
      }
      if (photo.aperture) {
        lines.push(`    aperture: ${JSON.stringify(photo.aperture)},`);
      }
      if (photo.camera) {
        lines.push(`    camera: ${JSON.stringify(photo.camera)},`);
      }
      if (photo.lens) {
        lines.push(`    lens: ${JSON.stringify(photo.lens)},`);
      }
      lines.push("  },");
    });
    lines.push("];");
    lines.push("");
    return lines.join("\n");
  }

  function draftToTripsTs(trips) {
    const rows = sortTrips(trips);
    const lines = [];
    lines.push("export interface PhotographyTrip {");
    lines.push("  slug: string;");
    lines.push("  title: string;");
    lines.push("  year: string;");
    lines.push("  legacyPath: string;");
    lines.push("  coverImage: string;");
    lines.push("  highlights: string[];");
    lines.push("  showOnPhotographyPage?: boolean;");
    lines.push("  showInBasePage?: boolean;");
    lines.push("  showInCarousel?: boolean;");
    lines.push("}");
    lines.push("");
    lines.push("// Generated from /photography/admin");
    lines.push("export const photographyTrips: PhotographyTrip[] = [");
    rows.forEach((trip) => {
      const highlights = draft.photos
        .filter((photo) => photo.tripSlug === trip.slug)
        .slice(0, 3)
        .map((photo) => photo.src);
      const coverImage = trip.coverImage || highlights[0] || "";
      const showInBasePage = trip.showInBasePage !== false;
      const showInCarousel = trip.showInCarousel !== false;
      const showOnPhotographyPage = showInBasePage || showInCarousel;

      lines.push("  {");
      lines.push(`    slug: ${JSON.stringify(trip.slug)},`);
      lines.push(`    title: ${JSON.stringify(trip.title)},`);
      lines.push(`    year: ${JSON.stringify(trip.year || "")},`);
      lines.push(`    legacyPath: ${JSON.stringify(trip.legacyPath)},`);
      lines.push(`    coverImage: ${JSON.stringify(coverImage)},`);
      lines.push(`    showOnPhotographyPage: ${showOnPhotographyPage ? "true" : "false"},`);
      lines.push(`    showInBasePage: ${showInBasePage ? "true" : "false"},`);
      lines.push(`    showInCarousel: ${showInCarousel ? "true" : "false"},`);
      lines.push(`    highlights: ${JSON.stringify(highlights.length ? highlights : coverImage ? [coverImage] : [])},`);
      lines.push("  },");
    });
    lines.push("];");
    lines.push("");
    return lines.join("\n");
  }
})();
