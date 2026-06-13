import {
  type Accessor,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useStore } from "../lib/useStore";
import type { CodingFont } from "../lib/codingFonts";
import {
  getCssFontFamily,
  getFontDisplayName,
  getFontFeatures,
  getFontStyle,
} from "../lib/fontFeatures";
import {
  createConfetti,
  createGame,
  TournamentEliminationMode,
  type TournamentGame,
  type TournamentMatch,
  type TournamentResult,
} from "../lib/game";
import { getFontPath } from "../lib/routes";
import { getFontSize } from "../lib/appearance";
import { sampleLanguages, type SampleLanguage } from "../lib/sampleCode";
import type { HighlightedLines } from "../lib/highlight";
import {
  createTournamentSvg,
  createTournamentSvgFileName,
} from "../lib/tournamentSvg";
import {
  getTotalPlayableRoundCount,
  getTournamentProgress,
} from "../lib/tournamentProgress";
import {
  $canStartTournament,
  $eliminationMode,
  $savedTournamentResult,
  $selectedFonts,
  $showName,
  $viewMode,
  TOURNAMENT_START_EVENT,
} from "../lib/tournamentStore";

type Highlighted = Record<SampleLanguage, string>;
type HighlightedLinesMap = Record<SampleLanguage, HighlightedLines>;

type TournamentBoardProps = {
  highlighted: Highlighted;
  highlightedLines: HighlightedLinesMap;
};

// `origin` is the element confetti bursts from (the card's Choose button).
type ChooseWinner = (font: CodingFont, origin?: HTMLElement) => void;

interface TournamentBoardController {
  progressLabel: Accessor<string>;
  currentPlayers: Accessor<CodingFont[]>;
  leftPlayer: Accessor<CodingFont | undefined>;
  rightPlayer: Accessor<CodingFont | undefined>;
  champion: Accessor<CodingFont | undefined>;
  startGame: (closeSidebar?: boolean) => void;
  chooseWinner: ChooseWinner;
  downloadSvg: () => Promise<void>;
  /** Resume a previously completed tournament from storage. Returns false if none. */
  restoreSaved: () => boolean;
}

function specimenStyle(font: CodingFont) {
  const featBoth = getFontFeatures(font, true, true) || "normal";
  const featLig = getFontFeatures(font, false, true) || "normal";
  const featOt = getFontFeatures(font, true, false) || "normal";
  return `font-family: ${getCssFontFamily(font)}; --feat-both: ${featBoth}; --feat-lig: ${featLig}; --feat-ot: ${featOt}`;
}

function Specimen(props: {
  font: CodingFont;
  highlighted: Highlighted;
  class?: string;
}) {
  return (
    <div
      class={`code-specimen flex max-h-full min-h-0 flex-col overflow-hidden ${props.class ?? ""}`}
      style={specimenStyle(props.font)}
    >
      <For each={sampleLanguages}>
        {(language) => (
          <div
            class="code-lang"
            data-lang={language.id}
            innerHTML={props.highlighted[language.id]}
          />
        )}
      </For>
    </div>
  );
}

/**
 * One rendered row of the unified view: a neutral `A`/`B` gutter (which font the
 * row uses) followed by the line's code in `font`. font-family/features sit on the
 * row (`specimenStyle`); the gutter keeps its own font via CSS.
 */
function UnifiedLine(props: {
  font: CodingFont;
  lineHtml: string;
  label: string;
}) {
  return (
    <span class="line unified-line" style={specimenStyle(props.font)}>
      <span class="unified-line-label" aria-hidden="true">
        {props.label}
      </span>
      <span innerHTML={props.lineHtml} />
    </span>
  );
}

/**
 * Unified view: one specimen per language where every source line is rendered
 * twice in a row — once in `fontA`, once in `fontB` — for stacked comparison.
 * Reuses the build-time per-line Shiki HTML (`HighlightedLines`) and rebuilds an
 * equivalent `<pre class="shiki">` so the existing theme/feature CSS still
 * applies. `specimenStyle` sets each line's font-family + `--feat-*` vars; the
 * `.unified-line` rules in global.css pick the active feature set and stack the
 * lines (display: block).
 */
