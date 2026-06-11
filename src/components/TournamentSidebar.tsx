import { createSignal, For, Show } from 'solid-js';
import { useStore } from '@nanostores/solid';
import type { CodingFont } from '../lib/codingFonts';
import { getFontDisplayName, getFontStyle } from '../lib/fontFeatures';
import { TournamentEliminationMode } from '../lib/game';
import {
  $canStartTournament,
  $eliminationMode,
  $selectedFonts,
  $tournamentFamilies,
  TOURNAMENT_START_EVENT
} from '../lib/tournamentStore';

type TournamentSidebarProps = {
  fonts: CodingFont[];
};

export default function TournamentSidebar(props: TournamentSidebarProps) {
  const families = useStore($tournamentFamilies);
  const selectedFonts = useStore($selectedFonts);
  const eliminationMode = useStore($eliminationMode);
  const canStart = useStore($canStartTournament);

  const [fontSubsetSearch, setFontSubsetSearch] = createSignal('');
  const [fontSubsetImportText, setFontSubsetImportText] = createSignal('');
  const [fontSubsetImportMessage, setFontSubsetImportMessage] = createSignal('');

  const selectedFamilySet = () => new Set(families() ?? []);
  const filteredTournamentFonts = () => {
    const query = fontSubsetSearch().trim().toLowerCase();
    return props.fonts.filter((font) =>
      [font.family, getFontDisplayName(font)].some((fontName) => fontName.toLowerCase().includes(query))
    );
  };

  function importTournamentFonts() {
    const byName = new Map<string, string>();
    props.fonts.forEach((font) => {
      byName.set(font.family.trim().toLowerCase(), font.family);
      byName.set(getFontDisplayName(font).trim().toLowerCase(), font.family);
    });

    const imported = fontSubsetImportText()
      .split(/[\n,;]+/)
      .map((family) => family.trim())
      .filter(Boolean);
    const matched: string[] = [];
    const missing: string[] = [];

    imported.forEach((family) => {
      const match = byName.get(family.toLowerCase());
      if (match) matched.push(match);
      else missing.push(family);
    });

    $tournamentFamilies.set(Array.from(new Set(matched)));
    setFontSubsetImportMessage(`${matched.length} matched${missing.length ? `, ${missing.length} not found` : ''}.`);
  }

  function toggleTournamentFont(family: string) {
    const list = $tournamentFamilies.get() ?? [];
    $tournamentFamilies.set(list.includes(family) ? list.filter((value) => value !== family) : [...list, family]);
  }

  function startTournament() {
    if (!$canStartTournament.get()) return;
    window.dispatchEvent(new CustomEvent(TOURNAMENT_START_EVENT));
  }

  return (
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Font Pool</span>
        <span class="text-sm text-slate-600 dark:text-slate-400">
          {selectedFonts().length}/{props.fonts.length}
        </span>
      </div>
      <input class="min-h-9 rounded-md border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" type="search" placeholder="Search fonts" value={fontSubsetSearch()} onInput={(event) => setFontSubsetSearch(event.currentTarget.value)} />
      <div class="@container flex flex-wrap gap-2">
        <button class="min-h-9 flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-200 @max-xs:basis-[calc(50%-0.25rem)] dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => $tournamentFamilies.set(props.fonts.map((font) => font.family))}>All</button>
        <button class="min-h-9 flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-200 @max-xs:basis-[calc(50%-0.25rem)] dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => $tournamentFamilies.set(props.fonts.filter((font) => font.includeInInitialTournament).map((font) => font.family))}>Curated</button>
        <button class="min-h-9 flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-200 @max-xs:basis-full dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => $tournamentFamilies.set([])}>Clear</button>
      </div>
      <textarea class="min-h-24 rounded-md border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950" placeholder="Paste font names" value={fontSubsetImportText()} onInput={(event) => setFontSubsetImportText(event.currentTarget.value)} />
      <button class="min-h-9 rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800" disabled={!fontSubsetImportText().trim()} onClick={importTournamentFonts}>Import list</button>
      <Show when={fontSubsetImportMessage()}>
        <span class="text-sm text-slate-600 dark:text-slate-400">{fontSubsetImportMessage()}</span>
      </Show>
      <label class="flex flex-col gap-1 text-sm">
        <span class="font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Elimination</span>
        <select class="min-h-9 rounded-md border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-950" value={eliminationMode()} onInput={(event) => $eliminationMode.set(event.currentTarget.value as TournamentEliminationMode)}>
          <option value={TournamentEliminationMode.Single}>Single</option>
          <option value={TournamentEliminationMode.Double}>Double</option>
        </select>
      </label>
      <button class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canStart()} onClick={startTournament}>Start Tournament</button>
      <div class="flex flex-col gap-2">
        <For each={filteredTournamentFonts()}>
          {(font) => (
            <label class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-800">
              <input class="h-4 w-4 accent-blue-600" type="checkbox" checked={selectedFamilySet().has(font.family)} onInput={() => toggleTournamentFont(font.family)} />
              <span style={getFontStyle(font)}>{getFontDisplayName(font)}</span>
            </label>
          )}
        </For>
      </div>
    </div>
  );
}
