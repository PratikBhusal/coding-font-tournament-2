import {
  TournamentEliminationMode,
  type TournamentGame,
  type TournamentMatch,
  type TournamentResult,
} from "./game";

type ProgressMatch = Pick<TournamentMatch, "players" | "winner">;

function createEntryPairs(entryCount: number) {
  const entryPairs: number[] = [];

  for (let index = 0; index < entryCount; index += 2) {
    entryPairs.push(Math.min(2, entryCount - index));
  }

  return entryPairs;
}

function getPreviousPowerOfTwo(value: number) {
  return 2 ** Math.floor(Math.log2(value));
}

function hasPlayableMatch(entryGroups: number[]) {
  return entryGroups.some((entryCount) => entryCount >= 2);
}

function getDoubleEliminationPlayableRoundCount(playerCount: number) {
  const fullRoundSize = getPreviousPowerOfTwo(playerCount);
  const playInMatchCount = playerCount - fullRoundSize;
  const playInPlayerCount = playInMatchCount * 2;
  let playableRounds = 0;
  let winnersPool = 0;
  let losersPool = 0;
  let pendingWinnersEntries =
    playInMatchCount > 0 ? playerCount - playInPlayerCount : 0;
  let pendingLosersDropIns = 0;

  function collectWinnersRound(entryGroups: number[]) {
    winnersPool = entryGroups.length + pendingWinnersEntries;
    pendingWinnersEntries = 0;
    pendingLosersDropIns += entryGroups.filter(
      (entryCount) => entryCount >= 2,
    ).length;
  }

  function collectLosersRound(entryGroups: number[]) {
    losersPool = entryGroups.length;
  }

  function scheduleRound(entryGroups: number[]) {
    if (hasPlayableMatch(entryGroups)) playableRounds++;
  }

  function createLosersRoundEntryGroups() {
    const survivors = losersPool;
    const dropIns = pendingLosersDropIns;

    losersPool = 0;
    pendingLosersDropIns = 0;

    if (survivors === 0) return createEntryPairs(dropIns);
    if (dropIns === 0) return createEntryPairs(survivors);

    const pairedEntryCount = Math.min(survivors, dropIns);
    const survivorByeCount = survivors - pairedEntryCount;
    const dropInByeCount = dropIns - pairedEntryCount;

    return Array(pairedEntryCount)
      .fill(2)
      .concat(Array(survivorByeCount + dropInByeCount).fill(1));
  }

  const initialWinnersEntryCount =
    playInMatchCount > 0 ? playInPlayerCount : playerCount;
  let round = createEntryPairs(initialWinnersEntryCount);
  scheduleRound(round);
  collectWinnersRound(round);

  while (true) {
    if (pendingLosersDropIns > 0) {
      round = createLosersRoundEntryGroups();
      scheduleRound(round);
      collectLosersRound(round);
      continue;
    }

    if (winnersPool === 1 && losersPool === 1) {
      scheduleRound([2]);
      break;
    }

    if (winnersPool > 1) {
      const nextWinnersRoundLoserCount = Math.floor(winnersPool / 2);

      if (losersPool > nextWinnersRoundLoserCount && losersPool > 1) {
        round = createLosersRoundEntryGroups();
        scheduleRound(round);
        collectLosersRound(round);
        continue;
      }

      round = createEntryPairs(winnersPool);
      scheduleRound(round);
      collectWinnersRound(round);
      continue;
    }

    if (losersPool > 1) {
      round = createLosersRoundEntryGroups();
      scheduleRound(round);
      collectLosersRound(round);
      continue;
    }

    break;
  }

  return playableRounds;
}

export function getTotalPlayableRoundCount(
  playerCount: number,
  eliminationMode: TournamentEliminationMode,
) {
  if (playerCount < 2) return 0;
  return eliminationMode === TournamentEliminationMode.Double
    ? getDoubleEliminationPlayableRoundCount(playerCount)
    : Math.ceil(Math.log2(playerCount));
}

function isPlayableMatch(match: ProgressMatch | null | undefined) {
  return (match?.players?.length ?? 0) >= 2;
}

export function getTournamentProgress(
  activeGame: TournamentGame | undefined,
  activeBracket: TournamentResult | undefined,
  activeTotalPlayableRounds: number,
) {
  if (!activeGame || !activeTotalPlayableRounds) return null;

  const currentRound = activeGame.rounds[activeGame.currentRound] ?? [];
  const currentRoundMatches = currentRound.filter(isPlayableMatch);
  if (!currentRoundMatches.length) return null;

  const currentPlayableRound =
    activeGame.rounds
      .slice(0, activeGame.currentRound + 1)
      .filter((round) => round.some(isPlayableMatch)).length || 1;
  const completedMatches = currentRoundMatches.filter(
    (match) => match.winner,
  ).length;
  const hasChampion = Boolean(activeBracket?.winner);
  return {
    currentMatch: hasChampion
      ? currentRoundMatches.length
      : Math.min(completedMatches + 1, currentRoundMatches.length),
    currentRound: hasChampion
      ? activeTotalPlayableRounds
      : currentPlayableRound,
    completedMatches,
    totalMatches: currentRoundMatches.length,
    totalRounds: activeTotalPlayableRounds,
  };
}
