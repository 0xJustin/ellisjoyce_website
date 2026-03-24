(() => {
  const targets = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.14 }
  );

  targets.forEach((node) => observer.observe(node));
})();

(() => {
  const tabRoot = document.querySelector("[data-blog-tabs]");
  if (!(tabRoot instanceof HTMLElement)) return;

  const tabButtons = Array.from(tabRoot.querySelectorAll("[data-blog-tab]"));
  const cards = Array.from(document.querySelectorAll("[data-blog-category]"));
  if (!tabButtons.length || !cards.length) return;

  const hasCategory = (category) =>
    cards.some((card) => card.getAttribute("data-blog-category") === category);

  const applyCategory = (category) => {
    tabButtons.forEach((button) => {
      const isActive = button.getAttribute("data-blog-tab") === category;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    cards.forEach((card) => {
      const isVisible = card.getAttribute("data-blog-category") === category;
      card.toggleAttribute("hidden", !isVisible);
    });
  };

  const defaultCategory = tabRoot.getAttribute("data-blog-default");
  const startingCategory =
    defaultCategory && hasCategory(defaultCategory)
      ? defaultCategory
      : hasCategory("science")
        ? "science"
        : "monthly";

  applyCategory(startingCategory);

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.getAttribute("data-blog-tab");
      if (category) {
        applyCategory(category);
      }
    });
  });
})();
