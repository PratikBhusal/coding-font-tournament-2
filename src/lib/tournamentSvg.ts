import { colordx } from "@colordx/core";
import type { CodingFont } from "./codingFonts";
import {
  getCssFontFamily,
  getCssMonospaceFallback,
  getFontDisplayName,
} from "./fontFeatures";
import {
  TournamentEliminationMode,
  type TournamentGame,
  type TournamentMatch,
} from "./game";

type SvgTournamentMatch = TournamentMatch;

enum SvgTournamentSection {
  Winners = "Winners Bracket",
  Losers = "Losers Bracket",
  Final = "Final",
}

type SvgSection = {
  label: SvgTournamentSection;
  rounds: SvgTournamentMatch[][];
};

type SectionLayout = SvgSection & {
  y: number;
  height: number;
  roundCenters: number[][];
  hasChampionColumn: boolean;
};

const firstRoundIndex = 0;
const firstPlayerIndex = 0;
const singlePlayerCount = 1;
const secondPlayerIndex = firstPlayerIndex + singlePlayerCount;
const playersPerBracket = 2;
const midpointDivisor = 2;
const hiddenMeasurementSvgSize = 0;
const fallbackMonospaceGlyphWidthEm = 0.6;

export function createTournamentSvg(
  game: TournamentGame,
  champion: CodingFont,
  fontSize: number,
) {
  if (!game.rounds?.length || !champion) {
    return "";
  }

  if (game.eliminationMode === TournamentEliminationMode.Double) {
    return createDoubleEliminationTournamentSvg(game, champion, fontSize);
  }

  return createSingleEliminationTournamentSvg(game, champion, fontSize);
}

