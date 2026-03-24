(() => {
  const STORAGE_KEY = "ellisJoyceBirdAdminDraftV1";
  const REMOTE_COLLECTION = "birdAtlas";
  const REMOTE_DOCUMENT = "publicData";
  const DEFAULT_UPLOAD_MAX_DIMENSION = 2200;
  const DEFAULT_UPLOAD_TARGET_BYTES = 2_500_000;
  const DEFAULT_UPLOAD_QUALITY = 0.82;
  const DEFAULT_UPLOAD_TIMEOUT_MS = 90 * 1000;
  const EXIF_SCAN_BYTES = 2 * 1024 * 1024;
  const EXIFR_EXIF_FIRST_TAGS = [
    "DateTimeOriginal",
    "SubSecDateTimeOriginal",
    "OffsetTimeOriginal",
    "DateTimeDigitized",
    "SubSecDateTimeDigitized",
    "CreateDate",
    "DateCreated",
    "DateTimeCreated",
    "DigitalCreationDate",
    "GPSDateStamp",
    "GPSDateTime",
    "DateTime",
  ];
  const EXIFR_FALLBACK_TAGS = [
    ...EXIFR_EXIF_FIRST_TAGS,
    "ModifyDate",
    "MetadataDate",
    "ProfileDateTime",
  ];
  const EXIFR_RATING_TAGS = [
    "Rating",
    "XMP:Rating",
    "xmp:Rating",
    "xmpRating",
  ];
  const EXIFR_METADATA_TAGS = [...new Set([...EXIFR_FALLBACK_TAGS, ...EXIFR_RATING_TAGS])];
  const photoMetadataCache = new WeakMap();

  const normalizeKey = (value) => (value || "").trim().toLowerCase();
  const normalizePhotoSrc = (value) => {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    if (/^file:/i.test(raw) || /^\/(Users|home|private)\//.test(raw) || /^[A-Za-z]:[\\/]/.test(raw)) {
      return "";
    }

    if (/^(https?:)?\/\//i.test(raw) || /^data:/i.test(raw) || /^blob:/i.test(raw) || raw.startsWith("/")) {
      return raw;
    }

    if (raw.startsWith("assets/")) {
      return `/${raw}`;
    }

    const cleaned = raw.replace(/^\.?\/*/, "");
    return cleaned ? `/${cleaned}` : "";
  };

  const loadDraft = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return sanitizeDraft(parsed);
    } catch (_error) {
      return null;
    }
  };

  const saveDraft = (draft) => {
    const safeDraft = sanitizeDraft(draft);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeDraft));
    return safeDraft;
  };

  const clearDraft = () => {
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const sanitizeDraft = (raw) => {
    const status = {};
    const photos = [];

    if (raw && typeof raw === "object") {
      const rawStatus = raw.status;
      if (rawStatus && typeof rawStatus === "object") {
        Object.entries(rawStatus).forEach(([key, value]) => {
          const normalized = normalizeKey(key);
          if (!normalized || !value || typeof value !== "object") {
            return;
          }

          const normalizedStatus = {
            seen: Boolean(value.seen),
            ...(value.firstSeenDate ? { firstSeenDate: String(value.firstSeenDate) } : {}),
            ...(value.lastSeenDate ? { lastSeenDate: String(value.lastSeenDate) } : {}),
            ...(value.notes ? { notes: String(value.notes) } : {}),
          };

          // Drop legacy empty entries (`seen: false` with no extra fields) so
          // synced seen data remains authoritative unless explicitly overridden.
          if (
            !normalizedStatus.seen &&
            !normalizedStatus.firstSeenDate &&
            !normalizedStatus.lastSeenDate &&
            !normalizedStatus.notes
          ) {
            return;
          }

          status[normalized] = normalizedStatus;
        });
      }

      const rawPhotos = raw.photos;
      if (Array.isArray(rawPhotos)) {
        rawPhotos.forEach((photo) => {
          if (!photo || typeof photo !== "object") {
            return;
          }

          const birdKey = normalizeKey(photo.birdKey);
          const src = normalizePhotoSrc(photo.src);
          const alt = String(photo.alt || "").trim();
          if (!birdKey || !src) {
            return;
          }

          photos.push({
            birdKey,
            src,
            alt,
            ...(normalizeRating(photo.rating) ? { rating: normalizeRating(photo.rating) } : {}),
            ...(photo.capturedOn ? { capturedOn: String(photo.capturedOn) } : {}),
            ...(photo.country ? { country: String(photo.country) } : {}),
            ...(photo.state ? { state: String(photo.state) } : {}),
            ...(photo.county ? { county: String(photo.county) } : {}),
            ...(photo.location ? { location: String(photo.location) } : {}),
            ...(photo.trip ? { trip: String(photo.trip) } : {}),
            ...(photo.notes ? { notes: String(photo.notes) } : {}),
          });
        });
      }
    }

    return { status, photos };
  };

  const buildPhotoMap = (photos) => {
    const map = new Map();
    (photos || []).forEach((photo) => {
      const key = normalizeKey(photo.birdKey);
      if (!key) {
        return;
      }

      const existing = map.get(key);
      if (existing) {
        existing.push(photo);
      } else {
        map.set(key, [photo]);
      }
    });
    return map;
  };

  const createSeedDraft = (species) => {
    const status = {};
    const photos = [];

    (species || []).forEach((bird) => {
      const key = normalizeKey(bird.birdKey);
      if (!key) {
        return;
      }

      if (bird.seen || bird.firstSeenDate || bird.lastSeenDate || bird.personalNotes) {
        status[key] = {
          seen: Boolean(bird.seen),
          ...(bird.firstSeenDate ? { firstSeenDate: String(bird.firstSeenDate) } : {}),
          ...(bird.lastSeenDate ? { lastSeenDate: String(bird.lastSeenDate) } : {}),
          ...(bird.personalNotes ? { notes: String(bird.personalNotes) } : {}),
        };
      }

      (bird.photos || []).forEach((photo) => {
        if (!photo || !photo.src) {
          return;
        }

        const src = normalizePhotoSrc(photo.src);
        if (!src) {
          return;
        }

        photos.push({
          birdKey: key,
          src,
          alt: String(photo.alt || ""),
          ...(normalizeRating(photo.rating) ? { rating: normalizeRating(photo.rating) } : {}),
          ...(photo.capturedOn ? { capturedOn: String(photo.capturedOn) } : {}),
          ...(photo.country ? { country: String(photo.country) } : {}),
          ...(photo.state ? { state: String(photo.state) } : {}),
          ...(photo.county ? { county: String(photo.county) } : {}),
          ...(photo.location ? { location: String(photo.location) } : {}),
          ...(photo.trip ? { trip: String(photo.trip) } : {}),
          ...(photo.notes ? { notes: String(photo.notes) } : {}),
        });
      });
    });

    return sanitizeDraft({ status, photos });
  };

  const draftToStatusTs = (status) => {
    const keys = Object.keys(status || {}).sort((a, b) => a.localeCompare(b));
    const lines = [];

    lines.push("export interface BirdPersonalStatus {");
    lines.push("  seen: boolean;");
    lines.push("  firstSeenDate?: string;");
    lines.push("  lastSeenDate?: string;");
    lines.push("  notes?: string;");
    lines.push("}");
    lines.push("");
    lines.push("export const personalBirdStatus: Record<string, BirdPersonalStatus> = {");

    keys.forEach((key) => {
      const value = status[key] || { seen: false };
      lines.push(`  ${JSON.stringify(key)}: {`);
      lines.push(`    seen: ${value.seen ? "true" : "false"},`);
      if (value.firstSeenDate) {
        lines.push(`    firstSeenDate: ${JSON.stringify(value.firstSeenDate)},`);
      }
      if (value.lastSeenDate) {
        lines.push(`    lastSeenDate: ${JSON.stringify(value.lastSeenDate)},`);
      }
      if (value.notes) {
        lines.push(`    notes: ${JSON.stringify(value.notes)},`);
      }
      lines.push("  },");
    });

    lines.push("};");
    lines.push("");
    return lines.join("\n");
  };

  const draftToPhotosTs = (photos) => {
    const sortedPhotos = [...(photos || [])].sort((a, b) => {
      const keyCompare = String(a.birdKey).localeCompare(String(b.birdKey));
      if (keyCompare !== 0) {
        return keyCompare;
      }

      return String(a.src).localeCompare(String(b.src));
    });

    const lines = [];
    lines.push("export interface BirdPhotoRecord {");
    lines.push("  birdKey: string;");
    lines.push("  src: string;");
    lines.push("  alt: string;");
    lines.push("  rating?: number;");
    lines.push("  capturedOn?: string;");
    lines.push("  country?: string;");
    lines.push("  state?: string;");
    lines.push("  county?: string;");
    lines.push("  location?: string;");
    lines.push("  trip?: string;");
    lines.push("  notes?: string;");
    lines.push("}");
    lines.push("");
    lines.push("export const birdPhotoRecords: BirdPhotoRecord[] = [");

    sortedPhotos.forEach((photo) => {
      lines.push("  {");
      lines.push(`    birdKey: ${JSON.stringify(photo.birdKey)},`);
      lines.push(`    src: ${JSON.stringify(photo.src)},`);
      lines.push(`    alt: ${JSON.stringify(photo.alt)},`);
      if (normalizeRating(photo.rating)) {
        lines.push(`    rating: ${normalizeRating(photo.rating)},`);
      }
      if (photo.capturedOn) {
        lines.push(`    capturedOn: ${JSON.stringify(photo.capturedOn)},`);
      }
      if (photo.country) {
        lines.push(`    country: ${JSON.stringify(photo.country)},`);
      }
      if (photo.state) {
        lines.push(`    state: ${JSON.stringify(photo.state)},`);
      }
      if (photo.county) {
        lines.push(`    county: ${JSON.stringify(photo.county)},`);
      }
      if (photo.location) {
        lines.push(`    location: ${JSON.stringify(photo.location)},`);
      }
      if (photo.trip) {
        lines.push(`    trip: ${JSON.stringify(photo.trip)},`);
      }
      if (photo.notes) {
        lines.push(`    notes: ${JSON.stringify(photo.notes)},`);
      }
      lines.push("  },");
    });

    lines.push("];\n");
    return lines.join("\n");
  };

  const isRemoteAvailable = () => Boolean(getRemoteDocRef());

  const hasRemoteUser = () => {
    const auth = getAuth();
    return Boolean(auth && auth.currentUser);
  };

  const signInRemote = async (email, password) => {
    const auth = getAuth();
    if (!auth) {
      throw new Error("Firebase Auth is not available.");
    }

    if (auth.currentUser) {
      return auth.currentUser;
    }

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const credential = await auth.signInWithEmailAndPassword(String(email).trim(), String(password));
    return credential?.user || null;
  };

  const signInRemoteWithGoogle = async () => {
    const firebase = getFirebaseNamespace();
    const auth = getAuth();
    if (!firebase || !auth || typeof firebase.auth?.GoogleAuthProvider !== "function") {
      throw new Error("Firebase Google Auth is not available.");
    }

    if (auth.currentUser) {
      return auth.currentUser;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    const credential = await auth.signInWithPopup(provider);
    return credential?.user || null;
  };

  const signInRemoteWithGoogleRedirect = async () => {
    const firebase = getFirebaseNamespace();
    const auth = getAuth();
    if (!firebase || !auth || typeof firebase.auth?.GoogleAuthProvider !== "function") {
      throw new Error("Firebase Google Auth is not available.");
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithRedirect(provider);
    return null;
  };

  const loadRemoteDraft = async () => {
    const docRef = getRemoteDocRef();
    if (docRef) {
      try {
        const snapshot = await docRef.get();
        if (snapshot.exists) {
          const data = snapshot.data();
          return sanitizeDraft(data);
        }
      } catch (_error) {}
    }

    return loadRemoteDraftViaRest();
  };

  const saveRemoteDraft = async (draft) => {
    const firebase = getFirebaseNamespace();
    const docRef = getRemoteDocRef();
    if (!firebase || !docRef) {
      throw new Error("Firebase Firestore is not available.");
    }

    const safeDraft = sanitizeDraft(draft);
    const payload = {
      status: safeDraft.status,
      photos: safeDraft.photos,
      schemaVersion: 1,
      updatedAtIso: new Date().toISOString(),
    };

    if (firebase.firestore?.FieldValue?.serverTimestamp) {
      payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    await docRef.set(payload, { merge: true });
    return safeDraft;
  };

  const subscribeRemoteDraft = (listener) => {
    const docRef = getRemoteDocRef();
    if (!docRef || typeof listener !== "function") {
      return () => {};
    }

    try {
      const unsubscribe = docRef.onSnapshot(
        (snapshot) => {
          if (!snapshot.exists) {
            listener(null);
            return;
          }

          listener(sanitizeDraft(snapshot.data()));
        },
        () => {},
      );

      return typeof unsubscribe === "function" ? unsubscribe : () => {};
    } catch (_error) {
      return () => {};
    }
  };

  const prepareRemotePhotoUploadFile = async (file, options = {}) => {
    if (!(file instanceof window.File)) {
      throw new Error("A browser File is required.");
    }

    if (!String(file.type || "").startsWith("image/")) {
      return file;
    }

    const maxDimension = clampUploadNumber(options.maxDimension, DEFAULT_UPLOAD_MAX_DIMENSION, 512, 6000);
    const targetBytes = clampUploadNumber(options.targetBytes, DEFAULT_UPLOAD_TARGET_BYTES, 100_000, 20_000_000);
    const quality = clampUploadNumber(options.quality, DEFAULT_UPLOAD_QUALITY, 0.5, 0.95);

    let imageData = null;
    try {
      imageData = await loadImageFromFile(file);
      const sourceWidth = imageData.image.naturalWidth || imageData.image.width;
      const sourceHeight = imageData.image.naturalHeight || imageData.image.height;
      if (!sourceWidth || !sourceHeight) {
        return file;
      }

      const largestSide = Math.max(sourceWidth, sourceHeight);
      const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
      const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        return file;
      }

      context.drawImage(imageData.image, 0, 0, targetWidth, targetHeight);

      const outputType = chooseUploadMimeType(file.type);
      let outputQuality = outputType === "image/jpeg" || outputType === "image/webp" ? quality : undefined;
      let blob = await canvasToBlob(canvas, outputType, outputQuality);
      if (!blob) {
        return file;
      }

      while (
        outputQuality !== undefined &&
        blob.size > targetBytes &&
        outputQuality > 0.55
      ) {
        outputQuality = Math.max(0.55, outputQuality - 0.08);
        const reduced = await canvasToBlob(canvas, outputType, outputQuality);
        if (!reduced || reduced.size >= blob.size) {
          break;
        }
        blob = reduced;
      }

      const gotDimensionWin = targetWidth < sourceWidth || targetHeight < sourceHeight;
      const gotSizeWin = blob.size < file.size * 0.95;
      if (!gotDimensionWin && !gotSizeWin) {
        return file;
      }

      const nextName = buildUploadOutputName(file.name, outputType);
      return new window.File([blob], nextName, {
        type: outputType,
        lastModified: Date.now(),
      });
    } catch (_error) {
      return file;
    } finally {
      if (imageData?.cleanup) {
        imageData.cleanup();
      }
    }
  };

  const extractPhotoMetadata = async (file) => {
    if (!(file instanceof window.File)) {
      return { capturedOn: "", rating: 0 };
    }

    if (!String(file.type || "").startsWith("image/")) {
      return { capturedOn: "", rating: 0 };
    }

    const cached = photoMetadataCache.get(file);
    if (cached) {
      return cached;
    }

    const pending = (async () => {
      let capturedOn = "";
      let rating = 0;

      const exifrMetadata = await extractMetadataWithExifr(file);
      if (exifrMetadata.capturedOn) {
        capturedOn = exifrMetadata.capturedOn;
      }
      if (exifrMetadata.rating) {
        rating = exifrMetadata.rating;
      }

      if (!capturedOn || !rating) {
        const rawMetadata = await extractPhotoMetadataFromRawMetadataText(file);
        if (!capturedOn && rawMetadata.capturedOn) {
          capturedOn = rawMetadata.capturedOn;
        }
        if (!rating && rawMetadata.rating) {
          rating = rawMetadata.rating;
        }
      }

      if (!capturedOn) {
        try {
          const scanLength = Math.min(EXIF_SCAN_BYTES, Number(file.size) || EXIF_SCAN_BYTES);
          const buffer = await file.slice(0, scanLength).arrayBuffer();
          capturedOn = extractExifDateFromJpegBuffer(buffer);
        } catch (_error) {
          capturedOn = "";
        }
      }

      return {
        capturedOn: capturedOn || "",
        rating: normalizeRating(rating) || 0,
      };
    })().catch(() => ({ capturedOn: "", rating: 0 }));

    photoMetadataCache.set(file, pending);
    return pending;
  };

  const extractPhotoTakenDate = async (file) => {
    const metadata = await extractPhotoMetadata(file);
    return metadata.capturedOn || "";
  };

  const extractPhotoRating = async (file) => {
    const metadata = await extractPhotoMetadata(file);
    return metadata.rating || 0;
  };

  async function extractMetadataWithExifr(file) {
    const exifr = window.exifr;
    if (!exifr || typeof exifr.parse !== "function") {
      return { capturedOn: "", rating: 0 };
    }

    try {
      const merged = await exifr.parse(file, {
        pick: EXIFR_METADATA_TAGS,
        xmp: true,
        iptc: true,
        reviveValues: false,
      });

      return {
        capturedOn: extractDateFromStructuredMetadata(merged, EXIFR_FALLBACK_TAGS),
        rating: extractRatingFromStructuredMetadata(merged, EXIFR_RATING_TAGS),
      };
    } catch (_error) {
      return { capturedOn: "", rating: 0 };
    }
  }

  function extractDateFromStructuredMetadata(metadata, preferredTags) {
    if (!metadata || typeof metadata !== "object" || !Array.isArray(preferredTags)) {
      return "";
    }

    for (const tagName of preferredTags) {
      const values = collectMetadataValuesForTag(metadata, tagName);
      for (const value of values) {
        const normalized = normalizeDateCandidate(value);
        if (normalized) {
          return normalized;
        }
      }
    }

    return "";
  }

  function extractRatingFromStructuredMetadata(metadata, preferredTags) {
    if (!metadata || typeof metadata !== "object" || !Array.isArray(preferredTags)) {
      return 0;
    }

    for (const tagName of preferredTags) {
      const values = collectMetadataValuesForTag(metadata, tagName);
      for (const value of values) {
        const normalized = normalizeRatingCandidate(value);
        if (normalized) {
          return normalized;
        }
      }
    }

    return 0;
  }

  function collectMetadataValuesForTag(metadata, tagName) {
    const matches = [];
    if (!metadata || typeof metadata !== "object") {
      return matches;
    }

    const target = normalizeMetadataTagName(tagName);
    walkMetadata(metadata, (key, value) => {
      if (normalizeMetadataTagName(key) === target) {
        matches.push(value);
      }
    });
    return matches;
  }

  function normalizeMetadataTagName(key) {
    return String(key || "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
  }

  function walkMetadata(node, visit, visited = new Set()) {
    if (!node || typeof node !== "object" || visited.has(node)) {
      return;
    }
    visited.add(node);

    if (Array.isArray(node)) {
      node.forEach((value, index) => {
        if (typeof visit === "function") {
          visit(String(index), value);
        }
        walkMetadata(value, visit, visited);
      });
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      if (typeof visit === "function") {
        visit(key, value);
      }
      walkMetadata(value, visit, visited);
    });
  }

  async function extractPhotoMetadataFromRawMetadataText(file) {
    if (!(file instanceof window.File)) {
      return { capturedOn: "", rating: 0 };
    }

    const scanLength = Math.min(Math.max(EXIF_SCAN_BYTES * 2, 512 * 1024), Number(file.size) || EXIF_SCAN_BYTES * 2);
    if (!Number.isFinite(scanLength) || scanLength <= 0) {
      return { capturedOn: "", rating: 0 };
    }

    try {
      const buffer = await file.slice(0, scanLength).arrayBuffer();
      const decoder = new TextDecoder("latin1");
      const text = decoder.decode(buffer);
      if (!text) {
        return { capturedOn: "", rating: 0 };
      }

      const datePatterns = [
        /datetimeoriginal[^0-9]{0,40}(\d{4}[\/:\-]\d{1,2}[\/:\-]\d{1,2})/i,
        /subsecdatetimeoriginal[^0-9]{0,40}(\d{4}[\/:\-]\d{1,2}[\/:\-]\d{1,2})/i,
        /datecreated[^0-9]{0,40}(\d{4}[\/:\-]\d{1,2}[\/:\-]\d{1,2})/i,
        /datetimecreated[^0-9]{0,40}(\d{4}[\/:\-]\d{1,2}[\/:\-]\d{1,2})/i,
        /createdate[^0-9]{0,40}(\d{4}[\/:\-]\d{1,2}[\/:\-]\d{1,2})/i,
        /datetimedigitized[^0-9]{0,40}(\d{4}[\/:\-]\d{1,2}[\/:\-]\d{1,2})/i,
        /gpsdatestamp[^0-9]{0,40}(\d{4}[\/:\-]\d{1,2}[\/:\-]\d{1,2})/i,
      ];
      const ratingPatterns = [
        /(?:\bxmp:rating\b|\brating\b)\D{0,24}(-?\d{1,2})/i,
      ];

      let capturedOn = "";
      let rating = 0;

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        const normalized = normalizeExifDateText(match?.[1]);
        if (normalized) {
          capturedOn = normalized;
          break;
        }
      }

      for (const pattern of ratingPatterns) {
        const match = text.match(pattern);
        const normalized = normalizeRatingCandidate(match?.[1]);
        if (normalized) {
          rating = normalized;
          break;
        }
      }

      return { capturedOn, rating };
    } catch (_error) {
      return { capturedOn: "", rating: 0 };
    }
  }

  async function extractDateFromRawMetadataText(file) {
    const metadata = await extractPhotoMetadataFromRawMetadataText(file);
    return metadata.capturedOn || "";
  }

  const uploadRemotePhotoFile = async ({ file, birdKey, onProgress }) => {
    const storage = getStorage();
    if (!storage) {
      throw new Error("Firebase Storage is not available.");
    }

    if (!(file instanceof window.File)) {
      throw new Error("A browser File is required for upload.");
    }

    const safeBirdKey = normalizeKey(birdKey) || "unknown";
    const safeFileName = sanitizeUploadFileName(file.name || "photo.jpg");
    const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const objectPath = `bird-atlas-photos/${safeBirdKey}/${uniquePrefix}-${safeFileName}`;

    const objectRef = storage.ref().child(objectPath);
    const metadata = {
      cacheControl: "public,max-age=31536000,immutable",
      ...(file.type ? { contentType: file.type } : {}),
    };

    const uploadTask = objectRef.put(file, metadata);
    const uploadSnapshot = await awaitUploadTask(uploadTask, onProgress);
    const src =
      uploadSnapshot?.ref && typeof uploadSnapshot.ref.getDownloadURL === "function"
        ? await uploadSnapshot.ref.getDownloadURL()
        : await objectRef.getDownloadURL();

    return {
      src,
      objectPath,
    };
  };

  const probeRemoteStorage = async () => {
    const app = getFirebaseApp();
    if (!app) {
      return { ok: false, message: "Firebase app is not initialized." };
    }

    const bucket = getStorageBucketName(app);
    if (!bucket) {
      return { ok: false, message: "No Firebase Storage bucket is configured in /__/firebase/init.js." };
    }

    const probeUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`;
    try {
      const response = await fetch(probeUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 404) {
        return {
          ok: false,
          message: `Storage bucket "${bucket}" was not found. Enable Cloud Storage in Firebase and create a default bucket.`,
        };
      }

      if (response.ok || response.status === 401 || response.status === 403) {
        return { ok: true, message: "" };
      }

      return {
        ok: false,
        message: `Storage endpoint check returned HTTP ${response.status}.`,
      };
    } catch (error) {
      return {
        ok: false,
        message: `Storage endpoint check failed: ${error && error.message ? error.message : "network error"}`,
      };
    }
  };

  window.BirdAdminShared = {
    STORAGE_KEY,
    REMOTE_COLLECTION,
    REMOTE_DOCUMENT,
    normalizeKey,
    loadDraft,
    saveDraft,
    clearDraft,
    sanitizeDraft,
    buildPhotoMap,
    createSeedDraft,
    draftToStatusTs,
    draftToPhotosTs,
    isRemoteAvailable,
    hasRemoteUser,
    signInRemote,
    signInRemoteWithGoogle,
    signInRemoteWithGoogleRedirect,
    loadRemoteDraft,
    saveRemoteDraft,
    subscribeRemoteDraft,
    probeRemoteStorage,
    prepareRemotePhotoUploadFile,
    uploadRemotePhotoFile,
    extractPhotoMetadata,
    extractPhotoTakenDate,
    extractPhotoRating,
  };

  function getFirebaseNamespace() {
    const firebase = window.firebase;
    if (!firebase || typeof firebase !== "object") {
      return null;
    }

    try {
      if (Array.isArray(firebase.apps) && firebase.apps.length > 0) {
        return firebase;
      }
    } catch (_error) {
      return null;
    }

    return null;
  }

  function getFirebaseApp() {
    const firebase = getFirebaseNamespace();
    if (!firebase || typeof firebase.app !== "function") {
      return null;
    }

    try {
      return firebase.app();
    } catch (_error) {
      return null;
    }
  }

  function getFirestore() {
    const app = getFirebaseApp();
    if (!app || typeof app.firestore !== "function") {
      return null;
    }

    try {
      return app.firestore();
    } catch (_error) {
      return null;
    }
  }

  function getStorage() {
    const app = getFirebaseApp();
    if (!app || typeof app.storage !== "function") {
      return null;
    }

    try {
      return app.storage();
    } catch (_error) {
      return null;
    }
  }

  function getStorageBucketName(app) {
    const bucket = app?.options?.storageBucket;
    return typeof bucket === "string" ? bucket.trim() : "";
  }

  async function loadRemoteDraftViaRest() {
    const app = getFirebaseApp();
    const projectId = app?.options?.projectId ? String(app.options.projectId).trim() : "";
    if (!projectId) {
      return null;
    }

    const path = `${REMOTE_COLLECTION}/${REMOTE_DOCUMENT}`;
    const endpoint =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents/${path}`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      const decoded = decodeFirestoreDocument(payload);
      return decoded ? sanitizeDraft(decoded) : null;
    } catch (_error) {
      return null;
    }
  }

  function decodeFirestoreDocument(payload) {
    const fields = payload?.fields;
    if (!fields || typeof fields !== "object") {
      return null;
    }
    return decodeFirestoreValue({ mapValue: { fields } });
  }

  function decodeFirestoreValue(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    if ("nullValue" in value) {
      return null;
    }
    if ("booleanValue" in value) {
      return Boolean(value.booleanValue);
    }
    if ("stringValue" in value) {
      return String(value.stringValue);
    }
    if ("integerValue" in value) {
      return Number(value.integerValue);
    }
    if ("doubleValue" in value) {
      return Number(value.doubleValue);
    }
    if ("timestampValue" in value) {
      return String(value.timestampValue);
    }
    if ("arrayValue" in value) {
      const entries = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
      return entries.map((entry) => decodeFirestoreValue(entry));
    }
    if ("mapValue" in value) {
      const fields = value.mapValue?.fields || {};
      const output = {};
      Object.entries(fields).forEach(([key, child]) => {
        output[key] = decodeFirestoreValue(child);
      });
      return output;
    }

    return null;
  }

  function getAuth() {
    const app = getFirebaseApp();
    if (!app || typeof app.auth !== "function") {
      return null;
    }

    try {
      return app.auth();
    } catch (_error) {
      return null;
    }
  }

  function getRemoteDocRef() {
    const firestore = getFirestore();
    if (!firestore) {
      return null;
    }

    return firestore.collection(REMOTE_COLLECTION).doc(REMOTE_DOCUMENT);
  }

  function sanitizeUploadFileName(name) {
    const cleaned = String(name || "photo.jpg")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return cleaned || "photo.jpg";
  }

  function chooseUploadMimeType(fileType) {
    const normalized = String(fileType || "").toLowerCase();
    if (normalized === "image/webp") {
      return "image/webp";
    }
    if (normalized === "image/jpeg" || normalized === "image/jpg") {
      return "image/jpeg";
    }
    return "image/jpeg";
  }

  function buildUploadOutputName(originalName, mimeType) {
    const base = sanitizeUploadFileName(removeFileExtension(String(originalName || "photo")));
    const extension = mimeType === "image/webp" ? "webp" : "jpg";
    return `${base || "photo"}.${extension}`;
  }

  function removeFileExtension(name) {
    return String(name || "").replace(/\.[a-z0-9]+$/i, "");
  }

  function clampUploadNumber(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        type,
        typeof quality === "number" ? quality : undefined,
      );
    });
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new window.Image();
      image.decoding = "async";
      image.onload = () => {
        resolve({
          image,
          cleanup: () => URL.revokeObjectURL(objectUrl),
        });
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to decode image file"));
      };
      image.src = objectUrl;
    });
  }

  function awaitUploadTask(uploadTask, onProgress) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let lastProgressAt = Date.now();
      let lastBytesTransferred = 0;
      let lastTotalBytes = 0;
      const timeoutId = window.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearInterval(stallCheckId);
        try {
          uploadTask.cancel();
        } catch (_error) {}
        reject(new Error("Upload timed out before completion."));
      }, DEFAULT_UPLOAD_TIMEOUT_MS);

      const stallCheckId = window.setInterval(() => {
        if (settled) {
          return;
        }

        const stalledForMs = Date.now() - lastProgressAt;
        if (stalledForMs < 25_000) {
          return;
        }

        const stalledAtZero = lastTotalBytes > 0 && lastBytesTransferred === 0;
        const stalledAfterStart = lastBytesTransferred > 0;
        if (!stalledAtZero && !stalledAfterStart) {
          return;
        }

        settled = true;
        window.clearTimeout(timeoutId);
        window.clearInterval(stallCheckId);
        try {
          uploadTask.cancel();
        } catch (_error) {}
        if (stalledAtZero) {
          reject(
            new Error(
              "Upload stalled at 0 bytes. Check Firebase Storage bucket setup/permissions and network connectivity.",
            ),
          );
          return;
        }
        reject(new Error("Upload stalled before completion. Check network connectivity and retry."));
      }, 5_000);

      const finish = (handler) => (value) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        window.clearInterval(stallCheckId);
        handler(value);
      };

      if (typeof onProgress === "function") {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const transferred = Number(snapshot.bytesTransferred) || 0;
            const total = Number(snapshot.totalBytes) || 0;
            if (transferred !== lastBytesTransferred || total !== lastTotalBytes) {
              lastProgressAt = Date.now();
            }
            lastBytesTransferred = transferred;
            lastTotalBytes = total;
            onProgress({
              bytesTransferred: transferred,
              totalBytes: total,
              state: snapshot.state || "",
            });
          },
          finish((error) => reject(error)),
        );
      }

      uploadTask.then(finish((snapshot) => resolve(snapshot))).catch(finish((error) => reject(error)));
    });
  }

  function extractExifDateFromJpegBuffer(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 4) {
      return "";
    }

    const view = new DataView(buffer);
    if (!isJpegStart(view)) {
      return "";
    }

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) {
        break;
      }

      let markerOffset = offset + 1;
      while (markerOffset < view.byteLength && view.getUint8(markerOffset) === 0xff) {
        markerOffset += 1;
      }
      if (markerOffset >= view.byteLength) {
        break;
      }

      const marker = view.getUint8(markerOffset);
      offset = markerOffset + 1;

      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }

      if (!hasBytes(view, offset, 2)) {
        break;
      }

      const segmentLength = view.getUint16(offset, false);
      if (segmentLength < 2) {
        break;
      }
      const segmentDataOffset = offset + 2;
      const segmentDataLength = segmentLength - 2;
      if (!hasBytes(view, segmentDataOffset, segmentDataLength)) {
        break;
      }

      if (marker === 0xe1 && segmentDataLength >= 8) {
        const exifSignature = readAscii(view, segmentDataOffset, 6);
        if (exifSignature === "Exif\0\0") {
          const exifDate = parseExifTiffDate(view, segmentDataOffset + 6, segmentDataLength - 6);
          if (exifDate) {
            return exifDate;
          }
        }
      }

      offset = segmentDataOffset + segmentDataLength;
      if (marker === 0xda) {
        break;
      }
    }

    return "";
  }

  function parseExifTiffDate(view, tiffStart, tiffLength) {
    if (!hasBytes(view, tiffStart, 8) || tiffLength < 8) {
      return "";
    }
    const tiffEnd = Math.min(view.byteLength, tiffStart + tiffLength);
    const endianFlag = readAscii(view, tiffStart, 2);
    const littleEndian = endianFlag === "II";
    if (!littleEndian && endianFlag !== "MM") {
      return "";
    }

    const magic = safeGetUint16(view, tiffStart + 2, littleEndian);
    if (magic !== 0x2a) {
      return "";
    }

    const ifd0Offset = safeGetUint32(view, tiffStart + 4, littleEndian);
    if (!Number.isFinite(ifd0Offset)) {
      return "";
    }

    const ifd0 = parseExifIfd(view, tiffStart, tiffEnd, ifd0Offset, littleEndian);
    const ifd0Date = pickExifDate(ifd0.dateValues);
    if (ifd0Date) {
      return ifd0Date;
    }

    if (Number.isFinite(ifd0.exifIfdOffset)) {
      const exifIfd = parseExifIfd(view, tiffStart, tiffEnd, ifd0.exifIfdOffset, littleEndian);
      const exifDate = pickExifDate(exifIfd.dateValues);
      if (exifDate) {
        return exifDate;
      }
    }

    return "";
  }

  function parseExifIfd(view, tiffStart, tiffEnd, ifdOffset, littleEndian) {
    const result = {
      exifIfdOffset: null,
      dateValues: [],
    };

    const ifdStart = tiffStart + Number(ifdOffset || 0);
    if (!hasBytes(view, ifdStart, 2) || ifdStart >= tiffEnd) {
      return result;
    }

    const entryCount = safeGetUint16(view, ifdStart, littleEndian);
    if (!Number.isFinite(entryCount)) {
      return result;
    }

    for (let index = 0; index < entryCount; index += 1) {
      const entryOffset = ifdStart + 2 + index * 12;
      if (!hasBytes(view, entryOffset, 12) || entryOffset + 12 > tiffEnd) {
        break;
      }

      const tag = safeGetUint16(view, entryOffset, littleEndian);
      const type = safeGetUint16(view, entryOffset + 2, littleEndian);
      const count = safeGetUint32(view, entryOffset + 4, littleEndian);
      if (!Number.isFinite(tag) || !Number.isFinite(type) || !Number.isFinite(count) || count <= 0) {
        continue;
      }

      if (tag === 0x8769) {
        result.exifIfdOffset = safeGetUint32(view, entryOffset + 8, littleEndian);
        continue;
      }

      if (tag !== 0x9003 && tag !== 0x9004 && tag !== 0x0132) {
        continue;
      }

      const text = readExifAsciiValue(view, tiffStart, tiffEnd, entryOffset, type, count, littleEndian);
      const normalized = normalizeExifDateText(text);
      if (normalized) {
        result.dateValues.push(normalized);
      }
    }

    return result;
  }

  function readExifAsciiValue(view, tiffStart, tiffEnd, entryOffset, type, count, littleEndian) {
    if (type !== 2 || count <= 0) {
      return "";
    }

    const byteCount = Number(count);
    if (!Number.isFinite(byteCount) || byteCount <= 0) {
      return "";
    }

    if (byteCount <= 4) {
      return readAscii(view, entryOffset + 8, byteCount).replace(/\0+$/, "").trim();
    }

    const valueOffset = safeGetUint32(view, entryOffset + 8, littleEndian);
    if (!Number.isFinite(valueOffset)) {
      return "";
    }

    const absoluteOffset = tiffStart + valueOffset;
    if (!hasBytes(view, absoluteOffset, byteCount) || absoluteOffset + byteCount > tiffEnd) {
      return "";
    }

    return readAscii(view, absoluteOffset, byteCount).replace(/\0+$/, "").trim();
  }

  function pickExifDate(values) {
    if (!Array.isArray(values)) {
      return "";
    }

    for (const value of values) {
      const normalized = normalizeExifDateText(value);
      if (normalized) {
        return normalized;
      }
    }
    return "";
  }

  function normalizeExifDateText(text) {
    const raw = String(text || "").trim();
    if (!raw) {
      return "";
    }

    const ymdMatch = raw.match(/^(\d{4})[\/:\-](\d{1,2})[\/:\-](\d{1,2})(?:[T\s].*)?$/);
    if (ymdMatch) {
      return toIsoDateParts(ymdMatch[1], ymdMatch[2], ymdMatch[3]);
    }

    const mdyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[T\s].*)?$/);
    if (mdyMatch) {
      return toIsoDateParts(mdyMatch[3], mdyMatch[1], mdyMatch[2]);
    }

    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) {
      return "";
    }
    const date = new Date(parsed);
    return toIsoDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  function normalizeDateCandidate(value) {
    if (!value) {
      return "";
    }

    if (value instanceof Date) {
      if (!Number.isFinite(value.getTime())) {
        return "";
      }
      return toIsoDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return "";
      }
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) {
        return "";
      }
      return toIsoDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }

    if (typeof value === "string") {
      return normalizeExifDateText(value);
    }

    if (typeof value === "object") {
      const candidates = [value.value, value.raw, value.description, value.toString?.call(value)];
      for (const candidate of candidates) {
        const normalized = normalizeDateCandidate(candidate);
        if (normalized) {
          return normalized;
        }
      }
    }

    return "";
  }

  function toIsoDateParts(yearValue, monthValue, dayValue) {
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return "";
    }
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return "";
    }
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function hasBytes(view, offset, length) {
    const start = Number(offset);
    const size = Number(length);
    if (!Number.isFinite(start) || !Number.isFinite(size) || start < 0 || size < 0) {
      return false;
    }
    return start + size <= view.byteLength;
  }

  function safeGetUint16(view, offset, littleEndian) {
    if (!hasBytes(view, offset, 2)) {
      return NaN;
    }
    return view.getUint16(offset, Boolean(littleEndian));
  }

  function safeGetUint32(view, offset, littleEndian) {
    if (!hasBytes(view, offset, 4)) {
      return NaN;
    }
    return view.getUint32(offset, Boolean(littleEndian));
  }

  function readAscii(view, offset, length) {
    if (!hasBytes(view, offset, length)) {
      return "";
    }
    let output = "";
    for (let index = 0; index < length; index += 1) {
      output += String.fromCharCode(view.getUint8(offset + index));
    }
    return output;
  }

  function isJpegStart(view) {
    return view.getUint8(0) === 0xff && view.getUint8(1) === 0xd8;
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

  function normalizeRatingCandidate(value) {
    if (value == null) {
      return 0;
    }

    if (typeof value === "number") {
      return normalizeRating(value) || 0;
    }

    if (typeof value === "string") {
      const match = value.match(/-?\d+/);
      return normalizeRating(match ? Number(match[0]) : NaN) || 0;
    }

    if (typeof value === "object") {
      if ("value" in value) {
        return normalizeRatingCandidate(value.value);
      }
      if ("rating" in value) {
        return normalizeRatingCandidate(value.rating);
      }
    }

    return 0;
  }
})();
