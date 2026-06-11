let bound = false;

function filter() {
  const input = document.getElementById(
    "font-search",
  ) as HTMLInputElement | null;
  if (!input) return;
  const query = input.value.trim().toLowerCase();
  for (const row of document.querySelectorAll<HTMLElement>("[data-search]")) {
    row.hidden = query !== "" && !(row.dataset.search ?? "").includes(query);
  }
}

// Delegated listeners (registered once) — independent of `astro:page-load` timing.
export function initSearch() {
  const input = document.getElementById(
    "font-search",
  ) as HTMLInputElement | null;
  if (input) {
    const platform = navigator.platform.toUpperCase();
    input.placeholder = platform.includes("MAC")
      ? "⌘ K to Search ..."
      : platform.includes("WIN")
        ? "Ctrl K to Search ..."
        : "Search ...";
  }
  filter();

  if (!bound) {
    bound = true;
    document.addEventListener("input", (event) => {
      if ((event.target as HTMLElement | null)?.id === "font-search") filter();
    });
    window.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = document.getElementById(
          "font-search",
        ) as HTMLInputElement | null;
        if (input) {
          input.focus();
          event.preventDefault();
        }
      }
    });
  }
}
