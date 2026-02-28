(() => {
  const controls = document.querySelector("[data-bird-controls]");
  if (!(controls instanceof HTMLElement)) return;

  const rows = Array.from(document.querySelectorAll("[data-bird-row]"));
  if (!rows.length) return;

  const rarityButtons = Array.from(controls.querySelectorAll("[data-rarity-mode]"));
  const filterButtons = Array.from(controls.querySelectorAll("[data-bird-filter]"));
  const searchInput = controls.querySelector("[data-bird-search]");

  const totalNode = document.querySelector("[data-stat-total]");
  const seenNode = document.querySelector("[data-stat-seen]");
  const photoNode = document.querySelector("[data-stat-photo]");
  const backlogNode = document.querySelector("[data-stat-backlog]");
  const emptyState = document.querySelector("[data-bird-empty]");

  const familyBlocks = Array.from(document.querySelectorAll(".bird-family"));
  const orderBlocks = Array.from(document.querySelectorAll("[data-bird-order]"));

  let rarityMode = "common";
  let filterMode = "all";
  let queryText = "";

  const normalize = (value) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const visibleMatch = (row) => {
    const rarity = row.getAttribute("data-rarity") || "common";
    const seen = row.getAttribute("data-seen") === "true";
    const hasPhoto = row.getAttribute("data-photo") === "true";

    if (rarityMode === "common" && rarity === "rare") {
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
    let visibleCount = 0;
    let seenCount = 0;
    let photoCount = 0;
    let seenNeedsPhoto = 0;

    rows.forEach((row) => {
      const isVisible = visibleMatch(row);
      row.toggleAttribute("hidden", !isVisible);

      if (!isVisible) {
        return;
      }

      visibleCount += 1;
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

    familyBlocks.forEach((family) => {
      const hasVisibleRows = family.querySelector("[data-bird-row]:not([hidden])") !== null;
      family.toggleAttribute("hidden", !hasVisibleRows);
    });

    orderBlocks.forEach((order) => {
      const hasVisibleFamilies = order.querySelector(".bird-family:not([hidden])") !== null;
      order.toggleAttribute("hidden", !hasVisibleFamilies);
    });

    if (totalNode) totalNode.textContent = String(visibleCount);
    if (seenNode) seenNode.textContent = String(seenCount);
    if (photoNode) photoNode.textContent = String(photoCount);
    if (backlogNode) backlogNode.textContent = String(seenNeedsPhoto);
    if (emptyState) emptyState.toggleAttribute("hidden", visibleCount !== 0);
  };

  rarityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-rarity-mode");
      if (!mode) return;

      rarityMode = mode;
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

      filterMode = mode;
      filterButtons.forEach((node) => {
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

  applyFilters();
})();
