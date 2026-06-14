import { type Accessor, createSignal, For, Show } from "solid-js";
import { useStore } from "../lib/useStore";
import type { CodingFont } from "../lib/codingFonts";
import { getFontDisplayName, getFontStyle } from "../lib/fontFeatures";
import { TournamentEliminationMode } from "../lib/game";
import {
  $canStartTournament,
  $eliminationMode,
  $selectedFonts,
  $tournamentFamilies,
  TOURNAMENT_START_EVENT,
} from "../lib/tournamentStore";

type TournamentSidebarProps = {
  fonts: CodingFont[];
};

const fieldClass =
  "min-h-9 rounded-md border border-surface-300 bg-white px-3 dark:border-surface-700 dark:bg-surface-900";
const buttonClass =
  "inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-surface-300 px-3 py-2 transition-transform hover:bg-surface-200 active:scale-95 active:bg-surface-300 dark:border-surface-700 dark:hover:bg-surface-800 dark:active:bg-surface-700";
const labelClass =
  "text-sm font-bold uppercase tracking-wide text-surface-600 dark:text-surface-400";

function PoolHeader(props: { fonts: CodingFont[] }) {
  const selectedFonts = useStore($selectedFonts);
  return (
    <div class="flex items-center justify-between gap-2">
      <span class={labelClass}>Font Pool</span>
      <span class="text-surface-600 dark:text-surface-400 text-sm">
        {selectedFonts().length}/{props.fonts.length}
      </span>
    </div>
  );
}

function FontSearch(props: {
  query: Accessor<string>;
  setQuery: (value: string) => void;
}) {
  return (
    <input
      class={fieldClass}
      type="search"
      placeholder="Search fonts"
      value={props.query()}
      onInput={(event) => props.setQuery(event.currentTarget.value)}
    />
  );
}

function PoolPresets(props: { fonts: CodingFont[] }) {
  const curated = () =>
    props.fonts
      .filter((font) => font.includeInInitialTournament)
      .map((font) => font.family);
  return (
    <div class="@container flex flex-wrap gap-2">
      <button
        class={`${buttonClass} @max-xs:basis-[calc(50%-0.25rem)]`}
        onClick={() =>
          $tournamentFamilies.set(props.fonts.map((font) => font.family))
        }
      >
        <span class="icon-[lucide--list-checks] h-4 w-4 shrink-0" />
        All
      </button>
      <button
        class={`${buttonClass} @max-xs:basis-[calc(50%-0.25rem)]`}
        onClick={() => $tournamentFamilies.set(curated())}
      >
        <span class="icon-[lucide--astroid] h-4 w-4 shrink-0" />
        Curated
      </button>
      <button
        class={`${buttonClass} @max-xs:basis-full`}
        onClick={() => $tournamentFamilies.set([])}
      >
        <span class="icon-[lucide--brush-cleaning] h-4 w-4 shrink-0" />
        Clear
      </button>
    </div>
  );
}

function ImportList(props: { fonts: CodingFont[] }) {
  const [importText, setImportText] = createSignal("");
  const [importMessage, setImportMessage] = createSignal("");

  function importFonts() {
    const byName = new Map<string, string>();
    props.fonts.forEach((font) => {
      byName.set(font.family.trim().toLowerCase(), font.family);
      byName.set(getFontDisplayName(font).trim().toLowerCase(), font.family);
    });

    const imported = importText()
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
    setImportMessage(
      `${matched.length} matched${missing.length ? `, ${missing.length} not found` : ""}.`,
    );
  }

  return (
    <>
      <textarea
        class="border-surface-300 dark:border-surface-700 dark:bg-surface-900 min-h-24 rounded-md border bg-white p-3"
        placeholder="Paste font names"
        value={importText()}
        onInput={(event) => setImportText(event.currentTarget.value)}
      />
      <button
        class="border-surface-300 hover:bg-surface-200 dark:border-surface-700 dark:hover:bg-surface-800 min-h-9 rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!importText().trim()}
        onClick={importFonts}
      >
        Import list
      </button>
      <Show when={importMessage()}>
        <span class="text-surface-600 dark:text-surface-400 text-sm">
          {importMessage()}
        </span>
      </Show>
    </>
  );
}

function EliminationSelect() {
  const eliminationMode = useStore($eliminationMode);
  return (
    <label class="flex flex-col gap-1 text-sm">
      <span class={labelClass}>Elimination</span>
      <select
        class="border-surface-300 dark:border-surface-700 dark:bg-surface-900 min-h-9 rounded-md border bg-white px-2"
        value={eliminationMode()}
        onInput={(event) =>
          $eliminationMode.set(
            event.currentTarget.value as TournamentEliminationMode,
          )
        }
      >
        <option value={TournamentEliminationMode.Single}>Single</option>
        <option value={TournamentEliminationMode.Double}>Double</option>
      </select>
    </label>
  );
}

function StartButton() {
  const canStart = useStore($canStartTournament);
  function startTournament() {
    if (!$canStartTournament.get()) return;
    window.dispatchEvent(new CustomEvent(TOURNAMENT_START_EVENT));
  }
  return (
    <button
      class="bg-primary-600 hover:bg-primary-500 active:bg-primary-700 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-semibold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!canStart()}
      onClick={startTournament}
    >
      <span class="icon-[lucide--swords] h-4 w-4 shrink-0" />
      Start
    </button>
  );
}

function FontList(props: { fonts: CodingFont[]; query: Accessor<string> }) {
  const families = useStore($tournamentFamilies);
  const selectedFamilySet = () => new Set(families());
  const filtered = () => {
    const query = props.query().trim().toLowerCase();
    return props.fonts.filter((font) =>
      [font.family, getFontDisplayName(font)].some((name) =>
        name.toLowerCase().includes(query),
      ),
    );
  };

  function toggle(family: string) {
    const list = $tournamentFamilies.get();
    $tournamentFamilies.set(
      list.includes(family)
        ? list.filter((value) => value !== family)
        : [...list, family],
    );
  }

  return (
    <div class="flex flex-col gap-2">
      <For each={filtered()}>
        {(font) => (
          <label class="hover:bg-surface-200 dark:hover:bg-surface-800 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1">
            <input
              class="accent-primary-600 h-4 w-4"
              type="checkbox"
              checked={selectedFamilySet().has(font.family)}
              onInput={() => toggle(font.family)}
            />
            <span style={getFontStyle(font)}>{getFontDisplayName(font)}</span>
          </label>
        )}
      </For>
    </div>
  );
}

export default function TournamentSidebar(props: TournamentSidebarProps) {
  // Lifted because the search box and the font list both read it.
  const [query, setQuery] = createSignal("");

  return (
    <div class="flex flex-col gap-2">
      <PoolHeader fonts={props.fonts} />
      <FontSearch query={query} setQuery={setQuery} />
      <PoolPresets fonts={props.fonts} />
      <ImportList fonts={props.fonts} />
      <EliminationSelect />
      <StartButton />
      <FontList fonts={props.fonts} query={query} />
    </div>
  );
}