export function createTournamentSvgFileName(champion: CodingFont) {
  return `${champion.family ?? "coding-font"}-tournament`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getSvgFontFamily(font: CodingFont) {
  return escapeXml(getCssFontFamily(font));
}

/**
 * Normalize any CSS color string to a portable `#rrggbb` hex. The palette is
 * authored in `oklch()`, which colordx parses; `mapSrgb()` maps any out-of-sRGB
 * color into gamut (CSS Color 4 chroma-reduction, a no-op for in-gamut colors)
 * so future wide-gamut tokens degrade gracefully, and `toHex()` serializes it —
 * so the exported SVG is self-contained and viewable without OKLCH support. (The
 * canvas `fillStyle` trick can't be used: modern browsers preserve `oklch()` in
 * fillStyle serialization, leaking it into the SVG.) Returns the input unchanged
 * if it can't be parsed.
 */
function toHexColor(color: string) {
  try {
    return colordx(color).mapSrgb().toHex();
  } catch {
    return color;
  }
}

function getStandardThemeColor(themeVariable: string) {
  // The palette lives in standardTheme.css as `:root` custom properties (OKLCH).
  // Resolve the current value, then emit hex so the exported SVG is self-contained
  // and portable to viewers without OKLCH support.
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(themeVariable)
    .trim();
  return toHexColor(value);
}

function createWinnersLoserMatchLabelMap(
  winnersRounds: SvgTournamentMatch[][],
) {
  const loserMatchLabelMap = new Map<string, string>();
  let matchNumber = 1;

  winnersRounds.forEach((round) => {
    round.forEach((match) => {
      if (match.players.length < 2) {
        return;
      }

      if (match.loser) {
        loserMatchLabelMap.set(match.loser.family, String(matchNumber));
      }

      matchNumber++;
    });
  });

  return loserMatchLabelMap;
}

function isPlayableMatch(match: SvgTournamentMatch) {
  return match.players.length >= playersPerBracket;
}

function createMatchProgressLabelMap(rounds: SvgTournamentMatch[][]) {
  const playableRounds = rounds.filter((round) => round.some(isPlayableMatch));
  const totalRounds = playableRounds.length;
  const progressLabels = new Map<SvgTournamentMatch, string>();

  playableRounds.forEach((round, roundIndex) => {
    const playableMatches = round.filter(isPlayableMatch);

    playableMatches.forEach((match, matchIndex) => {
      progressLabels.set(match, `R:${roundIndex + 1} M:${matchIndex + 1}`);
    });
  });

  return progressLabels;
}

function getSvgFontLabel(font: CodingFont, matchLabel?: string) {
  const prefix = matchLabel ? `${matchLabel}: ` : "";

  return `${prefix}${getFontDisplayName(font)}`;
}

function measureSvgTextBounds(
  value: string,
  fontSize: number,
  fontFamilies: string[],
) {
  if (typeof document === "undefined") {
    return {
      left: 0,
      right: value.length * fontSize * fallbackMonospaceGlyphWidthEm,
    };
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.setAttribute("width", String(hiddenMeasurementSvgSize));
  svg.setAttribute("height", String(hiddenMeasurementSvgSize));
  svg.style.position = "absolute";
  svg.style.visibility = "hidden";
  svg.style.overflow = "visible";
  document.body.appendChild(svg);

  try {
    const measurements = fontFamilies.map((fontFamily) => {
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );

      text.setAttribute("x", "0");
      text.setAttribute("y", "0");
      text.setAttribute("font-size", String(fontSize));
      text.setAttribute("font-family", fontFamily);
      text.textContent = value;
      svg.appendChild(text);

      const bounds = text.getBBox();

      text.remove();

      return {
        left: Math.max(0, -bounds.x),
        right: bounds.x + bounds.width,
      };
    });

    return {
      left: Math.max(...measurements.map((measurement) => measurement.left)),
      right: Math.max(...measurements.map((measurement) => measurement.right)),
    };
  } catch {
    return {
      left: 0,
      right: value.length * fontSize * fallbackMonospaceGlyphWidthEm,
    };
  } finally {
    svg.remove();
  }
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return Number.isFinite(value);
}

function createSvgMetrics(fontSize: number) {
  const baseLabelFontSize = 14;
  const scaleLayout = (multiplier: number) => Math.round(fontSize * multiplier);

  return {
    baseLabelFontSize,
    connectorStrokeWidth: scaleLayout(2 / baseLabelFontSize),
    rectRadius: scaleLayout(4 / baseLabelFontSize),
    playerTextFontSize: scaleLayout(13 / baseLabelFontSize),
    fontNameTextInset: scaleLayout(12 / baseLabelFontSize),
    championLabelHeight: scaleLayout(24 / baseLabelFontSize),
    championLabelOffset: scaleLayout(32 / baseLabelFontSize),
    championLabelFontSize: scaleLayout(12 / baseLabelFontSize),
    championNameOffset: scaleLayout(4 / baseLabelFontSize),
    championNameHeight: scaleLayout(36 / baseLabelFontSize),
    championLabelFontWeight: 700,
    playerHeight: scaleLayout(30 / baseLabelFontSize),
    playerGap: scaleLayout(8 / baseLabelFontSize),
    bracketGap: scaleLayout(22 / baseLabelFontSize),
    roundGap: scaleLayout(6),
    sectionGap: scaleLayout(28 / baseLabelFontSize),
    sectionLabelHeight: scaleLayout(24 / baseLabelFontSize),
    labelFontSize: scaleLayout(12 / baseLabelFontSize),
    labelFontWeight: 700,
    matchNumberLabelGap: scaleLayout(4 / baseLabelFontSize),
  };
}

function createSvgColors() {
  return {
    strokeColor: getStandardThemeColor("--color-primary-500"),
    textColor: getStandardThemeColor("--theme-font-color-base"),
    primaryTextColor: getStandardThemeColor("--color-primary-700"),
    surfaceColor: getStandardThemeColor("--color-surface-50"),
    winnerColor: getStandardThemeColor("--color-primary-100"),
    winnerStrokeColor: getStandardThemeColor("--color-primary-600"),
    onPrimaryTextColor: getStandardThemeColor("--on-primary"),
  };
}

function createSingleEliminationTournamentSvg(
  game: TournamentGame,
  champion: CodingFont,
  fontSize: number,
) {
  const rounds = game.rounds;
  const hasTerminalWinnerRound =
    rounds.length > 1 &&
    rounds[rounds.length - 1]?.length === 1 &&
    rounds[rounds.length - 1][0]?.players?.length === 1;
  const visibleRounds = hasTerminalWinnerRound ? rounds.slice(0, -1) : rounds;
  const bracketFonts = Array.from(
    new Map(
      visibleRounds
        .flatMap((round) => round.flatMap((bracket) => bracket.players))
        .concat(champion)
        .map((font) => [font.family, font]),
    ).values(),
  );
  const padding = 0;
  const metrics = createSvgMetrics(fontSize);
  const colors = createSvgColors();
  const matchProgressLabelMap = createMatchProgressLabelMap(visibleRounds);
  const matchProgressLabelMeasurements = Array.from(
    matchProgressLabelMap.values(),
  ).map((label) =>
    measureSvgTextBounds(label, metrics.labelFontSize, [
      getCssMonospaceFallback(),
    ]),
  );
  const fontNameMeasurements = bracketFonts.map((font) =>
    measureSvgTextBounds(getFontDisplayName(font), fontSize, [
      getCssFontFamily(font),
      getCssMonospaceFallback(),
    ]),
  );
  const bracketWidth = Math.ceil(
    Math.max(
      ...fontNameMeasurements.map((measurement) => measurement.right),
      ...matchProgressLabelMeasurements.map((measurement) => measurement.right),
    ) + metrics.fontNameTextInset,
  );
  const championWidth = bracketWidth;
  const bracketHeight =
    metrics.playerHeight * playersPerBracket + metrics.playerGap;
  const bracketStep = bracketHeight + metrics.bracketGap;
  const roundCenters: number[][] = [];

  function getMatchProgressLabelHeight(match: SvgTournamentMatch) {
    return matchProgressLabelMap.has(match)
      ? metrics.labelFontSize + metrics.matchNumberLabelGap
      : 0;
  }

  function getRenderedTopOffset(match: SvgTournamentMatch | undefined) {
    const playerOffset =
      match?.players.length === singlePlayerCount
        ? metrics.playerHeight / midpointDivisor
        : bracketHeight / midpointDivisor;

    return match
      ? playerOffset + getMatchProgressLabelHeight(match)
      : playerOffset;
  }

  function getRenderedBottomOffset(match: SvgTournamentMatch) {
    return match.players.length === singlePlayerCount
      ? metrics.playerHeight / midpointDivisor
      : bracketHeight / midpointDivisor;
  }

  function getRoundDefaultCenter(bracketIndex: number) {
    return (
      padding +
      getRenderedTopOffset(visibleRounds[firstRoundIndex][bracketIndex]) +
      bracketIndex * bracketStep
    );
  }

  function getBracketSourceSlots(
    bracket: SvgTournamentMatch,
    bracketIndex: number,
  ) {
    return (
      bracket.sourceSlots ?? [
        bracketIndex * playersPerBracket,
        bracketIndex * playersPerBracket + secondPlayerIndex,
      ]
    );
  }

  function getAdvancingLineY(
    bracket: SvgTournamentMatch,
    bracketCenter: number,
  ) {
    if (bracket.players.length === singlePlayerCount || !bracket.winner) {
      return bracketCenter;
    }

    const winnerIndex = bracket.players.findIndex(
      (player) => player.family === bracket.winner?.family,
    );

    if (winnerIndex === firstPlayerIndex) {
      return (
        bracketCenter -
        (metrics.playerHeight + metrics.playerGap) / midpointDivisor
      );
    }

    if (winnerIndex === secondPlayerIndex) {
      return (
        bracketCenter +
        (metrics.playerHeight + metrics.playerGap) / midpointDivisor
      );
    }

    return bracketCenter;
  }

  roundCenters[firstRoundIndex] = visibleRounds[firstRoundIndex].map(
    (_, index) => getRoundDefaultCenter(index),
  );

  for (
    let roundIndex = firstRoundIndex + 1;
    roundIndex < visibleRounds.length;
    roundIndex++
  ) {
    roundCenters[roundIndex] = visibleRounds[roundIndex].map(
      (bracket, bracketIndex) => {
        const sourceCenters = getBracketSourceSlots(bracket, bracketIndex).map(
          (sourceSlot) =>
            (isFiniteNumber(sourceSlot)
              ? roundCenters[roundIndex - 1][sourceSlot]
              : undefined) ?? getRoundDefaultCenter(sourceSlot ?? bracketIndex),
        );

        if (sourceCenters.length === 0) {
          return getRoundDefaultCenter(bracketIndex);
        }

        return (
          sourceCenters.reduce((total, center) => total + center, 0) /
          sourceCenters.length
        );
      },
    );
  }

  const finalRoundIndex = visibleRounds.length - 1;
  const championCenter = roundCenters[finalRoundIndex][0];
  const width =
    padding * 2 +
    visibleRounds.length * bracketWidth +
    visibleRounds.length * metrics.roundGap +
    championWidth;
  const bracketBottoms = visibleRounds.flatMap((round, roundIndex) =>
    round.map((bracket, bracketIndex) => {
      const renderedHeight =
        bracket.players.length === singlePlayerCount
          ? metrics.playerHeight
          : bracketHeight;

      return (
        roundCenters[roundIndex][bracketIndex] +
        renderedHeight / midpointDivisor
      );
    }),
  );
  const championBottom = Math.max(
    championCenter - metrics.championLabelOffset + metrics.championLabelHeight,
    championCenter - metrics.championNameOffset + metrics.championNameHeight,
  );
  const height = padding + Math.max(...bracketBottoms, championBottom);
  const defs: string[] = [];
  const output: string[] = [];
  let clipId = 0;

  function getRoundX(roundIndex: number) {
    return padding + roundIndex * (bracketWidth + metrics.roundGap);
  }

  function renderLine(x1: number, y1: number, x2: number, y2: number) {
    output.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.strokeColor}" stroke-width="${metrics.connectorStrokeWidth}" />`,
    );
  }

  function renderPlayer(
    font: CodingFont,
    x: number,
    y: number,
    isWinner: boolean,
  ) {
    const fontFamily = getSvgFontFamily(font);
    const family = escapeXml(getFontDisplayName(font));
    const textClipId = `font-label-${clipId++}`;
    const textY = y + metrics.playerHeight / midpointDivisor;

    defs.push(
      `<clipPath id="${textClipId}"><rect x="${x}" y="${y}" width="${bracketWidth}" height="${metrics.playerHeight}" /></clipPath>`,
    );
    output.push(`<g>
<rect x="${x}" y="${y}" width="${bracketWidth}" height="${metrics.playerHeight}" rx="${metrics.rectRadius}" fill="${isWinner ? colors.winnerColor : colors.surfaceColor}" stroke="${isWinner ? colors.winnerStrokeColor : colors.strokeColor}" />
<text x="${x + metrics.fontNameTextInset}" y="${textY}" dominant-baseline="middle" fill="${isWinner ? colors.primaryTextColor : colors.textColor}" font-size="${metrics.playerTextFontSize}" font-family="${fontFamily}" clip-path="url(#${textClipId})">${family}</text>
</g>`);
  }

  function renderMatchProgressLabel(
    match: SvgTournamentMatch,
    x: number,
    topPlayerY: number,
  ) {
    const matchProgressLabel = matchProgressLabelMap.get(match);

    if (!matchProgressLabel) {
      return;
    }

    output.push(
      `<text x="${x + metrics.fontNameTextInset}" y="${topPlayerY - metrics.matchNumberLabelGap}" fill="${colors.primaryTextColor}" font-size="${metrics.labelFontSize}" font-weight="${metrics.labelFontWeight}" font-family="${getCssMonospaceFallback()}">${escapeXml(matchProgressLabel)}</text>`,
    );
  }

  function renderBracket(
    bracket: SvgTournamentMatch,
    roundIndex: number,
    bracketIndex: number,
  ) {
    const x = getRoundX(roundIndex);
    const center = roundCenters[roundIndex][bracketIndex];
    const players = bracket.players;

    if (players.length === singlePlayerCount) {
      renderPlayer(
        players[firstPlayerIndex],
        x,
        center - metrics.playerHeight / midpointDivisor,
        true,
      );
      return;
    }

    const topPlayerY =
      center - metrics.playerGap / midpointDivisor - metrics.playerHeight;

    renderMatchProgressLabel(bracket, x, topPlayerY);

    players.forEach((font, playerIndex) => {
      const y =
        playerIndex === firstPlayerIndex
          ? topPlayerY
          : center + metrics.playerGap / midpointDivisor;
      renderPlayer(font, x, y, bracket?.winner?.family === font.family);
    });
  }

  visibleRounds.forEach((round, roundIndex) => {
    if (roundIndex === firstRoundIndex) {
      return;
    }

    round.forEach((bracket, bracketIndex) => {
      const previousRoundIndex = roundIndex - 1;
      const previousX = getRoundX(previousRoundIndex) + bracketWidth;
      const targetX = getRoundX(roundIndex);
      const joinX = previousX + metrics.roundGap / midpointDivisor;
      const targetY = roundCenters[roundIndex][bracketIndex];
      const sourceYs = getBracketSourceSlots(bracket, bracketIndex)
        .map((sourceSlot) => {
          if (!isFiniteNumber(sourceSlot)) {
            return null;
          }
          const sourceBracket = visibleRounds[previousRoundIndex][sourceSlot];
          const sourceCenter = roundCenters[previousRoundIndex][sourceSlot];

          if (!sourceBracket || !Number.isFinite(sourceCenter)) {
            return sourceCenter;
          }

          return getAdvancingLineY(sourceBracket, sourceCenter);
        })
        .filter(isFiniteNumber);

      if (sourceYs.length === 0) {
        return;
      }

      if (sourceYs.length === singlePlayerCount) {
        const sourceY = sourceYs[firstPlayerIndex];

        renderLine(previousX, sourceY, joinX, sourceY);
        renderLine(joinX, sourceY, joinX, targetY);
        renderLine(joinX, targetY, targetX, targetY);
        return;
      }

      sourceYs.forEach((sourceY) =>
        renderLine(previousX, sourceY, joinX, sourceY),
      );
      renderLine(
        joinX,
        sourceYs[firstPlayerIndex],
        joinX,
        sourceYs[secondPlayerIndex],
      );
      renderLine(joinX, targetY, targetX, targetY);
    });
  });

  visibleRounds.forEach((round, roundIndex) => {
    round.forEach((bracket, bracketIndex) => {
      renderBracket(bracket, roundIndex, bracketIndex);
    });
  });

  const finalX = getRoundX(finalRoundIndex) + bracketWidth;
  const championX = finalX + metrics.roundGap;
  const championClipId = `font-label-${clipId++}`;
  const championLabelY = championCenter - metrics.championLabelOffset;
  const championLabelTextX = championX + championWidth / midpointDivisor;
  const championLabelTextY =
    championLabelY + metrics.championLabelHeight / midpointDivisor;
  const championNameY = championCenter - metrics.championNameOffset;
  const championTextY =
    championNameY + metrics.championNameHeight / midpointDivisor;

  defs.push(
    `<clipPath id="${championClipId}"><rect x="${championX}" y="${championNameY}" width="${championWidth}" height="${metrics.championNameHeight}" /></clipPath>`,
  );
  output.push(`<g>
<rect x="${championX}" y="${championLabelY}" width="${championWidth}" height="${metrics.championLabelHeight}" rx="${metrics.rectRadius}" fill="${colors.winnerStrokeColor}" />
<text x="${championLabelTextX}" y="${championLabelTextY}" text-anchor="middle" dominant-baseline="middle" fill="${colors.onPrimaryTextColor}" font-size="${metrics.championLabelFontSize}" font-weight="${metrics.championLabelFontWeight}" font-family="${getCssMonospaceFallback()}">Winner</text>
<rect x="${championX}" y="${championNameY}" width="${championWidth}" height="${metrics.championNameHeight}" rx="${metrics.rectRadius}" fill="${colors.winnerColor}" stroke="${colors.winnerStrokeColor}" />
<text x="${championX + metrics.fontNameTextInset}" y="${championTextY}" dominant-baseline="middle" fill="${colors.primaryTextColor}" font-size="${fontSize}" font-family="${getSvgFontFamily(champion)}" clip-path="url(#${championClipId})">${escapeXml(getFontDisplayName(champion))}</text>
</g>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
${defs.join("\n")}
</defs>
${output.join("\n")}
</svg>`;
}

