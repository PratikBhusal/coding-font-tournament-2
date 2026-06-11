import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
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

type TournamentBoardProps = {
  highlighted: Record<SampleLanguage, string>;
};

type ProgressMatch = Pick<TournamentMatch, 'players' | 'winner'>;

function specimenStyle(font: CodingFont) {
  const featBoth = getFontFeatures(font, true, true) || 'normal';
  const featLig = getFontFeatures(font, false, true) || 'normal';
  const featOt = getFontFeatures(font, true, false) || 'normal';
  return `font-family: ${getCssFontFamily(font)}; --feat-both: ${featBoth}; --feat-lig: ${featLig}; --feat-ot: ${featOt}`;
}

export default function TournamentBoard(props: TournamentBoardProps) {
  let leftCard: HTMLDivElement | undefined;
  let rightCard: HTMLDivElement | undefined;

  const [game, setGame] = createSignal<TournamentGame>();
  const [currentBracket, setCurrentBracket] = createSignal<TournamentResult>();
  const [totalPlayableMatches, setTotalPlayableMatches] = createSignal(0);

  const showName = useStore($showName);
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

  onMount(() => {
    $showName.set(false);

    const saved = $savedTournamentResult.get();
    if (saved) {
      setGame(saved.game);
      setCurrentBracket(saved.currentBracket);
      setTotalPlayableMatches(saved.totalPlayableMatches);
      $showName.set(true);
    } else {
      startGame();
    }

    const handleKeydown = (event: KeyboardEvent) => {
      const players = currentPlayers();
      if (players.length < 2) return;
      if (event.key === 'ArrowLeft') chooseWinner(players[0], leftCard);
      if (event.key === 'ArrowRight') chooseWinner(players[1], rightCard);
    };
    const handleStart = () => startGame(true);

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener(TOURNAMENT_START_EVENT, handleStart);
    onCleanup(() => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener(TOURNAMENT_START_EVENT, handleStart);
    });
  });

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

  function chooseWinner(font: CodingFont, card?: HTMLDivElement) {
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
  }

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

  function Specimen(specimenProps: { font: CodingFont; class?: string }) {
    return (
      <div class={`code-specimen flex min-h-0 max-h-full flex-col overflow-hidden ${specimenProps.class ?? ''}`} style={specimenStyle(specimenProps.font)}>
        <For each={sampleLanguages}>
          {(language) => (
            <div class="code-lang" data-lang={language.id} innerHTML={props.highlighted[language.id]} />
          )}
        </For>
      </div>
    );
  }

  function renderPlayerCard(player: () => CodingFont | undefined, side: 'left' | 'right') {
    const isLeft = side === 'left';
    const card = () => (isLeft ? leftCard : rightCard);

    return (
      <div class="flex min-h-0 flex-col gap-4">
        <Show when={player()}>
          {(font) => (
            <>
              <Show when={showName()}>
                <div class="flex min-h-9 items-center text-lg font-bold" style={getFontStyle(font())}>{getFontDisplayName(font())}</div>
              </Show>
              <div
                ref={isLeft ? leftCard : rightCard}
                role="button"
                tabIndex={0}
                class="flex max-h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white p-2 text-left hover:border-blue-500 focus-visible:border-blue-500 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950"
                onClick={() => chooseWinner(font(), card())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    chooseWinner(font(), card());
                  }
                }}
              >
                <Specimen font={font()} class="overflow-hidden rounded-md" />
              </div>
            </>
          )}
        </Show>
      </div>
    );
  }

  return (
    <div class="flex h-full flex-col">
      <div class="flex items-center gap-4 border-b border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
        <Show when={!champion()}>
          <label class="flex items-center gap-2">
            <input class="h-4 w-4 accent-blue-600" type="checkbox" checked={showName()} onInput={(event) => $showName.set(event.currentTarget.checked)} />
            <span>Show Name</span>
          </label>
        </Show>
        <Show when={progressLabel()}>
          <span class="flex items-center" data-testid="tournament-progress">{progressLabel()}</span>
        </Show>
      </div>
      <div
        class={`grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 ${
          champion() ? 'grid-rows-1 md:grid-cols-2' : 'grid-rows-2 md:grid-cols-2 md:grid-rows-1'
        }`}
      >
        <Show
          when={champion()}
          fallback={
            <>
              {renderPlayerCard(leftPlayer, 'left')}
              {renderPlayerCard(rightPlayer, 'right')}
            </>
          }
        >
          {(winner) => (
            <div class="col-span-full flex min-h-0 flex-col gap-4">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div class="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Winner</div>
                  <a href={getFontPath(winner().family)} style={getFontStyle(winner())} class="text-3xl font-bold hover:underline">{getFontDisplayName(winner())}</a>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <button class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => startGame(false)}>
                    <span class="icon-[lucide--rotate-ccw] h-4 w-4" />
                    New Run
                  </button>
                  <button
                    type="button"
                    class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    onClick={downloadSvg}
                  >
                    <span class="icon-[lucide--download] h-4 w-4" />
                    Download SVG
                  </button>
                </div>
              </div>
              <Specimen font={winner()} class="min-h-0 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700" />
            </div>
          )}
        </Show>
      </div>
    </div>
  );
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
