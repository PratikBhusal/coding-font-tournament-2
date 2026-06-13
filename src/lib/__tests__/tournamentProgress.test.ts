import { describe, expect, test } from "vitest";
import codingFonts from "../codingFonts";
import {
  createGame,
  TournamentEliminationMode,
  type TournamentGame,
  type TournamentResult,
} from "../game";
import {
  getTotalPlayableRoundCount,
  getTournamentProgress,
} from "../tournamentProgress";

function chooseLeft(game: TournamentGame, active: TournamentResult) {
  if (!active || !("players" in active)) {
    throw new Error("Expected an active match");
  }

  return game.setWinner(active.players[0]) ?? null;
}

describe("tournament progress", () => {
  test("single elimination rounds are log2 of all selected fonts, rounded up", () => {
    expect(
      getTotalPlayableRoundCount(
        codingFonts.length,
        TournamentEliminationMode.Single,
      ),
    ).toBe(Math.ceil(Math.log2(codingFonts.length)));
  });

  test("single elimination rounds are rounded up for one less than all selected fonts", () => {
    const selectedFontCount = codingFonts.length - 1;

    expect(
      getTotalPlayableRoundCount(
        selectedFontCount,
        TournamentEliminationMode.Single,
      ),
    ).toBe(Math.ceil(Math.log2(selectedFontCount)));
  });

  test("does not report playable rounds without enough players", () => {
    expect(
      getTotalPlayableRoundCount(0, TournamentEliminationMode.Single),
    ).toBe(0);
    expect(
      getTotalPlayableRoundCount(1, TournamentEliminationMode.Double),
    ).toBe(0);
  });

  test("resets match count when advancing to a new round", () => {
    const game = createGame(codingFonts.slice(0, 4), {
      eliminationMode: TournamentEliminationMode.Single,
    });
    const totalRounds = getTotalPlayableRoundCount(
      4,
      TournamentEliminationMode.Single,
    );

    let active = game.startGame();
    expect(getTournamentProgress(game, active, totalRounds)).toMatchObject({
      currentRound: 1,
      currentMatch: 1,
      totalMatches: 2,
      totalRounds: 2,
    });

    active = chooseLeft(game, active);
    expect(getTournamentProgress(game, active, totalRounds)).toMatchObject({
      currentRound: 1,
      currentMatch: 2,
      totalMatches: 2,
      totalRounds: 2,
    });

    active = chooseLeft(game, active);
    expect(getTournamentProgress(game, active, totalRounds)).toMatchObject({
      currentRound: 2,
      currentMatch: 1,
      totalMatches: 1,
      totalRounds: 2,
    });
  });
});
