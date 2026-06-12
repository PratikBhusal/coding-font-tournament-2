import { readJSON, writeJSON } from "../lib/storage";

// Legacy key — keeps the browse selection sticky across reloads/navigations.
const FONT_KEY = "fontFamily";

let bound = false;

// Slugs of the currently shown fonts, so Compare buttons can be hidden for both.
// `comparedSlug` is "" when not comparing.
let selectedSlug = "";
let selectedPath = "";
let comparedSlug = "";

function setLink(id: string, href: string | undefined, hide: boolean) {
  const el = document.getElementById(id) as HTMLAnchorElement | null;
  if (!el) return;
  el.hidden = hide;
  if (href) el.href = href;
}

/**
 * Paint one font view (header + specimen) from a table row's data attributes.
 * `prefix` selects the element ids: `${prefix}-name`, `-visit`, `-download`,
 * `-maximize`, `-specimen`. Shared by the primary and compare columns.
 */
function paintView(prefix: string, d: DOMStringMap, maximizeHref: string) {
  const specimen = document.getElementById(`${prefix}-specimen`);
  if (specimen) {
    if (d.cssFamily) specimen.style.fontFamily = d.cssFamily;
    if (d.featBoth) specimen.style.setProperty("--feat-both", d.featBoth);
    if (d.featLig) specimen.style.setProperty("--feat-lig", d.featLig);
    if (d.featOt) specimen.style.setProperty("--feat-ot", d.featOt);
  }

  const name = document.getElementById(`${prefix}-name`);
  if (name) {
    name.textContent = d.displayName ?? "";
    // Track the painted font so the close buttons know which font each view holds.
    name.dataset.family = d.family ?? "";
    if (d.cssFamily) name.style.fontFamily = d.cssFamily;
    name.style.fontFeatureSettings = d.featBoth || "normal";
  }

  const isSystem = d.system === "1";
  setLink(`${prefix}-visit`, d.siteUrl, isSystem);
  setLink(`${prefix}-download`, d.downloadUrl, isSystem);
  setLink(`${prefix}-maximize`, maximizeHref, false);
}

/**
 * Point every Compare link at "<selectedPath>/<rowSlug>", hiding the button for any
 * font already on screen — the selected (left) font, and the compared (right) font
 * while comparing — since comparing a shown font with itself makes no sense.
 * `selectedPath` is the base-prefixed font path (e.g. /base/Left); the slugs are bare
 * (used for identity + the trailing segment), so no base handling is needed here.
 */
function updateCompareLinks() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    "a.compare-link",
  )) {
    const cmp = link.dataset.compareSlug ?? "";
    link.hidden =
      cmp === selectedSlug || (comparedSlug !== "" && cmp === comparedSlug);
    link.href = `${selectedPath}/${cmp}`;
  }
}

function highlightRow(active: HTMLElement) {
  for (const row of document.querySelectorAll<HTMLElement>("tr[data-family]")) {
    const on = row === active;
    row.classList.toggle("bg-blue-100", on);
    row.classList.toggle("dark:bg-blue-900/40", on);
  }
}

/** Apply a row's font to the primary (left) view and exit any active comparison. */
function applyFont(row: HTMLElement) {
  const d = row.dataset;
  selectedSlug = d.slug ?? "";
  selectedPath = d.path ?? "";
  paintView("browse", d, selectedPath);
  closeCompare(); // clears comparedSlug and refreshes the Compare buttons
  highlightRow(row);
}

/** Show the right-hand view comparing `row`'s font against the current selection. */
function openCompare(row: HTMLElement) {
  comparedSlug = row.dataset.slug ?? "";
  paintView("browse-compare", row.dataset, `${selectedPath}/${comparedSlug}`);
  // Both shown fonts now hide their Compare button.
  updateCompareLinks();

  const compare = document.getElementById("browse-compare");
  const board = document.getElementById("browse-board");
  const leftClose = document.getElementById("browse-close");
  if (compare) compare.hidden = false;
  if (board) board.classList.add("md:grid-cols-2");
  // While comparing, the left view also gets a close button (removes the left font).
  if (leftClose) leftClose.hidden = false;
}

function closeCompare() {
  comparedSlug = "";
  // Restore the (formerly compared) font's Compare button; only the left stays hidden.
  updateCompareLinks();

  const compare = document.getElementById("browse-compare");
  const board = document.getElementById("browse-board");
  const leftClose = document.getElementById("browse-close");
  if (compare) compare.hidden = true;
  if (board) board.classList.remove("md:grid-cols-2");
  if (leftClose) leftClose.hidden = true;
}

function selectFamily(family: string) {
  const row = document.querySelector<HTMLElement>(
    `tr[data-family="${CSS.escape(family)}"]`,
  );
  if (row) applyFont(row);
}

export function initBrowseFont() {
  // Restore the last selection, falling back to the server-rendered featured font.
  const initial =
    readJSON<string | null>(FONT_KEY, null) ??
    document.getElementById("browse-name")?.dataset.family;
  if (initial) selectFamily(initial);

  if (bound) return;
  bound = true;

  // Capture phase so we run before Astro's ClientRouter link handler: marking the
  // event `defaultPrevented` here makes the router skip its view transition.
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Right view's close keeps the left font (just exit comparison).
      if (target.closest("#browse-compare-close")) {
        closeCompare();
        return;
      }

      // Left view's close removes the left font: promote the compared (right) font to
      // the sole view.
      if (target.closest("#browse-close")) {
        const rightFamily = document.getElementById("browse-compare-name")
          ?.dataset.family;
        if (rightFamily) {
          selectFamily(rightFamily);
          writeJSON(FONT_KEY, rightFamily);
        }
        return;
      }

      // Left-clicking Compare opens the in-place comparison; modified clicks follow
      // the href so the full side-by-side page can still open in a new tab.
      const compareBtn = target.closest<HTMLElement>("a.compare-link");
      if (compareBtn) {
        const mouse = event as MouseEvent;
        if (
          mouse.metaKey ||
          mouse.ctrlKey ||
          mouse.shiftKey ||
          mouse.button !== 0
        )
          return;
        event.preventDefault();
        const row = compareBtn.closest<HTMLElement>("tr[data-family]");
        if (row) openCompare(row);
        return;
      }

      // Let real links (maximize / visit / download) navigate as usual.
      if (target.closest("a")) return;
      const row = target.closest<HTMLElement>("tr[data-family]");
      if (!row?.dataset.family) return;
      applyFont(row);
      writeJSON(FONT_KEY, row.dataset.family);
    },
    { capture: true },
  );
}