function UnifiedSpecimen(props: {
  fontA: CodingFont;
  fontB: CodingFont;
  highlightedLines: HighlightedLinesMap;
  class?: string;
}) {
  return (
    <div
      class={`code-specimen flex max-h-full min-h-0 flex-col overflow-hidden ${props.class ?? ""}`}
    >
      <For each={sampleLanguages}>
        {(language) => {
          const data = props.highlightedLines[language.id];
          return (
            <div class="code-lang" data-lang={language.id}>
              <pre class={data.preClass} style={data.preStyle}>
                <code>
                  <For each={data.lines}>
                    {(lineHtml) => (
                      <>
                        <UnifiedLine
                          font={props.fontA}
                          lineHtml={lineHtml}
                          label="A"
                        />
                        <UnifiedLine
                          font={props.fontB}
                          lineHtml={lineHtml}
                          label="B"
                        />
                      </>
                    )}
                  </For>
                </code>
              </pre>
            </div>
          );
        }}
      </For>
    </div>
  );
}

function ControlsBar(props: {
  champion: Accessor<CodingFont | undefined>;
  progressLabel: Accessor<string>;
}) {
  const showName = useStore($showName);
  const viewMode = useStore($viewMode);
  const segmentClass = (active: boolean) =>
    `px-3 py-1 transition-transform active:scale-95 ${
      active
        ? "bg-blue-600 text-white"
        : "bg-transparent text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
    }`;
  return (
    <div class="flex items-center gap-4 border-b border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
      <Show when={!props.champion()}>
        <div class="inline-flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            aria-pressed={viewMode() === "split"}
            class={segmentClass(viewMode() === "split")}
            onClick={() => $viewMode.set("split")}
          >
            Split
          </button>
          <button
            type="button"
            aria-pressed={viewMode() === "unified"}
            class={segmentClass(viewMode() === "unified")}
            onClick={() => $viewMode.set("unified")}
          >
            Unified
          </button>
        </div>
        <label class="flex items-center gap-2">
          <input
            class="h-4 w-4 accent-blue-600"
            type="checkbox"
            checked={showName()}
            onInput={(event) => $showName.set(event.currentTarget.checked)}
          />
          <span>Show Name</span>
        </label>
      </Show>
      <Show when={props.progressLabel()}>
        <span class="flex items-center" data-testid="tournament-progress">
          {props.progressLabel()}
        </span>
      </Show>
    </div>
  );
}

function PlayerCard(props: {
  player: Accessor<CodingFont | undefined>;
  highlighted: Highlighted;
  onChoose: ChooseWinner;
  side: "left" | "right";
  // Receives the Choose button so the board can originate confetti there (and the
  // keyboard handler can reuse it). See chooseWinner.
  ref?: (element: HTMLButtonElement) => void;
}) {
  const showName = useStore($showName);
  let chooseButton: HTMLButtonElement | undefined;
  const arrow = () => (props.side === "left" ? "←" : "→");

  return (
    <div class="flex min-h-0 flex-col gap-4">
      <Show when={props.player()}>
        {(font) => (
          <>
            <Show when={showName()}>
              <div
                class="flex min-h-9 items-center text-lg font-bold"
                style={getFontStyle(font())}
              >
                {getFontDisplayName(font())}
              </div>
            </Show>
            <div
              role="button"
              tabIndex={0}
              class="relative flex max-h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white p-2 text-left hover:border-blue-500 focus-visible:border-blue-500 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950"
              onClick={() => props.onChoose(font(), chooseButton)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  props.onChoose(font(), chooseButton);
                }
              }}
            >
              <Specimen
                font={font()}
                highlighted={props.highlighted}
                class="overflow-hidden rounded-md"
              />
              {/* Visible affordance mirroring the ←/→ keyboard shortcut. The card
                  itself is the click target, so stop propagation to avoid choosing
                  twice. tabIndex -1: the card already takes focus / Enter / Space. */}
              <button
                ref={(element) => {
                  chooseButton = element;
                  props.ref?.(element);
                }}
                type="button"
                tabIndex={-1}
                class="absolute bottom-6 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg transition-transform hover:bg-blue-500 active:scale-95 active:bg-blue-700 active:shadow-md"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onChoose(font(), chooseButton);
                }}
              >
                Choose or press
                <kbd class="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                  {arrow()}
                </kbd>
              </button>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}

