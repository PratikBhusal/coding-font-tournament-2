import type { Accessor } from "solid-js";
import type { CodingFont } from "../lib/codingFonts";
import { type ChooseWinner, PlayerCard } from "./PlayerCard";
import type { Highlighted } from "./TournamentSpecimen";

export function SplitPlayerCards(props: {
  leftPlayer: Accessor<CodingFont | undefined>;
  rightPlayer: Accessor<CodingFont | undefined>;
  highlighted: Highlighted;
  onChoose: ChooseWinner;
  onLeftButton: (element: HTMLButtonElement) => void;
  onRightButton: (element: HTMLButtonElement) => void;
}) {
  return (
    <div class="@container min-h-0 flex-1 p-4">
      <div class="grid h-full min-h-0 grid-cols-1 grid-rows-2 gap-4 @3xl:grid-cols-2 @3xl:grid-rows-1">
        <PlayerCard
          player={props.leftPlayer}
          highlighted={props.highlighted}
          onChoose={props.onChoose}
          side="left"
          ref={props.onLeftButton}
        />
        <PlayerCard
          player={props.rightPlayer}
          highlighted={props.highlighted}
          onChoose={props.onChoose}
          side="right"
          ref={props.onRightButton}
        />
      </div>
    </div>
  );
}
