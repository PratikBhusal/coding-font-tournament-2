// Bind directly to the header buttons. A per-element flag dedups the immediate
// call + the `astro:page-load` call, while still rebinding the fresh buttons that
// a view-transition swap creates.
export function initHeader() {
  const navSelect = document.getElementById(
    "app-nav-select",
  ) as HTMLSelectElement | null;
  if (navSelect && !navSelect.dataset.bound) {
    navSelect.dataset.bound = "1";
    navSelect.addEventListener("change", () => {
      window.location.href = navSelect.value;
    });
  }

  const menu = document.getElementById("app-menu-toggle");
  if (menu && !menu.dataset.bound) {
    menu.dataset.bound = "1";
    menu.addEventListener("click", () =>
      window.dispatchEvent(new CustomEvent("app:menu-toggle")),
    );
  }

  const theme = document.getElementById("app-theme-toggle");
  if (theme && !theme.dataset.bound) {
    theme.dataset.bound = "1";
    theme.addEventListener("click", () => {
      const dark = !document.documentElement.classList.contains("dark");
      document.documentElement.classList.toggle("dark", dark);
      try {
        window.localStorage.setItem("colorScheme", dark ? "dark" : "light");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(
        new CustomEvent("app:color-scheme-change", { detail: { dark } }),
      );
    });
  }
}
