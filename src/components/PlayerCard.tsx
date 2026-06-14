import { type Accessor, Show } from "solid-js";
import type { CodingFont } from "../lib/codingFonts";
import { getFontDisplayName, getFontStyle } from "../lib/fontFeatures";
import { $showName } from "../lib/tournamentStore";
import { useStore } from "../lib/useStore";
import { type Highlighted, Specimen } from "./TournamentSpecimen";

export type ChooseWinner = (font: CodingFont, origin?: HTMLElement) => void;

export function PlayerCard(props: {
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
              class="hover:border-primary-500 focus-visible:border-primary-500 relative flex max-h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-lg border-2 border-transparent text-left focus-visible:outline-none"
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
                class="bg-primary-600 hover:bg-primary-500 active:bg-primary-700 absolute bottom-6 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-md px-4 py-2 font-semibold text-white shadow-lg transition-transform active:scale-95 active:shadow-md"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onChoose(font(), chooseButton);
                }}
              >
                Choose or press
                <kbd class="border-surface-700 bg-surface-900 rounded border px-1.5 py-0.5 text-xs text-white">
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
