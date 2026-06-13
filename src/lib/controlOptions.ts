import { codeThemes } from "./codeThemes";

export function getSortedCodeThemes() {
  return [...codeThemes].sort((a, b) => {
    if (a.italic && !b.italic) return -1;
    if (!a.italic && b.italic) return 1;
    return 0;
  });
}
