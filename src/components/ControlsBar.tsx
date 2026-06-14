import { type Accessor, Show } from "solid-js";
import type { CodingFont } from "../lib/codingFonts";
import { useStore } from "../lib/useStore";
import { $showName, $viewMode } from "../lib/tournamentStore";

export function ControlsBar(props: {
  champion: Accessor<CodingFont | undefined>;
  progressLabel: Accessor<string>;
}) {
  const showName = useStore($showName);
  const viewMode = useStore($viewMode);
  const segmentClass = (active: boolean) =>
    `px-3 py-1 transition-transform active:scale-95 ${
      active
        ? "bg-primary-600 text-white"
        : "bg-transparent text-surface-700 hover:bg-surface-200 dark:text-surface-200 dark:hover:bg-surface-800"
    }`;

  return (
    <div class="border-surface-300 dark:border-surface-700 flex items-center gap-4 border-b px-4 py-2 text-sm">
      <Show when={!props.champion()}>
        <div class="border-surface-300 dark:border-surface-700 inline-flex overflow-hidden rounded-md border">
          <button
            type="button"
            aria-pressed={viewMode() === "split"}
            class={segmentClass(viewMode() === "split")}
            onClick={() => $viewMode.set("split")}
          >
            Split
          </button>
          <button
            type="button"
            aria-pressed={viewMode() === "unified"}
            class={segmentClass(viewMode() === "unified")}
            onClick={() => $viewMode.set("unified")}
          >
            Unified
          </button>
        </div>
        <label class="flex items-center gap-2">
          <input
            class="accent-primary-600 h-4 w-4"
            type="checkbox"
            checked={showName()}
            onInput={(event) => $showName.set(event.currentTarget.checked)}
          />
          <span>Show Name</span>
        </label>
      </Show>
      <Show when={props.progressLabel()}>
        <span class="flex items-center" data-testid="tournament-progress">
          {props.progressLabel()}
        </span>
      </Show>
    </div>
  );
}
