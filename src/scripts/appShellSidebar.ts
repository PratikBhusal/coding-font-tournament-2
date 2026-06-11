import { readJSON, writeJSON } from "../lib/storage";

let bound = false;
let dragStartX = 0;
let dragStartWidth = 0;
let dragCurrent = 0;

// Relative default (~1/3 of the viewport ≈ 480px at 1440px wide), floored at 192px.
const defaultSidebarWidth = () => Math.round((window.innerWidth || 1024) / 3);
const clampWidth = (width: number) =>
  Math.min(Math.max(width, 192), window.innerWidth || width);

const getAside = () => document.getElementById("app-sidebar");
// `data-default-open` opens the sidebar on every viewport; otherwise it opens only
// on large screens. Either way the sidebar stays user-toggleable.
const defaultOpen = (aside: HTMLElement) =>
  aside.dataset.defaultOpen === "1" ||
  window.matchMedia("(min-width: 1024px)").matches;
const isOpen = (aside: HTMLElement) => readJSON("menuOpen", defaultOpen(aside));

function applyWidth() {
  const aside = getAside();
  if (!aside) return;
  aside.style.width = isOpen(aside)
    ? `${clampWidth(readJSON("sidebarWidth", defaultSidebarWidth()))}px`
    : "0px";
}

function onPointerMove(event: PointerEvent) {
  const aside = getAside();
  if (!aside) return;
  dragCurrent = clampWidth(dragStartWidth + event.clientX - dragStartX);
  aside.style.width = `${dragCurrent}px`;
}
function onPointerUp() {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  writeJSON("sidebarWidth", dragCurrent);
}

// Delegated/window listeners registered once — independent of `astro:page-load` timing.
export function initSidebar() {
  const aside = getAside();
  if (aside && window.localStorage.getItem("menuOpen") === null) {
    // Seed the persisted state from the page's default the first time only.
    writeJSON("menuOpen", defaultOpen(aside));
  }
  applyWidth();

  if (bound) return;
  bound = true;

  window.addEventListener("app:menu-toggle", () => {
    const current = getAside();
    if (!current) return;
    writeJSON("menuOpen", !isOpen(current));
    applyWidth();
  });
  window.addEventListener("app:menu-open", () => {
    if (!getAside()) return;
    writeJSON("menuOpen", true);
    applyWidth();
  });
  window.addEventListener("app:menu-close", () => {
    if (!getAside()) return;
    writeJSON("menuOpen", false);
    applyWidth();
  });

  document.addEventListener("pointerdown", (event) => {
    const handle = (event.target as HTMLElement | null)?.closest(
      "#app-sidebar-resize",
    );
    const current = getAside();
    if (!handle || !current) return;
    event.preventDefault();
    writeJSON("menuOpen", true);
    dragStartX = event.clientX;
    dragStartWidth =
      current.getBoundingClientRect().width ||
      readJSON("sidebarWidth", defaultSidebarWidth());
    dragCurrent = dragStartWidth;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });

  document.addEventListener("dblclick", (event) => {
    const handle = (event.target as HTMLElement | null)?.closest(
      "#app-sidebar-resize",
    );
    if (!handle) return;
    writeJSON("menuOpen", true);
    writeJSON("sidebarWidth", defaultSidebarWidth());
    applyWidth();
  });
}
