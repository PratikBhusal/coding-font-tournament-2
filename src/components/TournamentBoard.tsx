import { type Accessor, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { useStore } from '@nanostores/solid';
import type { CodingFont } from '../lib/codingFonts';
import { getCssFontFamily, getFontDisplayName, getFontFeatures, getFontStyle } from '../lib/fontFeatures';
import {
  createConfetti,
  createGame,
  TournamentEliminationMode,
  type TournamentGame,
  type TournamentMatch,
  type TournamentResult
} from '../lib/game';
import { getFontPath } from '../lib/routes';
import { getFontSize } from '../lib/appearance';
import { sampleLanguages, type SampleLanguage } from '../lib/sampleCode';
import { createTournamentSvg, createTournamentSvgFileName } from '../lib/tournamentSvg';
import {
  $canStartTournament,
  $eliminationMode,
  $savedTournamentResult,
  $selectedFonts,
  $showName,
  TOURNAMENT_START_EVENT
} from '../lib/tournamentStore';

type Highlighted = Record<SampleLanguage, string>;

type TournamentBoardProps = {
  highlighted: Highlighted;
};

type ProgressMatch = Pick<TournamentMatch, 'players' | 'winner'>;

type ChooseWinner = (font: CodingFont, card?: HTMLDivElement) => void;

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
  const featBoth = getFontFeatures(font, true, true) || 'normal';
  const featLig = getFontFeatures(font, false, true) || 'normal';
  const featOt = getFontFeatures(font, true, false) || 'normal';
  return `font-family: ${getCssFontFamily(font)}; --feat-both: ${featBoth}; --feat-lig: ${featLig}; --feat-ot: ${featOt}`;
}

function getTotalPlayableMatchCount(playerCount: number, eliminationMode: TournamentEliminationMode) {
  if (playerCount < 2) return 0;
  return eliminationMode === TournamentEliminationMode.Double ? (playerCount - 1) * 2 : playerCount - 1;
}

function isPlayableMatch(match: ProgressMatch | null | undefined) {
  return (match?.players?.length ?? 0) >= 2;
}

function getTournamentProgress(
  activeGame: TournamentGame | undefined,
  activeBracket: TournamentResult | undefined,
  activeTotalPlayableMatches: number,
  fallbackTotalPlayableMatches: number
) {
  const totalMatches = activeGame ? activeTotalPlayableMatches : fallbackTotalPlayableMatches;
  if (!totalMatches) return null;
  const completedMatches = activeGame
    ? activeGame.rounds.flat().filter((match) => isPlayableMatch(match) && match.winner).length
    : 0;
  const hasChampion = Boolean(activeBracket?.winner);
  return {
    currentMatch: hasChampion ? totalMatches : Math.min(completedMatches + 1, totalMatches),
    completedMatches,
    totalMatches
  };
}

function Specimen(props: { font: CodingFont; highlighted: Highlighted; class?: string }) {
  return (
    <div class={`code-specimen flex min-h-0 max-h-full flex-col overflow-hidden ${props.class ?? ''}`} style={specimenStyle(props.font)}>
      <For each={sampleLanguages}>
        {(language) => <div class="code-lang" data-lang={language.id} innerHTML={props.highlighted[language.id]} />}
      </For>
    </div>
  );
}

function ControlsBar(props: { champion: Accessor<CodingFont | undefined>; progressLabel: Accessor<string> }) {
  const showName = useStore($showName);
  return (
    <div class="flex items-center gap-4 border-b border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
      <Show when={!props.champion()}>
        <label class="flex items-center gap-2">
          <input class="h-4 w-4 accent-blue-600" type="checkbox" checked={showName()} onInput={(event) => $showName.set(event.currentTarget.checked)} />
          <span>Show Name</span>
        </label>
      </Show>
      <Show when={props.progressLabel()}>
        <span class="flex items-center" data-testid="tournament-progress">{props.progressLabel()}</span>
      </Show>
    </div>
  );
}

