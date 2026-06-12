import { computed } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import codingFonts from "./codingFonts";
import { TournamentEliminationMode } from "./game";

// Cross-island state shared by the sidebar form and the board. Both islands import
// this module, so they share one set of atoms at runtime. persistentAtom mirrors
// each value to localStorage (JSON-encoded, matching the prior persistedSignal
// format so existing stored values keep working).
const json = { encode: JSON.stringify, decode: JSON.parse };

// Default (curated) selection. Used as the atom's initial value so the server (under
// client:load) and a first-visit client agree on the rendered selection — avoiding a
// hydration mismatch. A stored value (including an empty array, a deliberate "clear")
// takes precedence on the client.
const initialFamilies = codingFonts
  .filter((font) => font.includeInInitialTournament)
  .map((font) => font.family);

export const $tournamentFamilies = persistentAtom<string[]>(
  "tournamentFontFamilies",
  initialFamilies,
  json,
);
export const $eliminationMode = persistentAtom<TournamentEliminationMode>(
  "tournamentEliminationMode",
  TournamentEliminationMode.Double,
  json,
);
export const $showName = persistentAtom<boolean>("showName", false, json);
export const $savedTournamentResult = persistentAtom<any>(
  "savedTournamentResult",
  null,
  json,
);

export const $selectedFonts = computed($tournamentFamilies, (families) => {
  const selected = new Set(families);
  return codingFonts.filter((font) => selected.has(font.family));
});
export const $canStartTournament = computed(
  $selectedFonts,
  (fonts) => fonts.length >= 2,
);

/** Dispatched by the sidebar's Start button; handled by the board island. */
export const TOURNAMENT_START_EVENT = "tournament:start";
