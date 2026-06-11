import { readJSON, writeJSON } from '../lib/storage';

// Legacy key — keeps the browse selection sticky across reloads/navigations.
const FONT_KEY = 'fontFamily';

let bound = false;

function setLink(id: string, href: string | undefined, hide: boolean) {
  const el = document.getElementById(id) as HTMLAnchorElement | null;
  if (!el) return;
  el.hidden = hide;
  if (href) el.href = href;
}

const slugOf = (path: string | undefined) => (path ?? '').replace(/^\//, '');

/**
 * Paint one font view (header + specimen) from a table row's data attributes.
 * `prefix` selects the element ids: `${prefix}-name`, `-visit`, `-download`,
 * `-maximize`, `-specimen`. Shared by the primary and compare columns.
 */
function paintView(prefix: string, d: DOMStringMap, maximizeHref: string) {
  const specimen = document.getElementById(`${prefix}-specimen`);
  if (specimen) {
    if (d.cssFamily) specimen.style.fontFamily = d.cssFamily;
    if (d.featBoth) specimen.style.setProperty('--feat-both', d.featBoth);
    if (d.featLig) specimen.style.setProperty('--feat-lig', d.featLig);
    if (d.featOt) specimen.style.setProperty('--feat-ot', d.featOt);
  }

  const name = document.getElementById(`${prefix}-name`);
  if (name) {
    name.textContent = d.displayName ?? '';
    if (d.cssFamily) name.style.fontFamily = d.cssFamily;
    name.style.fontFeatureSettings = d.featBoth || 'normal';
  }

  const isSystem = d.system === '1';
  setLink(`${prefix}-visit`, d.siteUrl, isSystem);
  setLink(`${prefix}-download`, d.downloadUrl, isSystem);
  setLink(`${prefix}-maximize`, maximizeHref, false);
}

/** Point every Compare link at "/<selected>/<row>", hiding the selected font's own. */
function refreshCompareLinks(selectedSlug: string) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a.compare-link')) {
    const cmp = link.dataset.compareSlug ?? '';
    link.hidden = cmp === selectedSlug;
    link.href = `/${selectedSlug}/${cmp}`;
  }
}

function highlightRow(active: HTMLElement) {
  for (const row of document.querySelectorAll<HTMLElement>('tr[data-family]')) {
    const on = row === active;
    row.classList.toggle('bg-blue-100', on);
    row.classList.toggle('dark:bg-blue-900/40', on);
  }
}

/** Apply a row's font to the primary (left) view and exit any active comparison. */
function applyFont(row: HTMLElement) {
  const d = row.dataset;
  paintView('browse', d, d.slug ?? '');

  const name = document.getElementById('browse-name');
  if (name) name.dataset.family = d.family ?? '';

  closeCompare();
  refreshCompareLinks(slugOf(d.slug));
  highlightRow(row);
}

/** Show the right-hand view comparing `row`'s font against the current selection. */
function openCompare(row: HTMLElement) {
  const selectedPath = document.getElementById('browse-maximize')?.getAttribute('href') ?? '';
  paintView('browse-compare', row.dataset, `${selectedPath}/${slugOf(row.dataset.slug)}`);

  const compare = document.getElementById('browse-compare');
  const board = document.getElementById('browse-board');
  if (compare) compare.hidden = false;
  if (board) board.classList.add('md:grid-cols-2');
}

function closeCompare() {
  const compare = document.getElementById('browse-compare');
  const board = document.getElementById('browse-board');
  if (compare) compare.hidden = true;
  if (board) board.classList.remove('md:grid-cols-2');
}

function selectFamily(family: string) {
  const row = document.querySelector<HTMLElement>(`tr[data-family="${CSS.escape(family)}"]`);
  if (row) applyFont(row);
}

export function initBrowseFont() {
  // Restore the last selection, falling back to the server-rendered featured font.
  const initial = readJSON<string | null>(FONT_KEY, null) ?? document.getElementById('browse-name')?.dataset.family;
  if (initial) selectFamily(initial);

  if (bound) return;
  bound = true;

  // Capture phase so we run before Astro's ClientRouter link handler: marking the
  // event `defaultPrevented` here makes the router skip its view transition.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('#browse-compare-close')) {
        closeCompare();
        return;
      }

      // Left-clicking Compare opens the in-place comparison; modified clicks follow
      // the href so the full side-by-side page can still open in a new tab.
      const compareBtn = target.closest<HTMLElement>('a.compare-link');
      if (compareBtn) {
        const mouse = event as MouseEvent;
        if (mouse.metaKey || mouse.ctrlKey || mouse.shiftKey || mouse.button !== 0) return;
        event.preventDefault();
        const row = compareBtn.closest<HTMLElement>('tr[data-family]');
        if (row) openCompare(row);
        return;
      }

      // Let real links (maximize / visit / download) navigate as usual.
      if (target.closest('a')) return;
      const row = target.closest<HTMLElement>('tr[data-family]');
      if (!row?.dataset.family) return;
      applyFont(row);
      writeJSON(FONT_KEY, row.dataset.family);
    },
    { capture: true }
  );
}