function PlayerCard(props: {
  player: Accessor<CodingFont | undefined>;
  highlighted: Highlighted;
  onChoose: ChooseWinner;
  ref?: (element: HTMLDivElement) => void;
}) {
  const showName = useStore($showName);
  let card: HTMLDivElement | undefined;

  return (
    <div class="flex min-h-0 flex-col gap-4">
      <Show when={props.player()}>
        {(font) => (
          <>
            <Show when={showName()}>
              <div class="flex min-h-9 items-center text-lg font-bold" style={getFontStyle(font())}>{getFontDisplayName(font())}</div>
            </Show>
            <div
              ref={(element) => {
                card = element;
                props.ref?.(element);
              }}
              role="button"
              tabIndex={0}
              class="flex max-h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white p-2 text-left hover:border-blue-500 focus-visible:border-blue-500 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950"
              onClick={() => props.onChoose(font(), card)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  props.onChoose(font(), card);
                }
              }}
            >
              <Specimen font={font()} highlighted={props.highlighted} class="overflow-hidden rounded-md" />
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
          <div class="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Winner</div>
          <a href={getFontPath(props.winner.family)} style={getFontStyle(props.winner)} class="text-3xl font-bold hover:underline">{getFontDisplayName(props.winner)}</a>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800" onClick={props.onNewRun}>
            <span class="icon-[lucide--rotate-ccw] h-4 w-4" />
            New Run
          </button>
          <button type="button" class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800" onClick={props.onDownload}>
            <span class="icon-[lucide--download] h-4 w-4" />
            Download SVG
          </button>
        </div>
      </div>
      <Specimen font={props.winner} highlighted={props.highlighted} class="min-h-0 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700" />
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
  const [totalPlayableMatches, setTotalPlayableMatches] = createSignal(0);

  const selectedFonts = useStore($selectedFonts);
  const eliminationMode = useStore($eliminationMode);

  const configuredPlayableMatches = () =>
    getTotalPlayableMatchCount(selectedFonts().length, eliminationMode());
  const progress = createMemo(() =>
    getTournamentProgress(game(), currentBracket(), totalPlayableMatches(), configuredPlayableMatches())
  );
  const progressLabel = () =>
    currentBracket()?.winner || !progress() ? '' : `Match ${progress()!.currentMatch}/${progress()!.totalMatches}`;
  const currentPlayers = () => ('players' in (currentBracket() ?? {}) ? (currentBracket() as TournamentMatch).players : []);
  const leftPlayer = () => currentPlayers()[0];
  const rightPlayer = () => currentPlayers()[1];
  const champion = () => currentBracket()?.winner;

  function startGame(closeSidebar = false) {
    if (!$canStartTournament.get()) return;
    const fonts = $selectedFonts.get();
    const mode = $eliminationMode.get();
    $savedTournamentResult.set(null);
    setTotalPlayableMatches(getTotalPlayableMatchCount(fonts.length, mode));
    const nextGame = createGame(fonts, { eliminationMode: mode });
    setGame(nextGame);
    setCurrentBracket(nextGame.startGame());
    if (closeSidebar) window.dispatchEvent(new CustomEvent('app:menu-close'));
  }

  const chooseWinner: ChooseWinner = (font, card) => {
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
        totalPlayableMatches: totalPlayableMatches()
      };
      setCurrentBracket(result.currentBracket);
      $savedTournamentResult.set(result);
      $showName.set(true);
      createConfetti('big');
    } else if (card) {
      const rect = card.getBoundingClientRect();
      createConfetti('small', {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
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

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
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
    setTotalPlayableMatches(saved.totalPlayableMatches);
    $showName.set(true);
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
    restoreSaved
  };
}

/**
 * The board's mount-time behavior: reset, resume-or-start, and the window listeners
 * (←/→ to pick a winner, the sidebar's start event). Called from within onMount, so
 * its onCleanup binds to that owner. `getCards` reads the live card refs so the
 * keyboard handler always sees the current elements.
 */
function runBoardLifecycle(
  board: TournamentBoardController,
  getCards: () => { left?: HTMLDivElement; right?: HTMLDivElement }
) {
  $showName.set(false);
  if (!board.restoreSaved()) board.startGame();

  const handleKeydown = (event: KeyboardEvent) => {
    const players = board.currentPlayers();
    if (players.length < 2) return;
    const { left, right } = getCards();
    if (event.key === 'ArrowLeft') board.chooseWinner(players[0], left);
    if (event.key === 'ArrowRight') board.chooseWinner(players[1], right);
  };
  const handleStart = () => board.startGame(true);

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener(TOURNAMENT_START_EVENT, handleStart);
  onCleanup(() => {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener(TOURNAMENT_START_EVENT, handleStart);
  });
}

export default function TournamentBoard(props: TournamentBoardProps) {
  let leftCard: HTMLDivElement | undefined;
  let rightCard: HTMLDivElement | undefined;

  const board = createTournamentBoard();
  onMount(() => runBoardLifecycle(board, () => ({ left: leftCard, right: rightCard })));

  return (
    <div class="flex h-full flex-col">
      <ControlsBar champion={board.champion} progressLabel={board.progressLabel} />
      <div
        class={`grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 ${
          board.champion() ? 'grid-rows-1 md:grid-cols-2' : 'grid-rows-2 md:grid-cols-2 md:grid-rows-1'
        }`}
      >
        <Show
          when={board.champion()}
          fallback={
            <>
              <PlayerCard player={board.leftPlayer} highlighted={props.highlighted} onChoose={board.chooseWinner} ref={(element) => (leftCard = element)} />
              <PlayerCard player={board.rightPlayer} highlighted={props.highlighted} onChoose={board.chooseWinner} ref={(element) => (rightCard = element)} />
            </>
          }
        >
          {(winner) => (
            <WinnerView winner={winner()} highlighted={props.highlighted} onNewRun={() => board.startGame(false)} onDownload={board.downloadSvg} />
          )}
        </Show>
      </div>
    </div>
  );
}
