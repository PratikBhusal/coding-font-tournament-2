import { computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import codingFonts from './codingFonts';
import { TournamentEliminationMode } from './game';

// Cross-island state shared by the sidebar form and the board. Both islands import
// this module, so they share one set of atoms at runtime. persistentAtom mirrors
// each value to localStorage (JSON-encoded, matching the prior persistedSignal
// format so existing stored values keep working).
const json = { encode: JSON.stringify, decode: JSON.parse };

export const $tournamentFamilies = persistentAtom<string[] | null>('tournamentFontFamilies', null, json);
export const $eliminationMode = persistentAtom<TournamentEliminationMode>(
  'tournamentEliminationMode',
  TournamentEliminationMode.Double,
  json
);
export const $showName = persistentAtom<boolean>('showName', false, json);
export const $savedTournamentResult = persistentAtom<any>('savedTournamentResult', null, json);

// Seed the default (curated) selection once, the first time the app runs with no
// stored selection. An empty array is a deliberate user choice and is left as-is.
if (typeof window !== 'undefined' && $tournamentFamilies.get() === null) {
  $tournamentFamilies.set(
    codingFonts.filter((font) => font.includeInInitialTournament).map((font) => font.family)
  );
}

export const $selectedFonts = computed($tournamentFamilies, (families) => {
  const selected = new Set(families ?? []);
  return codingFonts.filter((font) => selected.has(font.family));
});
export const $canStartTournament = computed($selectedFonts, (fonts) => fonts.length >= 2);

/** Dispatched by the sidebar's Start button; handled by the board island. */
export const TOURNAMENT_START_EVENT = 'tournament:start';
