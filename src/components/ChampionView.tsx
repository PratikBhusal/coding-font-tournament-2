import type { CodingFont } from "../lib/codingFonts";
import { getFontDisplayName, getFontStyle } from "../lib/fontFeatures";
import { getFontPath } from "../lib/routes";
import { type Highlighted, Specimen } from "./TournamentSpecimen";

export function ChampionView(props: {
  winner: CodingFont;
  highlighted: Highlighted;
  onNewRun: () => void;
  onDownload: () => void;
}) {
  return (
    <div class="@container min-h-0 flex-1 p-4">
      <div class="grid h-full min-h-0 grid-cols-1 grid-rows-1 gap-4 @3xl:grid-cols-2 @3xl:grid-rows-1">
        <div class="col-span-full flex min-h-0 flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="text-surface-500 dark:text-surface-400 text-sm tracking-wide uppercase">
                Winner
              </div>
              <a
                href={getFontPath(props.winner.family)}
                style={getFontStyle(props.winner)}
                class="text-3xl font-bold hover:underline"
              >
                {getFontDisplayName(props.winner)}
              </a>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                class="border-surface-300 hover:bg-surface-100 dark:border-surface-700 dark:hover:bg-surface-800 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-4"
                onClick={props.onNewRun}
              >
                <span class="icon-[lucide--rotate-ccw] h-4 w-4" />
                New Run
              </button>
              <button
                type="button"
                class="border-surface-300 hover:bg-surface-100 dark:border-surface-700 dark:hover:bg-surface-800 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-4"
                onClick={props.onDownload}
              >
                <span class="icon-[lucide--download] h-4 w-4" />
                Download SVG
              </button>
            </div>
          </div>
          <Specimen
            font={props.winner}
            highlighted={props.highlighted}
            class="border-surface-300 dark:border-surface-700 min-h-0 overflow-hidden rounded-lg border"
          />
        </div>
      </div>
    </div>
  );
}
