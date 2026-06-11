import {
  applyAppearance,
  getFontSize,
  getLanguage,
  getLigatures,
  getOpenType,
  getTheme,
  setFontSize,
  setLanguage,
  setLigatures,
  setOpenType,
  setTheme
} from '../lib/appearance';

export function initControls() {
  const theme = document.getElementById('ctrl-theme') as HTMLSelectElement | null;
  const language = document.getElementById('ctrl-language') as HTMLSelectElement | null;
  const sizeNumber = document.getElementById('ctrl-font-size-number') as HTMLInputElement | null;
  const sizeRange = document.getElementById('ctrl-font-size-range') as HTMLInputElement | null;
  const ligatures = document.getElementById('ctrl-ligatures') as HTMLInputElement | null;
  const openType = document.getElementById('ctrl-opentype') as HTMLInputElement | null;
  if (!theme) return;

  // Seed inputs from persisted state, then ensure CSS reflects it.
  theme.value = getTheme();
  if (language) language.value = getLanguage();
  const size = getFontSize();
  if (sizeNumber) sizeNumber.value = String(size);
  if (sizeRange) sizeRange.value = String(size);
  if (ligatures) ligatures.checked = getLigatures();
  if (openType) openType.checked = getOpenType();
  applyAppearance();

  // `<select>` fires `change` (not `input`) reliably on mobile Safari.
  theme.addEventListener('change', () => setTheme(theme.value));
  language?.addEventListener('change', () => setLanguage(language.value));

  const onSize = (value: string) => {
    const next = Number(value);
    setFontSize(next);
    if (sizeNumber) sizeNumber.value = String(next);
    if (sizeRange) sizeRange.value = String(next);
  };
  sizeNumber?.addEventListener('input', () => onSize(sizeNumber.value));
  sizeRange?.addEventListener('input', () => onSize(sizeRange.value));
  ligatures?.addEventListener('change', () => setLigatures(ligatures.checked));
  openType?.addEventListener('change', () => setOpenType(openType.checked));
}
