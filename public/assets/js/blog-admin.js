(async () => {
  const root = document.querySelector("[data-blog-admin-root]");
  const seedNode = document.querySelector("#blog-admin-seed");
  if (!(root instanceof HTMLElement) || !(seedNode instanceof HTMLScriptElement)) {
    return;
  }

  const STORAGE_KEY = "ellisJoyceBlogAdminDraftV1";
  const SITE_ORIGIN = "https://www.ellis-joyce.com";
  const AUTH_SESSION_KEY = "ellisJoyceBirdAdminAuthV1";
  const PASSWORD_HASH_HEX = "231a72e8d401147498137268eb23cbbd5fa9de73896aa2a2012aa2b03285f176";
  const MAX_IMAGE_RESULTS = 60;
  const DELIVERY_MODE_LABELS = {
    same_day: "Blast on publish day",
    next_morning: "Blast the next morning",
    weekly_digest: "Hold for weekly digest",
    publish_only: "Publish with no blast",
  };

  const hasAccess = await ensureAccess();
  if (!hasAccess) {
    window.location.href = "/blog";
    return;
  }

  document.querySelectorAll("[data-blog-admin-protected]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.toggleAttribute("hidden", false);
      if (node.hasAttribute("data-reveal")) {
        node.classList.add("is-visible");
      }
    }
  });

  const titleInput = root.querySelector("[data-blog-title]");
  const sendEmailInput = root.querySelector("[data-blog-send-email]");
  const slugInput = root.querySelector("[data-blog-slug]");
  const slugButton = root.querySelector("[data-blog-admin-generate-slug]");
  const sectionSelect = root.querySelector("[data-blog-section]");
  const publishedAtInput = root.querySelector("[data-blog-published-at]");
  const statusSelect = root.querySelector("[data-blog-status]");
  const coverImageInput = root.querySelector("[data-blog-cover-image]");
  const legacyPathInput = root.querySelector("[data-blog-legacy-path]");
  const excerptInput = root.querySelector("[data-blog-excerpt]");
  const bodyEditor = root.querySelector("[data-blog-body-editor]");
  const editorToolbar = root.querySelector("[data-blog-editor-toolbar]");
  const imageUploadInput = root.querySelector("[data-blog-image-upload]");
  const imageSearchInput = root.querySelector("[data-blog-image-search]");
  const imageCountNode = root.querySelector("[data-blog-image-count]");
  const imageLibraryNode = root.querySelector("[data-blog-image-library]");

  const deliveryModeSelect = root.querySelector("[data-email-delivery-mode]");
  const audienceInput = root.querySelector("[data-email-audience]");
  const campaignNameInput = root.querySelector("[data-email-campaign-name]");
  const subjectInput = root.querySelector("[data-email-subject]");
  const preheaderInput = root.querySelector("[data-email-preheader]");
  const senderNameInput = root.querySelector("[data-email-sender-name]");
  const replyToInput = root.querySelector("[data-email-reply-to]");
  const ctaLabelInput = root.querySelector("[data-email-cta-label]");
  const ctaUrlInput = root.querySelector("[data-email-cta-url]");
  const introInput = root.querySelector("[data-email-intro]");
  const summaryBulletsInput = root.querySelector("[data-email-summary-bullets]");
  const footerNoteInput = root.querySelector("[data-email-footer-note]");

  const saveButton = root.querySelector("[data-blog-admin-save]");
  const saveLocalFileButton = root.querySelector("[data-blog-admin-save-local-file]");
  const autofillEmailButton = root.querySelector("[data-blog-admin-autofill-email]");
  const copyEmailHtmlButton = root.querySelector("[data-blog-admin-copy-email-html]");
  const downloadCampaignButton = root.querySelector("[data-blog-admin-download-campaign]");
  const resetButton = root.querySelector("[data-blog-admin-reset]");

  const statusNode = root.querySelector("[data-blog-admin-status]");
  const savedAtNode = root.querySelector("[data-blog-admin-saved-at]");
  const readinessNode = root.querySelector("[data-blog-admin-readiness]");

  const previewStatusNode = root.querySelector("[data-blog-preview-status]");
  const previewWordCountNode = root.querySelector("[data-blog-preview-word-count]");
  const previewReadingTimeNode = root.querySelector("[data-blog-preview-reading-time]");
  const previewCoverNode = root.querySelector("[data-blog-preview-cover]");
  const previewSectionNode = root.querySelector("[data-blog-preview-section]");
  const previewTitleNode = root.querySelector("[data-blog-preview-title]");
  const previewDateNode = root.querySelector("[data-blog-preview-date]");
  const previewExcerptNode = root.querySelector("[data-blog-preview-excerpt]");
  const previewBodyNode = root.querySelector("[data-blog-preview-body]");
  const previewUrlNode = root.querySelector("[data-blog-preview-url]");
  const localFilePathNode = root.querySelector("[data-blog-local-file-path]");
  const jsonPreviewNode = root.querySelector("[data-blog-json-preview]");

  const emailAudienceNode = root.querySelector("[data-email-preview-audience]");
  const emailModeNode = root.querySelector("[data-email-preview-mode]");
  const emailSubjectNode = root.querySelector("[data-email-preview-subject]");
  const emailPreheaderNode = root.querySelector("[data-email-preview-preheader]");
  const emailHtmlNode = root.querySelector("[data-email-preview-html]");
  const emailTextNode = root.querySelector("[data-email-preview-text]");

  if (
    !(titleInput instanceof HTMLInputElement) ||
    !(sendEmailInput instanceof HTMLInputElement) ||
    !(slugInput instanceof HTMLInputElement) ||
    !(slugButton instanceof HTMLButtonElement) ||
    !(sectionSelect instanceof HTMLSelectElement) ||
    !(publishedAtInput instanceof HTMLInputElement) ||
    !(statusSelect instanceof HTMLSelectElement) ||
    !(coverImageInput instanceof HTMLInputElement) ||
    !(legacyPathInput instanceof HTMLInputElement) ||
    !(excerptInput instanceof HTMLTextAreaElement) ||
    !(bodyEditor instanceof HTMLDivElement) ||
    !(editorToolbar instanceof HTMLElement) ||
    !(imageUploadInput instanceof HTMLInputElement) ||
    !(imageSearchInput instanceof HTMLInputElement) ||
    !(imageCountNode instanceof HTMLElement) ||
    !(imageLibraryNode instanceof HTMLElement) ||
    !(deliveryModeSelect instanceof HTMLSelectElement) ||
    !(audienceInput instanceof HTMLInputElement) ||
    !(campaignNameInput instanceof HTMLInputElement) ||
    !(subjectInput instanceof HTMLInputElement) ||
    !(preheaderInput instanceof HTMLInputElement) ||
    !(senderNameInput instanceof HTMLInputElement) ||
    !(replyToInput instanceof HTMLInputElement) ||
    !(ctaLabelInput instanceof HTMLInputElement) ||
    !(ctaUrlInput instanceof HTMLInputElement) ||
    !(introInput instanceof HTMLTextAreaElement) ||
    !(summaryBulletsInput instanceof HTMLTextAreaElement) ||
    !(footerNoteInput instanceof HTMLTextAreaElement) ||
    !(saveButton instanceof HTMLButtonElement) ||
    !(saveLocalFileButton instanceof HTMLButtonElement) ||
    !(autofillEmailButton instanceof HTMLButtonElement) ||
    !(copyEmailHtmlButton instanceof HTMLButtonElement) ||
    !(downloadCampaignButton instanceof HTMLButtonElement) ||
    !(resetButton instanceof HTMLButtonElement) ||
    !(statusNode instanceof HTMLElement) ||
    !(savedAtNode instanceof HTMLElement) ||
    !(readinessNode instanceof HTMLElement) ||
    !(previewStatusNode instanceof HTMLElement) ||
    !(previewWordCountNode instanceof HTMLElement) ||
    !(previewReadingTimeNode instanceof HTMLElement) ||
    !(previewCoverNode instanceof HTMLImageElement) ||
    !(previewSectionNode instanceof HTMLElement) ||
    !(previewTitleNode instanceof HTMLElement) ||
    !(previewDateNode instanceof HTMLElement) ||
    !(previewExcerptNode instanceof HTMLElement) ||
    !(previewBodyNode instanceof HTMLElement) ||
    !(previewUrlNode instanceof HTMLElement) ||
    !(localFilePathNode instanceof HTMLElement) ||
    !(jsonPreviewNode instanceof HTMLElement) ||
    !(emailAudienceNode instanceof HTMLElement) ||
    !(emailModeNode instanceof HTMLElement) ||
    !(emailSubjectNode instanceof HTMLElement) ||
    !(emailPreheaderNode instanceof HTMLElement) ||
    !(emailHtmlNode instanceof HTMLElement) ||
    !(emailTextNode instanceof HTMLElement)
  ) {
    return;
  }

  const parsedSeed = parseSeed(seedNode.textContent || "{}");
  const seedDraft = sanitizeDraft(parsedSeed && typeof parsedSeed === "object" && parsedSeed.draft ? parsedSeed.draft : parsedSeed);
  const seedPhotoLibrary = sanitizePhotoLibrary(
    parsedSeed && typeof parsedSeed === "object" && Array.isArray(parsedSeed.photoLibrary) ? parsedSeed.photoLibrary : [],
  );

  let draft = sanitizeDraft(loadDraft() || seedDraft);
  let saveTimer = null;
  const state = {
    savedRange: null,
    imageQuery: "",
    uploadedImages: [],
  };

  if (!draft.post.publishedAt) {
    draft.post.publishedAt = toDateTimeLocalInputValue(new Date());
  }

  syncFormFromDraft();
  render();
  setStatus("Draft loaded.");

  const onPostInput = (updater) => () => {
    updater();
    scheduleSave();
    render();
  };

  const onEmailInput = (updater) => () => {
    updater();
    scheduleSave();
    render();
  };

  titleInput.addEventListener(
    "input",
    onPostInput(() => {
      draft.post.title = normalizeText(titleInput.value);
      if (!slugInput.dataset.locked || !draft.post.slug) {
        draft.post.slug = slugify(draft.post.title);
        slugInput.value = draft.post.slug;
      }
    }),
  );

  sendEmailInput.addEventListener(
    "change",
    onPostInput(() => {
      draft.post.sendEmailBlast = sendEmailInput.checked;
    }),
  );

  slugInput.addEventListener(
    "input",
    onPostInput(() => {
      slugInput.dataset.locked = "true";
      draft.post.slug = slugify(slugInput.value, { preservePartial: true });
      slugInput.value = draft.post.slug;
    }),
  );

  slugButton.addEventListener("click", () => {
    draft.post.slug = slugify(draft.post.title);
    slugInput.dataset.locked = "true";
    slugInput.value = draft.post.slug;
    storeDraft("Generated slug from title.");
    render();
  });

  sectionSelect.addEventListener(
    "change",
    onPostInput(() => {
      draft.post.section = normalizeText(sectionSelect.value) || "Science + Activism";
    }),
  );

  publishedAtInput.addEventListener(
    "change",
    onPostInput(() => {
      draft.post.publishedAt =
        toDateTimeLocalInputValue(publishedAtInput.value) || toDateTimeLocalInputValue(new Date());
      publishedAtInput.value = draft.post.publishedAt;
    }),
  );

  statusSelect.addEventListener(
    "change",
    onPostInput(() => {
      draft.post.status = normalizeStatus(statusSelect.value);
    }),
  );

  coverImageInput.addEventListener(
    "input",
    onPostInput(() => {
      draft.post.coverImage = normalizeText(coverImageInput.value);
    }),
  );

  legacyPathInput.addEventListener(
    "input",
    onPostInput(() => {
      draft.post.legacyPath = normalizeText(legacyPathInput.value);
    }),
  );

  excerptInput.addEventListener(
    "input",
    onPostInput(() => {
      draft.post.excerpt = normalizeText(excerptInput.value);
    }),
  );

  bodyEditor.addEventListener("input", () => {
    syncDraftBodyFromEditor();
    scheduleSave();
    render();
  });

  bodyEditor.addEventListener("mouseup", saveEditorSelection);
  bodyEditor.addEventListener("keyup", saveEditorSelection);
  bodyEditor.addEventListener("blur", saveEditorSelection);

  bodyEditor.addEventListener("paste", (event) => {
    const text = event.clipboardData?.getData("text/plain");
    if (!text) {
      return;
    }

    event.preventDefault();
    insertHtmlAtCursor(textToHtmlParagraphs(text));
  });

  editorToolbar.addEventListener("mousedown", (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest("button") : null;
    if (button instanceof HTMLButtonElement) {
      event.preventDefault();
    }
  });

  editorToolbar.addEventListener("click", (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest("button") : null;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const command = button.dataset.editorCommand;
    const block = button.dataset.editorBlock;
    const action = button.dataset.editorAction;

    if (command) {
      runEditorCommand(command);
      return;
    }

    if (block) {
      runEditorCommand("formatBlock", `<${block}>`);
      return;
    }

    if (action === "link") {
      const href = window.prompt("Enter the link URL:");
      if (!href) {
        return;
      }
      runEditorCommand("createLink", href.trim());
      return;
    }

    if (action === "unlink") {
      runEditorCommand("unlink");
    }
  });

  imageUploadInput.addEventListener("change", async () => {
    const files = Array.from(imageUploadInput.files || []);
    if (!files.length) {
      return;
    }

    await addUploadedImages(files);
    imageUploadInput.value = "";
  });

  imageSearchInput.addEventListener("input", () => {
    state.imageQuery = normalizeText(imageSearchInput.value).toLowerCase();
    renderImageLibrary();
  });

  imageLibraryNode.addEventListener("mousedown", (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest("button") : null;
    if (button instanceof HTMLButtonElement) {
      event.preventDefault();
    }
  });

  imageLibraryNode.addEventListener("click", (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest("button") : null;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const imageId = button.dataset.imageId || "";
    const action = button.dataset.imageAction || "";
    const record = findImageRecord(imageId);
    if (!record) {
      return;
    }

    if (action === "insert") {
      insertImageRecord(record);
      return;
    }

    if (action === "cover") {
      draft.post.coverImage = record.src;
      coverImageInput.value = record.src;
      scheduleSave();
      render();
      setStatus(`Set cover image from ${record.label}.`);
    }
  });

  deliveryModeSelect.addEventListener(
    "change",
    onEmailInput(() => {
      draft.email.deliveryMode = normalizeDeliveryMode(deliveryModeSelect.value);
    }),
  );

  audienceInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.audience = normalizeText(audienceInput.value);
    }),
  );

  campaignNameInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.campaignName = normalizeText(campaignNameInput.value);
    }),
  );

  subjectInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.subject = normalizeText(subjectInput.value);
    }),
  );

  preheaderInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.preheader = normalizeText(preheaderInput.value);
    }),
  );

  senderNameInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.senderName = normalizeText(senderNameInput.value);
    }),
  );

  replyToInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.replyTo = normalizeText(replyToInput.value);
    }),
  );

  ctaLabelInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.ctaLabel = normalizeText(ctaLabelInput.value);
    }),
  );

  ctaUrlInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.ctaUrl = normalizeText(ctaUrlInput.value);
    }),
  );

  introInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.intro = normalizeText(introInput.value);
    }),
  );

  summaryBulletsInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.summaryBullets = normalizeText(summaryBulletsInput.value);
    }),
  );

  footerNoteInput.addEventListener(
    "input",
    onEmailInput(() => {
      draft.email.footerNote = normalizeText(footerNoteInput.value);
    }),
  );

  saveButton.addEventListener("click", () => {
    storeDraft("Draft saved locally.");
    render();
  });

  saveLocalFileButton.addEventListener("click", async () => {
    await saveLocalBlogFile();
  });

  autofillEmailButton.addEventListener("click", () => {
    applyEmailDefaults({ force: true });
    syncFormFromDraft();
    storeDraft("Refreshed email fields from the post draft.");
    render();
  });

  copyEmailHtmlButton.addEventListener("click", async () => {
    const ok = await copyToClipboard(buildEmailAssets().html);
    setStatus(ok ? "Copied email HTML to clipboard." : "Clipboard copy failed.");
  });

  downloadCampaignButton.addEventListener("click", () => {
    const packet = buildCampaignPacket(buildEmailAssets());
    downloadFile(
      `${buildFileSlug("campaign")}.json`,
      `${JSON.stringify(packet, null, 2)}\n`,
      "application/json",
    );
    setStatus("Downloaded campaign packet.");
  });

  resetButton.addEventListener("click", () => {
    const confirmed = window.confirm("Reset the local blog draft back to the starter template?");
    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    draft = sanitizeDraft(seedDraft);
    draft.post.publishedAt = toDateTimeLocalInputValue(new Date());
    state.uploadedImages = [];
    state.imageQuery = "";
    imageSearchInput.value = "";
    slugInput.dataset.locked = "";
    syncFormFromDraft();
    render();
    setStatus("Draft reset.");
    savedAtNode.textContent = "Local draft cleared.";
  });

  function parseSeed(raw) {
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return {};
    }
  }

  function loadDraft() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function scheduleSave() {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }

    saveTimer = window.setTimeout(() => {
      storeDraft("Autosaved locally.");
      render();
    }, 220);
  }

  function storeDraft(message) {
    draft = sanitizeDraft(draft);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      savedAtNode.textContent = `Saved ${formatClockTime(new Date())}`;
      setStatus(message);
    } catch (_error) {
      savedAtNode.textContent = "Autosave unavailable";
      setStatus("Draft is too large for browser autosave. Use Save Local Blog File to keep your work.");
    }
  }

  function setStatus(message) {
    statusNode.textContent = message;
  }

  function syncFormFromDraft() {
    titleInput.value = draft.post.title;
    sendEmailInput.checked = draft.post.sendEmailBlast;
    slugInput.value = draft.post.slug;
    sectionSelect.value = draft.post.section;
    publishedAtInput.value = draft.post.publishedAt;
    statusSelect.value = draft.post.status;
    coverImageInput.value = draft.post.coverImage;
    legacyPathInput.value = draft.post.legacyPath;
    excerptInput.value = draft.post.excerpt;
    bodyEditor.innerHTML = draft.post.bodyHtml;

    deliveryModeSelect.value = draft.email.deliveryMode;
    audienceInput.value = draft.email.audience;
    campaignNameInput.value = draft.email.campaignName;
    subjectInput.value = draft.email.subject;
    preheaderInput.value = draft.email.preheader;
    senderNameInput.value = draft.email.senderName;
    replyToInput.value = draft.email.replyTo;
    ctaLabelInput.value = draft.email.ctaLabel;
    ctaUrlInput.value = draft.email.ctaUrl;
    introInput.value = draft.email.intro;
    summaryBulletsInput.value = draft.email.summaryBullets;
    footerNoteInput.value = draft.email.footerNote;
  }

  function render() {
    draft = sanitizeDraft(draft);

    const postUrl = getPostUrl();
    const bodyText = stripHtmlToText(draft.post.bodyHtml);
    const wordCount = countWords(bodyText);
    const readingTime = Math.max(1, Math.ceil(wordCount / 220));

    previewStatusNode.textContent =
      draft.post.status === "ready"
        ? "Ready To Publish"
        : draft.post.status === "review"
          ? "Needs Review"
          : "Draft";
    previewWordCountNode.textContent = `${wordCount} words`;
    previewReadingTimeNode.textContent = `${readingTime} min read`;
    previewSectionNode.textContent = draft.post.section || "Science + Activism";
    previewTitleNode.textContent = draft.post.title || "Untitled post";
    previewDateNode.textContent = formatLongDate(draft.post.publishedAt);
    previewExcerptNode.textContent = draft.post.excerpt || "Your excerpt will show here once you add one.";
    previewBodyNode.innerHTML =
      draft.post.bodyHtml || "<p>Start writing in the editor to render your article preview here.</p>";

    if (draft.post.coverImage) {
      previewCoverNode.src = draft.post.coverImage;
      previewCoverNode.hidden = false;
    } else {
      previewCoverNode.removeAttribute("src");
      previewCoverNode.hidden = true;
    }

    previewUrlNode.textContent = postUrl || `${SITE_ORIGIN}/blog/your-slug`;
    localFilePathNode.textContent = `src/data/localBlogEntries/${getLocalBlogFilename()}`;
    jsonPreviewNode.textContent = JSON.stringify(buildLocalBlogFile(), null, 2);

    const emailAssets = buildEmailAssets();
    emailAudienceNode.textContent = draft.email.audience || "Core blog subscribers";
    emailModeNode.textContent =
      DELIVERY_MODE_LABELS[draft.email.deliveryMode] || DELIVERY_MODE_LABELS.same_day;
    emailSubjectNode.textContent =
      draft.email.subject || `New on the blog: ${draft.post.title || "Untitled post"}`;
    emailPreheaderNode.textContent =
      draft.email.preheader || draft.post.excerpt || "A new post is ready to read.";
    emailHtmlNode.innerHTML = emailAssets.preview;
    emailTextNode.textContent = emailAssets.text;

    renderReadiness(emailAssets);
    renderImageLibrary();
  }

  function renderReadiness(emailAssets) {
    const checks = [
      {
        ready: Boolean(draft.post.title && draft.post.slug),
        title: "Title + slug",
        detail:
          draft.post.title && draft.post.slug
            ? "Both are set and the file name can stay stable."
            : "Add a title and a clean slug before saving the local file.",
      },
      {
        ready: Boolean(draft.post.excerpt && draft.post.excerpt.length >= 60),
        title: "Excerpt",
        detail:
          draft.post.excerpt && draft.post.excerpt.length >= 60
            ? "Excerpt is long enough to work for cards, metadata, and email previews."
            : "Write an excerpt with enough signal to carry the blog card and inbox preview.",
      },
      {
        ready: Boolean(stripHtmlToText(draft.post.bodyHtml).length >= 280),
        title: "Body draft",
        detail:
          stripHtmlToText(draft.post.bodyHtml).length >= 280
            ? "The post body is substantial enough for publishing."
            : "The body is still short. Finish the core argument before publishing.",
      },
      {
        ready: Boolean(draft.post.publishedAt),
        title: "Publish timing",
        detail: draft.post.publishedAt
          ? `Scheduled for ${formatLongDate(draft.post.publishedAt)}.`
          : "Choose a publish time.",
      },
      {
        ready: Boolean(draft.post.slug),
        title: "Local file target",
        detail: draft.post.slug
          ? `Save into src/data/localBlogEntries/${getLocalBlogFilename()}.`
          : "Set the slug so the save target path is obvious before you rebuild.",
      },
      {
        ready: !draft.post.sendEmailBlast || Boolean(draft.email.subject && emailAssets.ctaUrl),
        title: "Email blast",
        detail:
          !draft.post.sendEmailBlast
            ? "Email blast is disabled for this post."
            : draft.email.subject && emailAssets.ctaUrl
              ? "Email subject and CTA are ready to hand off."
              : "If you are sending a blast, fill in the subject line and CTA URL.",
      },
    ];

    readinessNode.innerHTML = checks
      .map(
        (check) => `
          <article class="blog-admin-readiness-item${check.ready ? " is-ready" : ""}">
            <span class="blog-admin-readiness-marker">${check.ready ? "OK" : "!"}</span>
            <div>
              <strong>${escapeHtml(check.title)}</strong>
              <span>${escapeHtml(check.detail)}</span>
            </div>
          </article>
        `,
      )
      .join("");
  }

  function renderImageLibrary() {
    const records = [...state.uploadedImages, ...seedPhotoLibrary];
    const filtered = records.filter((record) => {
      if (!state.imageQuery) {
        return true;
      }
      return buildImageSearchText(record).includes(state.imageQuery);
    });

    const visible = filtered.slice(0, MAX_IMAGE_RESULTS);
    imageCountNode.textContent =
      filtered.length > MAX_IMAGE_RESULTS
        ? `Showing ${visible.length} of ${filtered.length} matching images. Uploaded local images are embedded directly into the saved post file.`
        : `${filtered.length} image${filtered.length === 1 ? "" : "s"} available. Uploaded local images are embedded directly into the saved post file.`;

    if (!visible.length) {
      imageLibraryNode.innerHTML =
        '<div class="blog-admin-image-empty">No images match the current search. Upload a local image or broaden the filter.</div>';
      return;
    }

    imageLibraryNode.innerHTML = visible
      .map(
        (record) => `
          <article class="blog-admin-image-card">
            <img src="${escapeAttribute(record.src)}" alt="${escapeAttribute(record.alt)}" loading="lazy" decoding="async" />
            <div class="blog-admin-image-card-body">
              <strong>${escapeHtml(record.label)}</strong>
              <p>${escapeHtml(record.meta)}</p>
              <div class="blog-admin-image-card-actions">
                <button class="btn secondary" type="button" data-image-action="insert" data-image-id="${escapeAttribute(record.id)}">Insert</button>
                <button class="btn secondary" type="button" data-image-action="cover" data-image-id="${escapeAttribute(record.id)}">Use as Cover</button>
              </div>
            </div>
          </article>
        `,
      )
      .join("");
  }

  function findImageRecord(imageId) {
    return [...state.uploadedImages, ...seedPhotoLibrary].find((record) => record.id === imageId) || null;
  }

  async function addUploadedImages(files) {
    const prepared = [];

    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) {
        continue;
      }

      const label = normalizeFileLabel(file.name);
      prepared.push({
        id: `upload-${Date.now()}-${prepared.length + state.uploadedImages.length}`,
        src: dataUrl,
        alt: label,
        tripSlug: "draft-upload",
        rating: 0,
        subject: label,
        location: "",
        label,
        meta: "Uploaded for this draft",
      });
    }

    if (!prepared.length) {
      return;
    }

    state.uploadedImages = [...prepared, ...state.uploadedImages];
    renderImageLibrary();
    setStatus(`Added ${prepared.length} uploaded image${prepared.length === 1 ? "" : "s"} to the draft library.`);
  }

  function buildLocalBlogFile() {
    const bodyHtml = sanitizeRichHtml(draft.post.bodyHtml);
    const publishedAtIso = toIsoFromLocalDateTime(draft.post.publishedAt) ?? draft.post.publishedAt;

    return {
      slug: draft.post.slug || "",
      title: draft.post.title || "",
      section: draft.post.section || "",
      excerpt: draft.post.excerpt || "",
      publishedAt: publishedAtIso,
      coverImage: draft.post.coverImage || null,
      bodyHtml,
      legacyPath: draft.post.legacyPath || null,
    };
  }

  function buildCampaignPacket(assets) {
    return {
      campaign_name: draft.email.campaignName || buildDefaultCampaignName(),
      delivery_mode: draft.email.deliveryMode,
      audience: draft.email.audience || "Core blog subscribers",
      subject: draft.email.subject || `New on the blog: ${draft.post.title || "Untitled post"}`,
      preheader: draft.email.preheader || draft.post.excerpt || "",
      sender_name: draft.email.senderName || "Justin Ellis-Joyce",
      reply_to: draft.email.replyTo || "justin@ellis-joyce.com",
      cta_label: draft.email.ctaLabel || "Read the full post",
      cta_url: assets.ctaUrl,
      blog_url: getPostUrl(),
      html: assets.html,
      text: assets.text,
      local_blog_file: buildLocalBlogFile(),
    };
  }

  function buildEmailAssets() {
    const ctaUrl = draft.email.ctaUrl || getPostUrl() || `${SITE_ORIGIN}/blog/${draft.post.slug || "your-slug"}`;
    const emailTitle = draft.post.title || "Untitled post";
    const emailSubject = draft.email.subject || `New on the blog: ${emailTitle}`;
    const preheader = draft.email.preheader || draft.post.excerpt || "A new post is ready to read.";
    const introHtml = markdownToHtml(draft.email.intro || draft.post.excerpt || "");
    const footerHtml = markdownToHtml(draft.email.footerNote || "");
    const bullets = splitLines(draft.email.summaryBullets);
    const bulletHtml =
      bullets.length > 0
        ? `<ul style="margin:0 0 20px;padding-left:18px;">${bullets
            .map((item) => `<li style="margin-bottom:8px;">${escapeHtml(item)}</li>`)
            .join("")}</ul>`
        : "";
    const safeCtaLabel = escapeHtml(draft.email.ctaLabel || "Read the full post");
    const safeTitle = escapeHtml(emailTitle);
    const safeSender = escapeHtml(draft.email.senderName || "Justin Ellis-Joyce");
    const coverHtml = draft.post.coverImage
      ? `<tr><td style="padding-bottom:20px;"><img src="${escapeAttribute(draft.post.coverImage)}" alt="" style="display:block;width:100%;height:auto;border-radius:16px;" /></td></tr>`
      : "";

    const html = `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#efece2;color:#1e2420;font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 10px;">
                <p style="margin:0 0 10px;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#1d5347;">Ellis-Joyce Blog</p>
                <h1 style="margin:0 0 14px;font-size:32px;line-height:1.1;color:#1e2420;">${safeTitle}</h1>
                <p style="margin:0;color:#4f5952;font-size:15px;line-height:1.6;">${escapeHtml(preheader)}</p>
              </td>
            </tr>
            ${coverHtml}
            <tr>
              <td style="padding:0 28px 30px;">
                ${introHtml}
                ${bulletHtml}
                <p style="margin:24px 0 0;">
                  <a href="${escapeAttribute(ctaUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1d5347;color:#ffffff;text-decoration:none;font-weight:700;">
                    ${safeCtaLabel}
                  </a>
                </p>
                <div style="margin-top:26px;padding-top:18px;border-top:1px solid rgba(30,36,32,0.12);font-size:14px;line-height:1.7;color:#4f5952;">
                  ${footerHtml}
                  <p style="margin:18px 0 0;">Sent by ${safeSender}</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const preview = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding-bottom:10px;">
            <strong style="font-size:1rem;">${safeTitle}</strong><br />
            <span style="color:#4f5952;">${escapeHtml(preheader)}</span>
          </td>
        </tr>
        ${
          draft.post.coverImage
            ? `<tr><td style="padding-bottom:12px;"><img src="${escapeAttribute(draft.post.coverImage)}" alt="" style="display:block;width:100%;height:auto;border-radius:14px;" /></td></tr>`
            : ""
        }
        <tr>
          <td style="padding-bottom:12px;">${introHtml || `<p style="margin:0;">${escapeHtml(draft.post.excerpt || "Add intro copy to shape the email.")}</p>`}</td>
        </tr>
        ${bulletHtml ? `<tr><td style="padding-bottom:12px;">${bulletHtml}</td></tr>` : ""}
        <tr>
          <td>
            <a href="${escapeAttribute(ctaUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#1d5347;color:#ffffff;text-decoration:none;font-weight:700;">
              ${safeCtaLabel}
            </a>
          </td>
        </tr>
      </table>
    `.trim();

    const bulletsText = bullets.length > 0 ? `\n${bullets.map((item) => `- ${item}`).join("\n")}\n` : "";
    const introText = stripMarkdown(draft.email.intro || draft.post.excerpt || "");
    const footerText = stripMarkdown(draft.email.footerNote || "");
    const text = [
      `Subject: ${emailSubject}`,
      `Preheader: ${preheader}`,
      "",
      introText,
      bulletsText ? bulletsText.trimEnd() : "",
      "",
      `${draft.email.ctaLabel || "Read the full post"}: ${ctaUrl}`,
      footerText ? `\n${footerText}` : "",
    ]
      .filter((line) => line !== "")
      .join("\n");

    return { html, preview, text, ctaUrl };
  }

  function applyEmailDefaults(options = {}) {
    const force = options.force === true;
    const derivedUrl = getPostUrl() || `${SITE_ORIGIN}/blog/${draft.post.slug || "your-slug"}`;

    if (force || !draft.email.campaignName) {
      draft.email.campaignName = buildDefaultCampaignName();
    }
    if (force || !draft.email.subject) {
      draft.email.subject = draft.post.title ? `New on the blog: ${draft.post.title}` : "";
    }
    if (force || !draft.email.preheader) {
      draft.email.preheader = draft.post.excerpt || "";
    }
    if (force || !draft.email.ctaUrl) {
      draft.email.ctaUrl = derivedUrl;
    }
    if (force || !draft.email.intro) {
      draft.email.intro = draft.post.excerpt || "";
    }
    if (force || !draft.email.summaryBullets) {
      draft.email.summaryBullets = buildSummaryBulletsFromBody();
    }
  }

  function buildDefaultCampaignName() {
    const datePrefix = draft.post.publishedAt ? String(draft.post.publishedAt).slice(0, 10) : "undated";
    return [datePrefix, draft.post.slug || slugify(draft.post.title) || "blog-post"].join("-");
  }

  function buildSummaryBulletsFromBody() {
    const paragraphs = stripHtmlToText(draft.post.bodyHtml)
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 24);

    return paragraphs.slice(0, 3).join("\n");
  }

  function getPostUrl() {
    return draft.post.slug ? `${SITE_ORIGIN}/blog/${draft.post.slug}` : "";
  }

  function getLocalBlogFilename() {
    return `${draft.post.slug || slugify(draft.post.title) || "draft"}.json`;
  }

  function buildFileSlug(prefix) {
    const slug = draft.post.slug || slugify(draft.post.title) || "draft";
    return `${prefix}-${slug}`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function saveLocalBlogFile() {
    const filename = getLocalBlogFilename();
    const contents = `${JSON.stringify(buildLocalBlogFile(), null, 2)}\n`;

    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "Local blog JSON",
              accept: {
                "application/json": [".json"],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(contents);
        await writable.close();
        setStatus(
          `Saved local blog file. Place it in src/data/localBlogEntries/${filename} before rebuilding if you saved elsewhere.`,
        );
        return;
      } catch (error) {
        if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
          setStatus("Local file save canceled.");
          return;
        }
      }
    }

    downloadFile(filename, contents, "application/json");
    setStatus(`Downloaded local blog file. Move it into src/data/localBlogEntries/${filename} before rebuilding.`);
  }

  function downloadFile(filename, contents, mimeType) {
    const blob = new Blob([contents], { type: mimeType });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  function runEditorCommand(command, value) {
    bodyEditor.focus();
    restoreEditorSelection();
    try {
      document.execCommand(command, false, value);
    } catch (_error) {
      return;
    }

    syncDraftBodyFromEditor();
    scheduleSave();
    render();
  }

  function insertImageRecord(record) {
    const imageHtml = `
      <figure class="post-image-block">
        <img src="${escapeAttribute(record.src)}" alt="${escapeAttribute(record.alt)}" loading="lazy" decoding="async" />
      </figure>
      <p></p>
    `;
    insertHtmlAtCursor(imageHtml);
    setStatus(`Inserted image from ${record.label}.`);
  }

  function insertHtmlAtCursor(html) {
    bodyEditor.focus();
    restoreEditorSelection();
    const selection = window.getSelection();
    const canInsert =
      selection &&
      selection.rangeCount > 0 &&
      bodyEditor.contains(selection.getRangeAt(0).commonAncestorContainer);

    if (canInsert) {
      try {
        document.execCommand("insertHTML", false, html);
      } catch (_error) {
        bodyEditor.insertAdjacentHTML("beforeend", html);
      }
    } else {
      bodyEditor.insertAdjacentHTML("beforeend", html);
    }

    syncDraftBodyFromEditor();
    scheduleSave();
    render();
    bodyEditor.focus();
    saveEditorSelection();
  }

  function saveEditorSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!bodyEditor.contains(range.commonAncestorContainer)) {
      return;
    }

    state.savedRange = range.cloneRange();
  }

  function restoreEditorSelection() {
    if (!state.savedRange) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(state.savedRange);
  }

  function syncDraftBodyFromEditor() {
    draft.post.bodyHtml = sanitizeRichHtml(bodyEditor.innerHTML);
  }

  function sanitizeDraft(raw) {
    const safe = raw && typeof raw === "object" ? raw : {};
    const safePost = safe.post && typeof safe.post === "object" ? safe.post : {};
    const safeEmail = safe.email && typeof safe.email === "object" ? safe.email : {};
    const initialHtml =
      typeof safePost.bodyHtml === "string"
        ? safePost.bodyHtml
        : typeof safePost.bodyMarkdown === "string"
          ? markdownToHtml(safePost.bodyMarkdown)
          : "";

    return {
      post: {
        title: normalizeText(safePost.title),
        slug: slugify(normalizeText(safePost.slug), { preservePartial: true }),
        section: normalizeText(safePost.section) || "Science + Activism",
        excerpt: normalizeText(safePost.excerpt),
        publishedAt: toDateTimeLocalInputValue(safePost.publishedAt),
        status: normalizeStatus(safePost.status),
        coverImage: normalizeText(safePost.coverImage),
        legacyPath: normalizeText(safePost.legacyPath),
        bodyHtml: sanitizeRichHtml(initialHtml),
        sendEmailBlast: safePost.sendEmailBlast !== false,
      },
      email: {
        deliveryMode: normalizeDeliveryMode(safeEmail.deliveryMode),
        campaignName: normalizeText(safeEmail.campaignName),
        audience: normalizeText(safeEmail.audience) || "Core blog subscribers",
        subject: normalizeText(safeEmail.subject),
        preheader: normalizeText(safeEmail.preheader),
        senderName: normalizeText(safeEmail.senderName) || "Justin Ellis-Joyce",
        replyTo: normalizeText(safeEmail.replyTo) || "justin@ellis-joyce.com",
        ctaLabel: normalizeText(safeEmail.ctaLabel) || "Read the full post",
        ctaUrl: normalizeText(safeEmail.ctaUrl),
        intro: normalizeText(safeEmail.intro),
        summaryBullets: normalizeText(safeEmail.summaryBullets),
        footerNote:
          normalizeText(safeEmail.footerNote) ||
          "You are receiving this because you asked for blog updates from Ellis-Joyce.",
      },
    };
  }

  function sanitizePhotoLibrary(rawList) {
    return (Array.isArray(rawList) ? rawList : [])
      .map((raw, index) => sanitizePhotoRecord(raw, index))
      .filter((record) => record !== null);
  }

  function sanitizePhotoRecord(raw, index) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const src = normalizeText(raw.src);
    if (!src) {
      return null;
    }

    const tripSlug = normalizeText(raw.tripSlug) || "photo-library";
    const subject = normalizeText(raw.subject);
    const location = normalizeText(raw.location);
    const alt = normalizeText(raw.alt) || subject || `Photo ${index + 1}`;
    const rating = Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : 0;
    const label = subject || alt;
    const metaParts = [
      tripSlug,
      location,
      rating > 0 ? `${rating} star${rating === 1 ? "" : "s"}` : "",
    ].filter(Boolean);

    return {
      id: normalizeText(raw.id) || `photo-${index + 1}`,
      src,
      alt,
      tripSlug,
      rating,
      subject,
      location,
      label,
      meta: metaParts.join(" • "),
    };
  }

  function sanitizeRichHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");

    template.content.querySelectorAll("script, style, iframe, object, embed").forEach((node) => {
      node.remove();
    });

    template.content.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;

        if (name.startsWith("on")) {
          element.removeAttribute(attribute.name);
          return;
        }

        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (name === "contenteditable") {
          element.removeAttribute(attribute.name);
        }
      });
    });

    return template.innerHTML.trim();
  }

  function normalizeText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizeStatus(value) {
    return value === "review" || value === "ready" ? value : "draft";
  }

  function normalizeDeliveryMode(value) {
    return Object.prototype.hasOwnProperty.call(DELIVERY_MODE_LABELS, value) ? value : "same_day";
  }

  function slugify(value, options = {}) {
    const preservePartial = options.preservePartial === true;
    const normalized = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return preservePartial ? normalized.slice(0, 90) : normalized.replace(/-+/g, "-").slice(0, 90);
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let listItems = [];
    let listType = "";
    let quoteLines = [];

    const flushParagraph = () => {
      if (!paragraph.length) {
        return;
      }
      html.push(`<p>${paragraph.map(formatInlineMarkdown).join("<br />")}</p>`);
      paragraph = [];
    };

    const flushList = () => {
      if (!listItems.length || !listType) {
        return;
      }
      html.push(
        `<${listType}>${listItems.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join("")}</${listType}>`,
      );
      listItems = [];
      listType = "";
    };

    const flushQuote = () => {
      if (!quoteLines.length) {
        return;
      }
      html.push(
        `<blockquote>${quoteLines.map((line) => formatInlineMarkdown(line)).join("<br />")}</blockquote>`,
      );
      quoteLines = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        flushList();
        flushQuote();
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        flushQuote();
        const level = Math.min(3, headingMatch[1].length);
        html.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
        return;
      }

      const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (unorderedMatch) {
        flushParagraph();
        flushQuote();
        if (listType && listType !== "ul") {
          flushList();
        }
        listType = "ul";
        listItems.push(unorderedMatch[1]);
        return;
      }

      const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (orderedMatch) {
        flushParagraph();
        flushQuote();
        if (listType && listType !== "ol") {
          flushList();
        }
        listType = "ol";
        listItems.push(orderedMatch[1]);
        return;
      }

      const quoteMatch = trimmed.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        flushParagraph();
        flushList();
        quoteLines.push(quoteMatch[1]);
        return;
      }

      flushList();
      flushQuote();
      paragraph.push(trimmed);
    });

    flushParagraph();
    flushList();
    flushQuote();

    return html.join("\n");
  }

  function formatInlineMarkdown(text) {
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>");
    formatted = formatted.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g,
      '<a href="$2">$1</a>',
    );
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return formatted;
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function stripMarkdown(value) {
    return String(value || "")
      .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
      .replace(/[*_#>`-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripHtmlToText(value) {
    const template = document.createElement("template");
    template.innerHTML = String(value || "");
    return (template.content.textContent || "").replace(/\s+/g, " ").trim();
  }

  function countWords(value) {
    return value ? value.split(/\s+/).length : 0;
  }

  function buildImageSearchText(record) {
    return [record.label, record.alt, record.tripSlug, record.subject, record.location, record.meta]
      .join(" ")
      .toLowerCase();
  }

  function normalizeFileLabel(name) {
    return String(name || "Uploaded image")
      .replace(/\.[^.]+$/g, "")
      .replace(/[-_]+/g, " ")
      .trim();
  }

  function textToHtmlParagraphs(text) {
    const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return "";
    }

    return normalized
      .split(/\n{2,}/)
      .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, "<br />")}</p>`)
      .join("");
  }

  async function readFileAsDataUrl(file) {
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function toDateTimeLocalInputValue(value) {
    if (!value) {
      return "";
    }

    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function toIsoFromLocalDateTime(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function formatLongDate(value) {
    const date = value ? new Date(value) : null;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "Choose a publish time";
    }

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function formatClockTime(date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  async function ensureAccess() {
    const existingToken = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    if (existingToken === PASSWORD_HASH_HEX) {
      return true;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const promptLabel =
        attempt === 0 ? "Enter admin password for Blog Admin:" : "Incorrect password. Try again:";
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
})();