function createDoubleEliminationTournamentSvg(
  game: TournamentGame,
  champion: CodingFont,
  fontSize: number,
) {
  const sections: SvgSection[] = [
    {
      label: SvgTournamentSection.Final,
      rounds: game.finalRounds ?? [],
    },
    {
      label: SvgTournamentSection.Winners,
      rounds: game.winnersRounds ?? [],
    },
    {
      label: SvgTournamentSection.Losers,
      rounds: game.losersRounds ?? [],
    },
  ].filter((section) => section.rounds.length > 0);
  const metrics = createSvgMetrics(fontSize);
  const colors = createSvgColors();
  const padding = 0;
  const winnersLoserMatchLabelMap = createWinnersLoserMatchLabelMap(
    game.winnersRounds ?? [],
  );
  const matchProgressLabelMap = createMatchProgressLabelMap(game.rounds);
  const firstLosersMatchByFontFamily = new Map<string, SvgTournamentMatch>();

  sections
    .find((section) => section.label === SvgTournamentSection.Losers)
    ?.rounds.forEach((round) => {
      round.forEach((match) => {
        if (match.players.length === singlePlayerCount) {
          return;
        }

        match.players.forEach((font) => {
          if (!firstLosersMatchByFontFamily.has(font.family)) {
            firstLosersMatchByFontFamily.set(font.family, match);
          }
        });
      });
    });

  function getMatchLabel(
    sectionLabel: SvgTournamentSection,
    match: SvgTournamentMatch,
    font: CodingFont,
  ) {
    return sectionLabel === SvgTournamentSection.Losers &&
      firstLosersMatchByFontFamily.get(font.family) === match
      ? winnersLoserMatchLabelMap.get(font.family)
      : undefined;
  }

  function getMatchNumberLabel(
    sectionLabel: SvgTournamentSection,
    match: SvgTournamentMatch,
  ) {
    if (sectionLabel !== SvgTournamentSection.Winners || !match.loser) {
      return undefined;
    }

    return winnersLoserMatchLabelMap.get(match.loser.family);
  }

  function getMatchProgressLabel(match: SvgTournamentMatch) {
    return matchProgressLabelMap.get(match);
  }

  function isHiddenMatch(
    sectionLabel: SvgTournamentSection,
    match: SvgTournamentMatch,
  ) {
    return (
      sectionLabel === SvgTournamentSection.Losers &&
      match.players.length === singlePlayerCount
    );
  }

  const measuredFontLabels = sections
    .flatMap((section) =>
      section.rounds.flatMap((round) =>
        round.flatMap((match) =>
          isHiddenMatch(section.label, match)
            ? []
            : match.players.map((font) => ({
                font,
                label: getSvgFontLabel(
                  font,
                  getMatchLabel(section.label, match, font),
                ),
              })),
        ),
      ),
    )
    .concat({
      font: champion,
      label: getFontDisplayName(champion),
    });
  const matchProgressLabelMeasurements = Array.from(
    matchProgressLabelMap.values(),
  ).map((label) =>
    measureSvgTextBounds(label, metrics.labelFontSize, [
      getCssMonospaceFallback(),
    ]),
  );
  const fontNameMeasurements = measuredFontLabels.map(({ font, label }) =>
    measureSvgTextBounds(label, fontSize, [
      getCssFontFamily(font),
      getCssMonospaceFallback(),
    ]),
  );
  const bracketWidth = Math.ceil(
    Math.max(
      ...fontNameMeasurements.map((measurement) => measurement.right),
      ...matchProgressLabelMeasurements.map((measurement) => measurement.right),
    ) + metrics.fontNameTextInset,
  );
  const championWidth = bracketWidth;
  const bracketHeight =
    metrics.playerHeight * playersPerBracket + metrics.playerGap;
  const bracketStep = bracketHeight + metrics.bracketGap;
  const output: string[] = [];
  const defs: string[] = [];
  let clipId = 0;
  let currentY = padding;

  function getSectionDefaultCenter(bracketIndex: number, sectionY: number) {
    return (
      sectionY +
      metrics.sectionLabelHeight +
      bracketHeight / midpointDivisor +
      bracketIndex * bracketStep
    );
  }

  function getMatchProgressLabelHeight(
    sectionLabel: SvgTournamentSection,
    match: SvgTournamentMatch,
  ) {
    if (isHiddenMatch(sectionLabel, match)) {
      return 0;
    }

    return getMatchProgressLabel(match)
      ? metrics.labelFontSize + metrics.matchNumberLabelGap
      : 0;
  }

  function getRenderedTopOffset(
    sectionLabel: SvgTournamentSection,
    match: SvgTournamentMatch,
  ) {
    if (isHiddenMatch(sectionLabel, match)) {
      return 0;
    }

    const playerOffset =
      match.players.length === singlePlayerCount
        ? metrics.playerHeight / midpointDivisor
        : bracketHeight / midpointDivisor;

    return playerOffset + getMatchProgressLabelHeight(sectionLabel, match);
  }

  function getRenderedBottomOffset(
    sectionLabel: SvgTournamentSection,
    match: SvgTournamentMatch,
  ) {
    if (isHiddenMatch(sectionLabel, match)) {
      return 0;
    }

    return match.players.length === singlePlayerCount
      ? metrics.playerHeight / midpointDivisor
      : bracketHeight / midpointDivisor;
  }

  function getAdvancingLineY(match: SvgTournamentMatch, matchCenter: number) {
    if (match.players.length === singlePlayerCount || !match.winner) {
      return matchCenter;
    }

    const winnerIndex = match.players.findIndex(
      (player) => player.family === match.winner?.family,
    );

    if (winnerIndex === firstPlayerIndex) {
      return (
        matchCenter -
        (metrics.playerHeight + metrics.playerGap) / midpointDivisor
      );
    }

    if (winnerIndex === secondPlayerIndex) {
      return (
        matchCenter +
        (metrics.playerHeight + metrics.playerGap) / midpointDivisor
      );
    }

    return matchCenter;
  }

  function preventRoundOverlaps(
    sectionLabel: SvgTournamentSection,
    round: SvgTournamentMatch[],
    centers: number[],
    minimumTop = Number.NEGATIVE_INFINITY,
  ) {
    let previousBottom = minimumTop - metrics.bracketGap;

    return centers.map((center, bracketIndex) => {
      const match = round[bracketIndex];

      if (isHiddenMatch(sectionLabel, match)) {
        return center;
      }

      const topOffset = getRenderedTopOffset(sectionLabel, match);
      const bottomOffset = getRenderedBottomOffset(sectionLabel, match);
      const minimumCenter = previousBottom + metrics.bracketGap + topOffset;
      const adjustedCenter = Math.max(center, minimumCenter);

      previousBottom = adjustedCenter + bottomOffset;

      return adjustedCenter;
    });
  }

  function getDefaultSourceSlots(bracketIndex: number) {
    return [
      bracketIndex * playersPerBracket,
      bracketIndex * playersPerBracket + secondPlayerIndex,
    ];
  }

  function getFiniteSourceSlots(
    bracket: SvgTournamentMatch,
    bracketIndex: number,
  ) {
    return (bracket.sourceSlots ?? getDefaultSourceSlots(bracketIndex)).filter(
      isFiniteNumber,
    );
  }

  function getLayoutSourceCenters(
    sectionLabel: SvgTournamentSection,
    roundCenters: number[][],
    roundIndex: number,
    bracket: SvgTournamentMatch,
    bracketIndex: number,
    sectionY: number,
  ) {
    const previousRoundCenters = roundCenters[roundIndex - 1];
    const sourceSlots = getFiniteSourceSlots(bracket, bracketIndex);

    return sourceSlots
      .map((sourceSlot) => {
        const previousCenter = previousRoundCenters[sourceSlot];

        if (Number.isFinite(previousCenter)) {
          return previousCenter;
        }

        return sectionLabel === SvgTournamentSection.Losers
          ? null
          : getSectionDefaultCenter(sourceSlot, sectionY);
      })
      .filter(isFiniteNumber);
  }

  const sectionLayouts: SectionLayout[] = sections.map((section) => {
    const roundCenters: number[][] = [];
    const sectionY = currentY;

    roundCenters[firstRoundIndex] = preventRoundOverlaps(
      section.label,
      section.rounds[firstRoundIndex],
      section.rounds[firstRoundIndex].map((_, index) =>
        getSectionDefaultCenter(index, sectionY),
      ),
      sectionY + metrics.sectionLabelHeight,
    );

    for (
      let roundIndex = firstRoundIndex + 1;
      roundIndex < section.rounds.length;
      roundIndex++
    ) {
      const rawRoundCenters = section.rounds[roundIndex].map(
        (bracket, bracketIndex) => {
          const sourceCenters = getLayoutSourceCenters(
            section.label,
            roundCenters,
            roundIndex,
            bracket,
            bracketIndex,
            sectionY,
          );

          if (sourceCenters.length === 0) {
            return getSectionDefaultCenter(bracketIndex, sectionY);
          }

          return (
            sourceCenters.reduce((total, center) => total + center, 0) /
            sourceCenters.length
          );
        },
      );

      roundCenters[roundIndex] = preventRoundOverlaps(
        section.label,
        section.rounds[roundIndex],
        rawRoundCenters,
      );
    }

    const bracketBottoms = section.rounds.flatMap((round, roundIndex) =>
      round.map((bracket, bracketIndex) => {
        return (
          roundCenters[roundIndex][bracketIndex] +
          getRenderedBottomOffset(section.label, bracket)
        );
      }),
    );
    const hasChampionColumn = section.label === SvgTournamentSection.Final;
    const finalCenter = roundCenters[section.rounds.length - 1][0];
    const championBottom = hasChampionColumn
      ? Math.max(
          finalCenter -
            metrics.championLabelOffset +
            metrics.championLabelHeight,
          finalCenter - metrics.championNameOffset + metrics.championNameHeight,
        )
      : 0;
    const height = Math.max(...bracketBottoms, championBottom) - sectionY;
    const layout = {
      ...section,
      y: sectionY,
      height,
      roundCenters,
      hasChampionColumn,
    };

    currentY += height + metrics.sectionGap;

    return layout;
  });
  const width =
    padding * 2 +
    Math.max(
      ...sectionLayouts.map(
        (section) =>
          section.rounds.length * bracketWidth +
          (section.rounds.length - 1) * metrics.roundGap +
          (section.hasChampionColumn ? metrics.roundGap + championWidth : 0),
      ),
    );
  const height = Math.max(padding, currentY - metrics.sectionGap + padding);

  function getRoundX(roundIndex: number) {
    return padding + roundIndex * (bracketWidth + metrics.roundGap);
  }

  function renderLine(x1: number, y1: number, x2: number, y2: number) {
    output.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.strokeColor}" stroke-width="${metrics.connectorStrokeWidth}" />`,
    );
  }

  function renderPlayer(
    font: CodingFont,
    x: number,
    y: number,
    isWinner: boolean,
    matchLabel?: string,
  ) {
    const fontFamily = getSvgFontFamily(font);
    const family = escapeXml(getSvgFontLabel(font, matchLabel));
    const textClipId = `font-label-${clipId++}`;
    const textY = y + metrics.playerHeight / midpointDivisor;

    defs.push(
      `<clipPath id="${textClipId}"><rect x="${x}" y="${y}" width="${bracketWidth}" height="${metrics.playerHeight}" /></clipPath>`,
    );
    output.push(`<g>
<rect x="${x}" y="${y}" width="${bracketWidth}" height="${metrics.playerHeight}" rx="${metrics.rectRadius}" fill="${isWinner ? colors.winnerColor : colors.surfaceColor}" stroke="${isWinner ? colors.winnerStrokeColor : colors.strokeColor}" />
<text x="${x + metrics.fontNameTextInset}" y="${textY}" dominant-baseline="middle" fill="${isWinner ? colors.primaryTextColor : colors.textColor}" font-size="${metrics.playerTextFontSize}" font-family="${fontFamily}" clip-path="url(#${textClipId})">${family}</text>
</g>`);
  }

  function renderMatchProgressLabel(
    match: SvgTournamentMatch,
    x: number,
    topPlayerY: number,
  ) {
    const matchProgressLabel = getMatchProgressLabel(match);

    if (!matchProgressLabel) {
      return;
    }

    output.push(
      `<text x="${x + metrics.fontNameTextInset}" y="${topPlayerY - metrics.matchNumberLabelGap}" fill="${colors.primaryTextColor}" font-size="${metrics.labelFontSize}" font-weight="${metrics.labelFontWeight}" font-family="${getCssMonospaceFallback()}">${escapeXml(matchProgressLabel)}</text>`,
    );
  }

  function renderBracket(
    match: SvgTournamentMatch,
    x: number,
    center: number,
    sectionLabel: SvgTournamentSection,
  ) {
    if (isHiddenMatch(sectionLabel, match)) {
      return;
    }

    if (match.players.length === singlePlayerCount) {
      renderPlayer(
        match.players[firstPlayerIndex],
        x,
        center - metrics.playerHeight / midpointDivisor,
        true,
        getMatchLabel(sectionLabel, match, match.players[firstPlayerIndex]),
      );
      return;
    }

    const topPlayerY =
      center - metrics.playerGap / midpointDivisor - metrics.playerHeight;

    renderMatchProgressLabel(match, x, topPlayerY);

    match.players.forEach((font, playerIndex) => {
      const playerY =
        playerIndex === firstPlayerIndex
          ? topPlayerY
          : center + metrics.playerGap / midpointDivisor;
      renderPlayer(
        font,
        x,
        playerY,
        match?.winner?.family === font.family,
        getMatchLabel(sectionLabel, match, font),
      );
    });
  }

  sectionLayouts.forEach((section) => {
    output.push(`<g>
<rect x="${padding}" y="${section.y}" width="${width}" height="${metrics.sectionLabelHeight}" rx="${metrics.rectRadius}" fill="${colors.winnerStrokeColor}" />
<text x="${padding + metrics.fontNameTextInset}" y="${section.y + metrics.sectionLabelHeight / midpointDivisor}" dominant-baseline="middle" fill="${colors.onPrimaryTextColor}" font-size="${metrics.labelFontSize}" font-weight="${metrics.labelFontWeight}" font-family="${getCssMonospaceFallback()}">${section.label}</text>
</g>`);

    section.rounds.forEach((round, roundIndex) => {
      if (roundIndex === firstRoundIndex) {
        return;
      }

      round.forEach((bracket, bracketIndex) => {
        const previousRoundIndex = roundIndex - 1;
        const previousX = getRoundX(previousRoundIndex) + bracketWidth;
        const targetX = getRoundX(roundIndex);
        const joinX = previousX + metrics.roundGap / midpointDivisor;
        const targetY = section.roundCenters[roundIndex][bracketIndex];
        const sourceYs = getFiniteSourceSlots(bracket, bracketIndex)
          .map((sourceSlot) => {
            const sourceBracket =
              section.rounds[previousRoundIndex][sourceSlot];
            const sourceCenter =
              section.roundCenters[previousRoundIndex][sourceSlot];

            if (!sourceBracket || !Number.isFinite(sourceCenter)) {
              return sourceCenter;
            }

            if (isHiddenMatch(section.label, sourceBracket)) {
              return null;
            }

            return getAdvancingLineY(sourceBracket, sourceCenter);
          })
          .filter(isFiniteNumber);

        if (sourceYs.length === 0) {
          return;
        }

        if (sourceYs.length === singlePlayerCount) {
          const sourceY = sourceYs[firstPlayerIndex];

          renderLine(previousX, sourceY, joinX, sourceY);
          renderLine(joinX, sourceY, joinX, targetY);
          renderLine(joinX, targetY, targetX, targetY);
          return;
        }

        sourceYs.forEach((sourceY) =>
          renderLine(previousX, sourceY, joinX, sourceY),
        );
        renderLine(
          joinX,
          sourceYs[firstPlayerIndex],
          joinX,
          sourceYs[secondPlayerIndex],
        );
        renderLine(joinX, targetY, targetX, targetY);
      });
    });

    section.rounds.forEach((round, roundIndex) => {
      const x = getRoundX(roundIndex);

      round.forEach((match, matchIndex) => {
        renderBracket(
          match,
          x,
          section.roundCenters[roundIndex][matchIndex],
          section.label,
        );
      });
    });

    if (section.hasChampionColumn) {
      const finalRoundIndex = section.rounds.length - 1;
      const finalCenter = section.roundCenters[finalRoundIndex][0];
      const finalX = getRoundX(finalRoundIndex) + bracketWidth;
      const championX = finalX + metrics.roundGap;
      const championClipId = `font-label-${clipId++}`;
      const championLabelY = finalCenter - metrics.championLabelOffset;
      const championLabelTextX = championX + championWidth / midpointDivisor;
      const championLabelTextY =
        championLabelY + metrics.championLabelHeight / midpointDivisor;
      const championNameY = finalCenter - metrics.championNameOffset;
      const championTextY =
        championNameY + metrics.championNameHeight / midpointDivisor;

      defs.push(
        `<clipPath id="${championClipId}"><rect x="${championX}" y="${championNameY}" width="${championWidth}" height="${metrics.championNameHeight}" /></clipPath>`,
      );
      output.push(`<g>
<rect x="${championX}" y="${championLabelY}" width="${championWidth}" height="${metrics.championLabelHeight}" rx="${metrics.rectRadius}" fill="${colors.winnerStrokeColor}" />
<text x="${championLabelTextX}" y="${championLabelTextY}" text-anchor="middle" dominant-baseline="middle" fill="${colors.onPrimaryTextColor}" font-size="${metrics.championLabelFontSize}" font-weight="${metrics.championLabelFontWeight}" font-family="${getCssMonospaceFallback()}">Winner</text>
<rect x="${championX}" y="${championNameY}" width="${championWidth}" height="${metrics.championNameHeight}" rx="${metrics.rectRadius}" fill="${colors.winnerColor}" stroke="${colors.winnerStrokeColor}" />
<text x="${championX + metrics.fontNameTextInset}" y="${championTextY}" dominant-baseline="middle" fill="${colors.primaryTextColor}" font-size="${fontSize}" font-family="${getSvgFontFamily(champion)}" clip-path="url(#${championClipId})">${escapeXml(getFontDisplayName(champion))}</text>
</g>`);
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
${defs.join("\n")}
</defs>
${output.join("\n")}
</svg>`;
}
