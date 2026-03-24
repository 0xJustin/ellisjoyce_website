(() => {
  const exifCache = new Map();
  let modalNode = null;
  let imageNode = null;
  let titleNode = null;
  let captionNode = null;
  let ratingNode = null;
  let metadataListNode = null;
  let fullResLinkNode = null;
  let activeOpenToken = 0;
  let isOpen = false;

  initialize();

  function initialize() {
    buildModal();
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
  }

  function buildModal() {
    modalNode = document.createElement("div");
    modalNode.className = "photo-lightbox";
    modalNode.setAttribute("hidden", "");
    modalNode.innerHTML = `
      <div class="photo-lightbox-backdrop" data-photo-lightbox-close></div>
      <div class="photo-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Photo viewer">
        <button class="photo-lightbox-close" type="button" data-photo-lightbox-close aria-label="Close photo viewer">Close</button>
        <figure class="photo-lightbox-figure">
          <img class="photo-lightbox-image" alt="" />
          <figcaption class="photo-lightbox-caption">
            <p class="photo-lightbox-title"></p>
            <p class="photo-lightbox-meta"></p>
            <p class="photo-lightbox-rating"></p>
            <dl class="photo-lightbox-exif"></dl>
            <a class="photo-lightbox-fullres" target="_blank" rel="noopener noreferrer">Open full-resolution image</a>
          </figcaption>
        </figure>
      </div>
    `;

    document.body.appendChild(modalNode);
    imageNode = modalNode.querySelector(".photo-lightbox-image");
    titleNode = modalNode.querySelector(".photo-lightbox-title");
    captionNode = modalNode.querySelector(".photo-lightbox-meta");
    ratingNode = modalNode.querySelector(".photo-lightbox-rating");
    metadataListNode = modalNode.querySelector(".photo-lightbox-exif");
    fullResLinkNode = modalNode.querySelector(".photo-lightbox-fullres");

    const closeTargets = modalNode.querySelectorAll("[data-photo-lightbox-close]");
    closeTargets.forEach((target) => {
      target.addEventListener("click", () => {
        closeModal();
      });
    });
  }

  function onDocumentClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest("a[data-photo-modal]");
    if (!(anchor instanceof HTMLAnchorElement)) {
      return;
    }

    event.preventDefault();
    openFromAnchor(anchor);
  }

  function onKeyDown(event) {
    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
    }
  }

  function openFromAnchor(anchor) {
    if (
      !(modalNode instanceof HTMLElement) ||
      !(imageNode instanceof HTMLImageElement) ||
      !(titleNode instanceof HTMLElement) ||
      !(captionNode instanceof HTMLElement) ||
      !(ratingNode instanceof HTMLElement) ||
      !(metadataListNode instanceof HTMLElement) ||
      !(fullResLinkNode instanceof HTMLAnchorElement)
    ) {
      return;
    }

    const fullResSrc = String(anchor.dataset.photoFullRes || anchor.getAttribute("href") || "").trim();
    if (!fullResSrc) {
      return;
    }

    const alt = String(anchor.querySelector("img")?.getAttribute("alt") || anchor.getAttribute("aria-label") || "Photo");
    const title = String(anchor.dataset.photoTitle || "").trim();
    const caption = String(anchor.dataset.photoCaption || "").trim();
    const rating = String(anchor.dataset.photoRating || "").trim();

    imageNode.src = fullResSrc;
    imageNode.alt = alt;
    titleNode.textContent = title;
    captionNode.textContent = caption;
    captionNode.toggleAttribute("hidden", !caption);
    ratingNode.textContent = rating;
    ratingNode.toggleAttribute("hidden", !rating);
    fullResLinkNode.href = fullResSrc;
    fullResLinkNode.textContent = "Open full-resolution image";

    renderMetadata(
      collectMetadataFromDataset(anchor.dataset),
      {
        fallbackText: "Loading camera metadata...",
      },
    );

    const openToken = Date.now();
    activeOpenToken = openToken;

    openModal();

    void resolveMetadata(fullResSrc, anchor.dataset).then((metadata) => {
      if (activeOpenToken !== openToken) {
        return;
      }
      renderMetadata(metadata, {
        fallbackText: "No camera metadata available for this photo.",
      });
    });
  }

  function openModal() {
    if (!(modalNode instanceof HTMLElement)) {
      return;
    }

    modalNode.removeAttribute("hidden");
    document.body.classList.add("photo-lightbox-open");
    isOpen = true;
  }

  function closeModal() {
    if (!(modalNode instanceof HTMLElement) || !(imageNode instanceof HTMLImageElement)) {
      return;
    }

    modalNode.setAttribute("hidden", "");
    document.body.classList.remove("photo-lightbox-open");
    imageNode.removeAttribute("src");
    activeOpenToken = 0;
    isOpen = false;
  }

  async function resolveMetadata(src, dataset) {
    const fromDataset = collectMetadataFromDataset(dataset);
    if (hasCompleteMetadata(fromDataset)) {
      return fromDataset;
    }

    const cacheKey = String(src || "");
    if (exifCache.has(cacheKey)) {
      return mergeMetadata(fromDataset, exifCache.get(cacheKey));
    }

    const parsedExif = await parseExif(src);
    exifCache.set(cacheKey, parsedExif);
    return mergeMetadata(fromDataset, parsedExif);
  }

  function collectMetadataFromDataset(dataset) {
    return {
      iso: normalizeText(dataset.photoIso),
      shutterSpeed: normalizeText(dataset.photoShutter),
      aperture: normalizeText(dataset.photoAperture),
      camera: normalizeText(dataset.photoCamera),
      lens: normalizeText(dataset.photoLens),
    };
  }

  function hasCompleteMetadata(metadata) {
    return Boolean(metadata.iso && metadata.shutterSpeed && metadata.aperture && metadata.camera && metadata.lens);
  }

  async function parseExif(src) {
    const exifr = window.exifr;
    if (!exifr || typeof exifr.parse !== "function") {
      return {
        iso: "",
        shutterSpeed: "",
        aperture: "",
        camera: "",
        lens: "",
      };
    }

    try {
      const exif = await exifr.parse(src, {
        xmp: true,
        iptc: false,
      });
      if (!exif || typeof exif !== "object") {
        return {
          iso: "",
          shutterSpeed: "",
          aperture: "",
          camera: "",
          lens: "",
        };
      }

      const make = normalizeText(exif.Make);
      const model = normalizeText(exif.Model);
      const camera = [make, model].filter(Boolean).join(" ").trim() || normalizeText(exif.CameraModelName);
      const lens = normalizeText(exif.LensModel) || normalizeText(exif.LensID) || normalizeText(exif.Lens);

      return {
        iso: formatIso(exif.ISO ?? exif.ISOSpeedRatings),
        shutterSpeed: formatShutterSpeed(exif.ExposureTime, exif.ShutterSpeedValue),
        aperture: formatAperture(exif.FNumber ?? exif.ApertureValue),
        camera,
        lens,
      };
    } catch (_error) {
      return {
        iso: "",
        shutterSpeed: "",
        aperture: "",
        camera: "",
        lens: "",
      };
    }
  }

  function mergeMetadata(primary, fallback) {
    return {
      iso: primary.iso || fallback.iso || "",
      shutterSpeed: primary.shutterSpeed || fallback.shutterSpeed || "",
      aperture: primary.aperture || fallback.aperture || "",
      camera: primary.camera || fallback.camera || "",
      lens: primary.lens || fallback.lens || "",
    };
  }

  function renderMetadata(metadata, options = {}) {
    if (!(metadataListNode instanceof HTMLElement)) {
      return;
    }

    metadataListNode.textContent = "";
    const rows = [
      { label: "ISO", value: metadata.iso },
      { label: "Shutter", value: metadata.shutterSpeed },
      { label: "Aperture", value: metadata.aperture },
      { label: "Camera", value: metadata.camera },
      { label: "Lens", value: metadata.lens },
    ].filter((entry) => normalizeText(entry.value));

    if (!rows.length) {
      const fallbackText = String(options.fallbackText || "").trim();
      if (fallbackText) {
        const row = document.createElement("div");
        row.className = "photo-lightbox-exif-empty";
        row.textContent = fallbackText;
        metadataListNode.appendChild(row);
      }
      return;
    }

    rows.forEach((entry) => {
      const dt = document.createElement("dt");
      dt.textContent = entry.label;
      const dd = document.createElement("dd");
      dd.textContent = String(entry.value);
      metadataListNode.appendChild(dt);
      metadataListNode.appendChild(dd);
    });
  }

  function formatIso(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "";
    }
    return String(Math.round(numeric));
  }

  function formatShutterSpeed(exposureTime, shutterSpeedValue) {
    const direct = normalizeText(exposureTime);
    if (direct.includes("/")) {
      return `${direct} s`;
    }

    const numericExposure = Number(exposureTime);
    if (Number.isFinite(numericExposure) && numericExposure > 0) {
      if (numericExposure >= 1) {
        return `${trimPrecision(numericExposure)} s`;
      }

      const reciprocal = Math.round(1 / numericExposure);
      if (reciprocal > 0) {
        return `1/${reciprocal} s`;
      }
      return `${trimPrecision(numericExposure)} s`;
    }

    const numericShutter = Number(shutterSpeedValue);
    if (Number.isFinite(numericShutter)) {
      const seconds = 1 / Math.pow(2, numericShutter);
      if (seconds >= 1) {
        return `${trimPrecision(seconds)} s`;
      }
      const reciprocal = Math.round(1 / seconds);
      if (reciprocal > 0) {
        return `1/${reciprocal} s`;
      }
    }

    return "";
  }

  function formatAperture(value) {
    const raw = normalizeText(value);
    if (!raw) {
      return "";
    }

    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) {
      return `f/${trimPrecision(numeric)}`;
    }

    if (/^f\//i.test(raw)) {
      return raw;
    }

    return `f/${raw}`;
  }

  function trimPrecision(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "";
    }
    if (Math.abs(numeric - Math.round(numeric)) < 0.00001) {
      return String(Math.round(numeric));
    }
    return numeric.toFixed(2).replace(/0+$/g, "").replace(/\.$/g, "");
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }
})();
