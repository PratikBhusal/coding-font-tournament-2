import confetti from 'canvas-confetti';
import type { CodingFont } from './codingFonts';

export enum TournamentEliminationMode {
  Single = 'single',
  Double = 'double'
}

export enum TournamentBracketType {
  Winners = 'winners',
  Losers = 'losers',
  Final = 'final'
}

export type TournamentEntry = {
  player: CodingFont;
  sourceSlot: number | null;
};

export type TournamentMatch = {
  bracket: TournamentBracketType;
  roundIndex: number;
  players: CodingFont[];
  sourceSlots: Array<number | null>;
  winner: CodingFont | null;
  loser: CodingFont | null;
  winnerSlot: number;
};

export type TournamentResult = TournamentMatch | { winner: CodingFont } | null;

export type TournamentGame = {
  eliminationMode: TournamentEliminationMode;
  rounds: TournamentMatch[][];
  currentRound: number;
  finalRound: number | null;
  champion: CodingFont | null;
  pendingByes?: TournamentEntry[];
  winnersPool?: TournamentEntry[];
  losersPool?: TournamentEntry[];
  pendingWinnersEntries?: TournamentEntry[];
  pendingLosersDropIns?: TournamentEntry[];
  winnersRounds?: TournamentMatch[][];
  losersRounds?: TournamentMatch[][];
  finalRounds?: TournamentMatch[][];
  bracketRoundIndexes?: Record<TournamentBracketType, number>;
  startGame: () => TournamentResult;
  setWinner: (selectedPlayer: CodingFont) => TournamentResult | undefined;
  createNextRound: () => boolean | void;
  getNextMatchup: () => TournamentMatch | undefined;
  collectCompletedRound?: () => void;
  createInitialWinnersEntries?: () => TournamentEntry[];
  createLosersRoundEntryGroups?: () => TournamentEntry[][];
  createEntryPairs?: (entries: TournamentEntry[]) => TournamentEntry[][];
  scheduleRound?: (
    bracket: TournamentBracketType,
    entries: TournamentEntry[] | TournamentEntry[][],
    entriesAreGrouped?: boolean
  ) => boolean;
  getPlayerLosses?: (player: CodingFont) => number;
};

export type CreateGameOptions = {
  eliminationMode?: TournamentEliminationMode;
};

export function createConfetti(
  size: 'big' | 'small' = 'big',
  position = { x: 0.5, y: 0.5 }
) {
  const options: confetti.Options = {
    particleCount: 400,
    spread: 200,
    origin: {
      x: position.x,
      y: position.y
    }
  };

  if (size === 'small') {
    options.particleCount = 30;
    options.spread = 200;
    options.startVelocity = 20;
  }

  confetti.create(document.getElementById('canvas') as HTMLCanvasElement | undefined, {
    resize: true,
    useWorker: true
  })(options);
}

