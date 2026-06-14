import {
  type Accessor,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useStore } from "../lib/useStore";
import type { CodingFont } from "../lib/codingFonts";
import {
  createConfetti,
  createGame,
  TournamentEliminationMode,
  type TournamentGame,
  type TournamentMatch,
  type TournamentResult,
} from "../lib/game";
import { getFontSize } from "../lib/appearance";
import type { SampleLanguage } from "../lib/sampleCode";
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
  $viewMode,
  TOURNAMENT_START_EVENT,
} from "../lib/tournamentStore";
import { ChampionView } from "./ChampionView";
import { ControlsBar } from "./ControlsBar";
import type { ChooseWinner } from "./PlayerCard";
import { SplitPlayerCards } from "./SplitPlayerCards";
import type { Highlighted } from "./TournamentSpecimen";
import { UnifiedPlayerCard } from "./UnifiedPlayerCard";

type HighlightedLinesMap = Record<SampleLanguage, HighlightedLines>;

type TournamentBoardProps = {
  highlighted: Highlighted;
  highlightedLines: HighlightedLinesMap;
};

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
        when={!board.champion()}
        fallback={
          <ChampionView
            winner={board.champion()!}
            highlighted={props.highlighted}
            onNewRun={() => board.startGame(false)}
            onDownload={board.downloadSvg}
          />
        }
      >
        {viewMode() === "split" ? (
          <SplitPlayerCards
            leftPlayer={board.leftPlayer}
            rightPlayer={board.rightPlayer}
            highlighted={props.highlighted}
            onChoose={board.chooseWinner}
            onLeftButton={(element) => (leftButton = element)}
            onRightButton={(element) => (rightButton = element)}
          />
        ) : (
          <UnifiedPlayerCard
            leftPlayer={board.leftPlayer}
            rightPlayer={board.rightPlayer}
            highlightedLines={props.highlightedLines}
            onChoose={board.chooseWinner}
            onLeftButton={(element) => (leftButton = element)}
            onRightButton={(element) => (rightButton = element)}
          />
        )}
      </Show>
    </div>
  );
}