function WinnerView(props: {
  winner: CodingFont;
  highlighted: Highlighted;
  onNewRun: () => void;
  onDownload: () => void;
}) {
  return (
    <div class="col-span-full flex min-h-0 flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="text-sm tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Winner
          </div>
          <a
            href={getFontPath(props.winner.family)}
            style={getFontStyle(props.winner)}
            class="text-3xl font-bold hover:underline"
          >
            {getFontDisplayName(props.winner)}
          </a>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            onClick={props.onNewRun}
          >
            <span class="icon-[lucide--rotate-ccw] h-4 w-4" />
            New Run
          </button>
          <button
            type="button"
            class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            onClick={props.onDownload}
          >
            <span class="icon-[lucide--download] h-4 w-4" />
            Download SVG
          </button>
        </div>
      </div>
      <Specimen
        font={props.winner}
        highlighted={props.highlighted}
        class="min-h-0 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700"
      />
    </div>
  );
}

/**
 * Owns the tournament's reactive state and actions. Returned accessors/actions are
 * consumed by the board component; keeping them out of the component body flattens
 * it to refs + onMount wiring + JSX. Must be called during component setup so the
 * createSignal/createMemo/useStore calls run under a reactive owner.
 */
function createTournamentBoard(): TournamentBoardController {
  const [game, setGame] = createSignal<TournamentGame>();
  const [currentBracket, setCurrentBracket] = createSignal<TournamentResult>();
  const [totalPlayableRounds, setTotalPlayableRounds] = createSignal(0);

  const selectedFonts = useStore($selectedFonts);
  const eliminationMode = useStore($eliminationMode);

  const configuredPlayableRounds = () =>
    getTotalPlayableRoundCount(selectedFonts().length, eliminationMode());
  const progress = createMemo(() =>
    getTournamentProgress(
      game(),
      currentBracket(),
      totalPlayableRounds() || configuredPlayableRounds(),
    ),
  );
  const progressLabel = () =>
    currentBracket()?.winner || !progress()
      ? ""
      : `Round ${progress()!.currentRound}/${progress()!.totalRounds} Match ${
          progress()!.currentMatch
        }/${progress()!.totalMatches}`;
  const currentPlayers = () =>
    "players" in (currentBracket() ?? {})
      ? (currentBracket() as TournamentMatch).players
      : [];
  const leftPlayer = () => currentPlayers()[0];
  const rightPlayer = () => currentPlayers()[1];
  const champion = () => currentBracket()?.winner ?? undefined;

  function startGame(closeSidebar = false) {
    if (!$canStartTournament.get()) return;
    const fonts = $selectedFonts.get();
    const mode = $eliminationMode.get();
    $savedTournamentResult.set(null);
    setTotalPlayableRounds(getTotalPlayableRoundCount(fonts.length, mode));
    const nextGame = createGame(fonts, { eliminationMode: mode });
    setGame(nextGame);
    setCurrentBracket(nextGame.startGame());
    if (closeSidebar) window.dispatchEvent(new CustomEvent("app:menu-close"));
  }

  const chooseWinner: ChooseWinner = (font, origin) => {
    const activeGame = game();
    if (!activeGame) return;
    setCurrentBracket(activeGame.setWinner(font));
    setGame({ ...activeGame });

    if (activeGame.champion) {
      const result = {
        version: 1 as const,
        completedAt: new Date().toISOString(),
        game: activeGame,
        currentBracket: { winner: activeGame.champion },
        totalPlayableRounds: totalPlayableRounds(),
      };
      setCurrentBracket(result.currentBracket);
      $savedTournamentResult.set(result);
      createConfetti("big");
    } else if (origin) {
      const rect = origin.getBoundingClientRect();
      createConfetti("small", {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      });
    }
  };

  async function downloadSvg() {
    const activeGame = game();
    const activeChampion = champion();
    if (!activeGame?.rounds.length || !activeChampion) return;

    await document.fonts?.ready;

    const svg = createTournamentSvg(activeGame, activeChampion, getFontSize());
    if (!svg) return;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${createTournamentSvgFileName(activeChampion)}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Resume a previously completed tournament from storage. Returns false if none. */
  function restoreSaved() {
    const saved = $savedTournamentResult.get();
    if (!saved) return false;
    setGame(saved.game);
    setCurrentBracket(saved.currentBracket);
    setTotalPlayableRounds(saved.totalPlayableRounds ?? 0);
    return true;
  }

  return {
    progressLabel,
    currentPlayers,
    leftPlayer,
    rightPlayer,
    champion,
    startGame,
    chooseWinner,
    downloadSvg,
    restoreSaved,
  };
}

/**
 * The board's mount-time behavior: reset, resume-or-start, and the window listeners
 * (←/→ to pick a winner, the sidebar's start event). Called from within onMount, so
 * its onCleanup binds to that owner. `getButtons` reads the live Choose-button refs
 * so the keyboard handler always sees the current elements (and confetti originates
 * at the button, matching a mouse click).
 */
function runBoardLifecycle(
  board: TournamentBoardController,
  getButtons: () => { left?: HTMLButtonElement; right?: HTMLButtonElement },
) {
  if (!board.restoreSaved()) board.startGame();

  const handleKeydown = (event: KeyboardEvent) => {
    const players = board.currentPlayers();
    if (players.length < 2) return;
    const { left, right } = getButtons();
    if (event.key === "ArrowLeft") board.chooseWinner(players[0], left);
    if (event.key === "ArrowRight") board.chooseWinner(players[1], right);
  };
  const handleStart = () => board.startGame(true);

  window.addEventListener("keydown", handleKeydown);
  window.addEventListener(TOURNAMENT_START_EVENT, handleStart);
  onCleanup(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener(TOURNAMENT_START_EVENT, handleStart);
  });
}

