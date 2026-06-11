let navCloseBound = false;

function closeNavMenu() {
  const nav = document.getElementById('app-nav-menu');
  const toggle = document.getElementById('app-nav-toggle');
  if (nav) nav.hidden = true;
  toggle?.setAttribute('aria-expanded', 'false');
}

// Bind directly to the header buttons. A per-element flag dedups the immediate
// call + the `astro:page-load` call, while still rebinding the fresh buttons that
// a view-transition swap creates.
export function initHeader() {
  const navToggle = document.getElementById('app-nav-toggle');
  if (navToggle && !navToggle.dataset.bound) {
    navToggle.dataset.bound = '1';
    navToggle.addEventListener('click', () => {
      const nav = document.getElementById('app-nav-menu');
      if (!nav) return;
      nav.hidden = !nav.hidden;
      navToggle.setAttribute('aria-expanded', String(!nav.hidden));
    });
  }

  // Close the mobile nav when clicking outside it. Registered once on document.
  if (!navCloseBound) {
    navCloseBound = true;
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('#app-nav-toggle') || target?.closest('#app-nav-menu')) return;
      closeNavMenu();
    });
  }

  const menu = document.getElementById('app-menu-toggle');
  if (menu && !menu.dataset.bound) {
    menu.dataset.bound = '1';
    menu.addEventListener('click', () => window.dispatchEvent(new CustomEvent('app:menu-toggle')));
  }

  const theme = document.getElementById('app-theme-toggle');
  if (theme && !theme.dataset.bound) {
    theme.dataset.bound = '1';
    theme.addEventListener('click', () => {
      const dark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', dark);
      try {
        window.localStorage.setItem('colorScheme', dark ? 'dark' : 'light');
      } catch {
        /* ignore */
      }
    });
  }
}