export function createGame(
  initialPlayers: CodingFont[],
  options: CreateGameOptions = {}
): TournamentGame {
  const players = [...initialPlayers];
  const eliminationMode =
    options.eliminationMode ?? TournamentEliminationMode.Double;

  function getPreviousPowerOfTwo(value: number) {
    return 2 ** Math.floor(Math.log2(value));
  }

  function shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  shuffleArray(players);

  function createMatch(
    bracket: TournamentBracketType,
    roundIndex: number,
    entries: TournamentEntry[],
    winnerSlot: number
  ): TournamentMatch {
    const matchPlayers = entries.map((entry) => entry.player);
    const match: TournamentMatch = {
      bracket,
      roundIndex,
      players: matchPlayers,
      sourceSlots: entries.map((entry) => entry.sourceSlot),
      winner: null,
      loser: null,
      winnerSlot
    };

    if (matchPlayers.length === 1) {
      match.winner = matchPlayers[0];
    }

    return match;
  }

  function getMatchLoser(match: TournamentMatch) {
    if (!match.winner || match.players.length < 2) {
      return null;
    }

    const winner = match.winner;
    return match.players.find((player) => player.family !== winner.family) ?? null;
  }

  function createSingleEliminationTournament(): TournamentGame {
    const tournament: any = {
      eliminationMode,
      rounds: [],
      currentRound: -1,
      finalRound: null,
      pendingByes: [],
      champion: null,

      startGame: function () {
        let nextMatchup = this.getNextMatchup();

        while (!nextMatchup && !this.champion) {
          this.createNextRound();
          nextMatchup = this.getNextMatchup();
        }

        return nextMatchup ?? (this.champion ? { winner: this.champion } : null);
      },

      setWinner: function (selectedPlayer: CodingFont) {
        const matchup = this.getNextMatchup();

        if (
          matchup &&
          matchup.players.find(
            (player: CodingFont) => player.family === selectedPlayer.family
          )
        ) {
          matchup.winner = selectedPlayer;
          matchup.loser = getMatchLoser(matchup);

          const nextMatchup = this.startGame();
          if (nextMatchup) {
            return nextMatchup;
          }

          this.finalRound = this.currentRound;
          this.champion = selectedPlayer;
          return {
            winner: selectedPlayer
          };
        } else {
          console.error('Invalid winner or no available matchup.');
        }
      },

      createNextRound: function () {
        this.currentRound++;
        let winners: TournamentEntry[];

        if (this.rounds.length > 0) {
          winners = this.rounds[this.currentRound - 1]
            .filter((matchup: TournamentMatch): matchup is TournamentMatch & { winner: CodingFont } => Boolean(matchup.winner))
            .map((matchup: TournamentMatch & { winner: CodingFont }) => ({
              player: matchup.winner,
              sourceSlot: matchup.winnerSlot
            }))
            .concat(this.pendingByes ?? []);
          this.pendingByes = [];
        } else {
          const fullRoundSize = getPreviousPowerOfTwo(players.length);
          const playInMatchCount = players.length - fullRoundSize;
          const playInPlayerCount = playInMatchCount * 2;

          // sourceSlot tracks the post-play-in bracket slot for SVG layout.
          // Play-in opponents share a slot because only the winner enters it.
          winners =
            playInMatchCount > 0
              ? players.slice(0, playInPlayerCount).map((player, index) => ({
                  player,
                  sourceSlot: Math.floor(index / 2)
                }))
              : players.map((player, index) => ({
                  player,
                  sourceSlot: index
                }));
          this.pendingByes =
            playInMatchCount > 0
              ? players.slice(playInPlayerCount).map((player, index) => ({
                  player,
                  sourceSlot: playInMatchCount + index
                }))
              : [];
        }

        this.rounds[this.currentRound] = this.rounds[this.currentRound] || [];

        for (let i = 0; i < winners.length; i += 2) {
          const matchupIndex = this.rounds[this.currentRound].length;
          const entries = winners.slice(i, i + 2);

          this.rounds[this.currentRound].push(
            createMatch(
              TournamentBracketType.Winners,
              this.currentRound,
              entries,
              matchupIndex
            )
          );
        }

        if (
          this.rounds[this.currentRound].length === 1 &&
          this.rounds[this.currentRound][0].winner
        ) {
          this.finalRound = this.currentRound;
          this.champion = this.rounds[this.currentRound][0].winner;
        }
      },

      getNextMatchup: function () {
        const currentRoundMatches = this.rounds[this.currentRound];
        return (
          currentRoundMatches &&
          currentRoundMatches.find((match: TournamentMatch) => !match.winner)
        );
      }
    };
    return tournament;
  }

  function createDoubleEliminationTournament(): TournamentGame {
    const playerLosses = new Map(players.map((player) => [player.family, 0]));

    const tournament: any = {
      eliminationMode,
      rounds: [],
      currentRound: -1,
      finalRound: null,
      champion: null,
      winnersPool: [],
      losersPool: [],
      pendingWinnersEntries: [],
      pendingLosersDropIns: [],
      winnersRounds: [],
      losersRounds: [],
      finalRounds: [],
      bracketRoundIndexes: {
        [TournamentBracketType.Winners]: 0,
        [TournamentBracketType.Losers]: 0,
        [TournamentBracketType.Final]: 0
      },

      startGame: function () {
        let nextMatchup = this.getNextMatchup();

        while (!nextMatchup && !this.champion) {
          const createdRound = this.createNextRound();
          if (!createdRound) {
            break;
          }
          nextMatchup = this.getNextMatchup();
        }

        return nextMatchup ?? (this.champion ? { winner: this.champion } : null);
      },

      setWinner: function (selectedPlayer: CodingFont) {
        const matchup = this.getNextMatchup();

        if (
          matchup &&
          matchup.players.find(
            (player: CodingFont) => player.family === selectedPlayer.family
          )
        ) {
          matchup.winner = selectedPlayer;
          matchup.loser = getMatchLoser(matchup);

          if (matchup.loser) {
            const previousLosses = playerLosses.get(matchup.loser.family) ?? 0;
            playerLosses.set(matchup.loser.family, previousLosses + 1);
          }

          if (matchup.bracket === TournamentBracketType.Final) {
            this.finalRound = this.currentRound;
            this.champion = selectedPlayer;
            return {
              winner: selectedPlayer
            };
          }

          const nextMatchup = this.startGame();
          if (nextMatchup) {
            return nextMatchup;
          }

          return this.champion ? { winner: this.champion } : null;
        } else {
          console.error('Invalid winner or no available matchup.');
        }
      },

      createNextRound: function () {
        this.collectCompletedRound();

        if (this.rounds.length === 0) {
          return this.scheduleRound(
            TournamentBracketType.Winners,
            this.createInitialWinnersEntries()
          );
        }

        if (this.pendingLosersDropIns.length > 0) {
          return this.scheduleRound(
            TournamentBracketType.Losers,
            this.createLosersRoundEntryGroups(),
            true
          );
        }

        if (this.winnersPool.length === 1 && this.losersPool.length === 1) {
          return this.scheduleRound(TournamentBracketType.Final, [
            this.winnersPool[0],
            this.losersPool[0]
          ]);
        }

        if (this.winnersPool.length > 1) {
          const nextWinnersRoundLoserCount = Math.floor(
            this.winnersPool.length / 2
          );

          if (
            this.losersPool.length > nextWinnersRoundLoserCount &&
            this.losersPool.length > 1
          ) {
            return this.scheduleRound(
              TournamentBracketType.Losers,
              this.createLosersRoundEntryGroups(),
              true
            );
          }

          return this.scheduleRound(
            TournamentBracketType.Winners,
            this.winnersPool
          );
        }

        if (this.losersPool.length > 1) {
          return this.scheduleRound(
            TournamentBracketType.Losers,
            this.createLosersRoundEntryGroups(),
            true
          );
        }

        if (this.winnersPool.length === 1 && this.losersPool.length === 0) {
          this.champion = this.winnersPool[0].player;
        }

        return false;
      },

      collectCompletedRound: function () {
        if (this.currentRound < 0) {
          return;
        }

        const round = this.rounds[this.currentRound];
        if (!round?.length || round.some((match: TournamentMatch) => !match.winner)) {
          return;
        }

        const bracket = round[0].bracket;

        if (bracket === TournamentBracketType.Winners) {
          this.winnersPool = round
            .map((match: TournamentMatch & { winner: CodingFont }) => ({
              player: match.winner,
              sourceSlot: match.winnerSlot
            }))
            .concat(this.pendingWinnersEntries);
          this.pendingWinnersEntries = [];
          this.pendingLosersDropIns = this.pendingLosersDropIns.concat(
            round.filter((match: TournamentMatch) => match.loser).map((match: TournamentMatch & { loser: CodingFont }) => ({
              player: match.loser,
              // Dropped winners-bracket players do not have a source match
              // inside the losers bracket, so the SVG should not connect
              // them to a previous losers-round slot.
              sourceSlot: null
            }))
          );
        }

        if (bracket === TournamentBracketType.Losers) {
          this.losersPool = round.map((match: TournamentMatch & { winner: CodingFont }) => ({
            player: match.winner,
            sourceSlot: match.winnerSlot
          }));
        }
      },

      createInitialWinnersEntries: function () {
        const fullRoundSize = getPreviousPowerOfTwo(players.length);
        const playInMatchCount = players.length - fullRoundSize;
        const playInPlayerCount = playInMatchCount * 2;

        if (playInMatchCount === 0) {
          return players.map((player, index) => ({
            player,
            sourceSlot: index
          }));
        }

        this.pendingWinnersEntries = players
          .slice(playInPlayerCount)
          .map((player, index) => ({
            player,
            sourceSlot: playInMatchCount + index
          }));

        return players.slice(0, playInPlayerCount).map((player, index) => ({
          player,
          sourceSlot: Math.floor(index / 2)
        }));
      },

      createLosersRoundEntryGroups: function () {
        const survivors = this.losersPool;
        const dropIns = this.pendingLosersDropIns;

        this.losersPool = [];
        this.pendingLosersDropIns = [];

        if (survivors.length === 0) {
          return this.createEntryPairs(dropIns);
        }

        if (dropIns.length === 0) {
          return this.createEntryPairs(survivors);
        }

        const pairedEntryCount = Math.min(survivors.length, dropIns.length);
        const entryGroups = [];

        for (let index = 0; index < pairedEntryCount; index++) {
          entryGroups.push([survivors[index], dropIns[index]]);
        }

        return entryGroups
          .concat(
            survivors
              .slice(pairedEntryCount)
              .map((survivor: TournamentEntry) => [survivor])
          )
          .concat(dropIns.slice(pairedEntryCount).map((dropIn: TournamentEntry) => [dropIn]));
      },

      createEntryPairs: function (entries: TournamentEntry[]) {
        const entryPairs: TournamentEntry[][] = [];

        for (let i = 0; i < entries.length; i += 2) {
          entryPairs.push(entries.slice(i, i + 2));
        }

        return entryPairs;
      },

      scheduleRound: function (
        bracket: TournamentBracketType,
        entries: TournamentEntry[] | TournamentEntry[][],
        entriesAreGrouped = false
      ) {
        const bracketRoundIndex = this.bracketRoundIndexes[bracket]++;
        const round: TournamentMatch[] = [];
        const entryGroups = entriesAreGrouped
          ? (entries as TournamentEntry[][])
          : this.createEntryPairs(entries as TournamentEntry[]);

        entryGroups.forEach((entryGroup: TournamentEntry[]) => {
          round.push(
            createMatch(
              bracket,
              bracketRoundIndex,
              entryGroup,
              round.length
            )
          );
        });

        this.currentRound++;
        this.rounds[this.currentRound] = round;

        if (bracket === TournamentBracketType.Winners) {
          this.winnersRounds.push(round);
        }

        if (bracket === TournamentBracketType.Losers) {
          this.losersRounds.push(round);
        }

        if (bracket === TournamentBracketType.Final) {
          this.finalRounds.push(round);
        }

        if (round.every((match) => match.winner)) {
          return true;
        }

        return true;
      },

      getNextMatchup: function () {
        const currentRoundMatches = this.rounds[this.currentRound];
        return (
          currentRoundMatches &&
          currentRoundMatches.find((match: TournamentMatch) => !match.winner)
        );
      },

      getPlayerLosses: function (player: CodingFont) {
        return playerLosses.get(player.family) ?? 0;
      }
    };
    return tournament;
  }

  if (eliminationMode === TournamentEliminationMode.Double) {
    return createDoubleEliminationTournament();
  }

  return createSingleEliminationTournament();
}