export default function TournamentBoard(props: TournamentBoardProps) {
  let leftButton: HTMLButtonElement | undefined;
  let rightButton: HTMLButtonElement | undefined;

  const board = createTournamentBoard();
  const viewMode = useStore($viewMode);
  const showName = useStore($showName);
  onMount(() =>
    runBoardLifecycle(board, () => ({ left: leftButton, right: rightButton })),
  );

  return (
    <div class="flex h-full flex-col">
      <ControlsBar
        champion={board.champion}
        progressLabel={board.progressLabel}
      />
      <Show
        when={!board.champion() && viewMode() === "unified"}
        fallback={
          <div
            class={`grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 ${
              board.champion()
                ? "grid-rows-1 md:grid-cols-2"
                : "grid-rows-2 md:grid-cols-2 md:grid-rows-1"
            }`}
          >
            <Show
              when={board.champion()}
              fallback={
                <>
                  <PlayerCard
                    player={board.leftPlayer}
                    highlighted={props.highlighted}
                    onChoose={board.chooseWinner}
                    side="left"
                    ref={(element) => (leftButton = element)}
                  />
                  <PlayerCard
                    player={board.rightPlayer}
                    highlighted={props.highlighted}
                    onChoose={board.chooseWinner}
                    side="right"
                    ref={(element) => (rightButton = element)}
                  />
                </>
              }
            >
              {(winner) => (
                <WinnerView
                  winner={winner()}
                  highlighted={props.highlighted}
                  onNewRun={() => board.startGame(false)}
                  onDownload={board.downloadSvg}
                />
              )}
            </Show>
          </div>
        }
      >
        <Show when={board.leftPlayer() && board.rightPlayer()}>
          <div class="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
              <UnifiedSpecimen
                fontA={board.leftPlayer()!}
                fontB={board.rightPlayer()!}
                highlightedLines={props.highlightedLines}
                class="overflow-hidden rounded-md"
              />
            </div>
            <div class="flex shrink-0 items-center justify-center gap-4">
              <button
                ref={(element) => (leftButton = element)}
                type="button"
                class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg transition-transform hover:bg-blue-500 active:scale-95 active:bg-blue-700 active:shadow-md"
                onClick={(event) =>
                  board.chooseWinner(board.leftPlayer()!, event.currentTarget)
                }
              >
                <kbd class="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                  ←
                </kbd>
                Choose{" "}
                {showName() ? getFontDisplayName(board.leftPlayer()!) : "A"}
              </button>
              <button
                ref={(element) => (rightButton = element)}
                type="button"
                class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg transition-transform hover:bg-blue-500 active:scale-95 active:bg-blue-700 active:shadow-md"
                onClick={(event) =>
                  board.chooseWinner(board.rightPlayer()!, event.currentTarget)
                }
              >
                Choose{" "}
                {showName() ? getFontDisplayName(board.rightPlayer()!) : "B"}
                <kbd class="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                  →
                </kbd>
              </button>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
