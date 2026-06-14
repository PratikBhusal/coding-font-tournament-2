import type { Accessor } from "solid-js";
import { Show } from "solid-js";
import type { CodingFont } from "../lib/codingFonts";
import { getFontDisplayName } from "../lib/fontFeatures";
import { $showName } from "../lib/tournamentStore";
import { useStore } from "../lib/useStore";
import type { ChooseWinner } from "./PlayerCard";

function ChooseButtonLabel(props: { side: "A" | "B"; font: CodingFont }) {
  const showName = useStore($showName);
  const label = () => `Choose ${props.side}`;

  return (
    <Show
      when={showName()}
      fallback={<span class="whitespace-nowrap">{label()}</span>}
    >
      <span>{label()}:</span>
      <span class="min-w-0 truncate">{getFontDisplayName(props.font)}</span>
    </Show>
  );
}

export function UnifiedChooseButtons(props: {
  leftPlayer: Accessor<CodingFont | undefined>;
  rightPlayer: Accessor<CodingFont | undefined>;
  onChoose: ChooseWinner;
  onLeftButton: (element: HTMLButtonElement) => void;
  onRightButton: (element: HTMLButtonElement) => void;
}) {
  const showName = useStore($showName);

  return (
    <div
      class={`grid shrink-0 grid-cols-1 gap-4 ${showName() ? "@3xl:grid-cols-2" : "@md:grid-cols-2"}`}
    >
      <button
        ref={props.onLeftButton}
        type="button"
        class="bg-primary-600 hover:bg-primary-500 active:bg-primary-700 flex min-w-0 items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-white shadow-lg transition-transform active:scale-95 active:shadow-md"
        onClick={(event) =>
          props.onChoose(props.leftPlayer()!, event.currentTarget)
        }
      >
        <kbd class="border-surface-700 bg-surface-900 rounded border px-1.5 py-0.5 text-xs text-white">
          ←
        </kbd>
        <ChooseButtonLabel side="A" font={props.leftPlayer()!} />
      </button>
      <button
        ref={props.onRightButton}
        type="button"
        class="bg-primary-600 hover:bg-primary-500 active:bg-primary-700 flex min-w-0 items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-white shadow-lg transition-transform active:scale-95 active:shadow-md"
        onClick={(event) =>
          props.onChoose(props.rightPlayer()!, event.currentTarget)
        }
      >
        <ChooseButtonLabel side="B" font={props.rightPlayer()!} />
        <kbd class="border-surface-700 bg-surface-900 rounded border px-1.5 py-0.5 text-xs text-white">
          →
        </kbd>
      </button>
    </div>
  );
}
