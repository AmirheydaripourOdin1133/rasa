const header = document.querySelector("#site-header");
const navToggle = document.querySelector(".nav-toggle");
const navIcon = navToggle?.querySelector(".nav-toggle__icon");
const mobileNav = document.querySelector("#mobile-nav");
const desktopQuery = window.matchMedia("(min-width: 1024px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Header gains a stronger shadow once the page scrolls. */
const syncHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

/* ---------- Back to top (desktop) ---------- */

const backToTop = document.querySelector(".back-to-top");
const heroSection = document.querySelector(".hero");

const syncBackToTop = () => {
  if (!backToTop || !heroSection) return;

  const threshold = heroSection.offsetTop + heroSection.offsetHeight - 120;
  const visible = window.scrollY > threshold;

  backToTop.classList.toggle("is-visible", visible);
  backToTop.setAttribute("aria-hidden", String(!visible));
  backToTop.tabIndex = visible ? 0 : -1;
};

syncBackToTop();
window.addEventListener("scroll", syncBackToTop, { passive: true });
window.addEventListener("resize", syncBackToTop);

backToTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
});

/* ---------- Mobile menu ---------- */

const setMenu = (open, { focusToggle = false } = {}) => {
  if (!navToggle || !mobileNav) return;

  mobileNav.hidden = !open;
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");

  if (navIcon) navIcon.textContent = open ? "close" : "menu";
  if (focusToggle) navToggle.focus();
};

navToggle?.addEventListener("click", () => {
  setMenu(mobileNav.hidden);
});

mobileNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileNav && !mobileNav.hidden) {
    setMenu(false, { focusToggle: true });
  }
});

document.addEventListener("click", (event) => {
  if (!mobileNav || mobileNav.hidden) return;
  if (!event.target.closest("#site-header")) setMenu(false);
});

desktopQuery.addEventListener("change", (event) => {
  if (event.matches) setMenu(false);
});

/* ---------- Feature tabs ---------- */

const tablist = document.querySelector('[role="tablist"]');
const tabs = tablist ? Array.from(tablist.querySelectorAll('[role="tab"]')) : [];
const isRtl = document.documentElement.dir === "rtl";

const hidePanel = (panel) => {
  if (panel.hidden || panel.classList.contains("is-leaving")) return;

  window.clearTimeout(panel._leaveTimer);

  if (reduceMotion) {
    panel.hidden = true;
    return;
  }

  panel.classList.add("is-leaving");
  panel._leaveTimer = window.setTimeout(() => {
    panel.classList.remove("is-leaving");
    panel.hidden = true;
  }, 160);
};

const showPanel = (panel) => {
  window.clearTimeout(panel._leaveTimer);
  panel.classList.remove("is-leaving");

  if (panel.hidden) panel.hidden = false;
  if (reduceMotion) return;

  panel.classList.remove("is-entering");
  /* Restart the animation even when the same tab is re-selected. */
  void panel.offsetWidth;
  panel.classList.add("is-entering");
  panel.addEventListener(
    "animationend",
    (event) => {
      if (event.target === panel) panel.classList.remove("is-entering");
    },
    { once: true },
  );
};

const selectTab = (tab, { moveFocus = true } = {}) => {
  for (const item of tabs) {
    const selected = item === tab;
    const panel = document.getElementById(item.getAttribute("aria-controls"));

    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;

    if (!panel) continue;
    if (selected) showPanel(panel);
    else hidePanel(panel);
  }

  if (moveFocus) tab.focus();
};

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener("click", () => selectTab(tab, { moveFocus: false }));

  tab.addEventListener("keydown", (event) => {
    const nextKey = isRtl ? "ArrowLeft" : "ArrowRight";
    const previousKey = isRtl ? "ArrowRight" : "ArrowLeft";
    let target = null;

    if (event.key === nextKey) target = tabs[(index + 1) % tabs.length];
    else if (event.key === previousKey) target = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === "Home") target = tabs[0];
    else if (event.key === "End") target = tabs[tabs.length - 1];

    if (!target) return;

    event.preventDefault();
    selectTab(target);
  });
}

/* ---------- Entrance motion ---------- */

const revealTargets = Array.from(document.querySelectorAll("[data-reveal]"));

if (!reduceMotion && "IntersectionObserver" in window) {
  /* Stagger siblings so grouped items arrive one after another. */
  for (const element of revealTargets) {
    const customDelay = element.dataset.revealDelay;

    if (customDelay) {
      element.style.setProperty("--reveal-delay", `${customDelay}ms`);
      continue;
    }

    const siblings = Array.from(element.parentElement?.children ?? []).filter((item) =>
      item.hasAttribute("data-reveal"),
    );
    const index = siblings.indexOf(element);

    if (index > 0) element.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 90}ms`);
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-inview");
        revealObserver.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );

  for (const element of revealTargets) revealObserver.observe(element);
}

/* ---------- Stat counters ---------- */

const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const toPersian = (value) => String(value).replace(/\d/g, (digit) => faDigits[Number(digit)]);

const formatStat = (element, value) => {
  const prefix = element.dataset.countPrefix ?? "";
  const suffix = element.dataset.countSuffix ?? "";
  element.textContent = `${prefix}${toPersian(value)}${suffix}`;
};

const animateStat = (element) => {
  const target = Number(element.dataset.count);
  const duration = 1400;
  let startedAt = null;

  const step = (timestamp) => {
    if (startedAt === null) startedAt = timestamp;

    const progress = Math.min((timestamp - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    formatStat(element, Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
    else formatStat(element, target);
  };

  requestAnimationFrame(step);
};

const counters = Array.from(document.querySelectorAll("[data-count]"));

if (!reduceMotion && counters.length) {
  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          formatStat(entry.target, 0);
          animateStat(entry.target);
          counterObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.5 },
    );

    for (const element of counters) counterObserver.observe(element);
  } else {
    for (const element of counters) animateStat(element);
  }
}

document.documentElement.classList.add("motion-ready");

/* Safety net: if frames never arrive (background tab, throttling), show everything. */
if (revealTargets.length) {
  window.setTimeout(() => {
    if (document.querySelector("[data-reveal].is-inview")) return;

    document.documentElement.classList.remove("js");
    for (const element of counters) formatStat(element, Number(element.dataset.count));
  }, 1600);
}
