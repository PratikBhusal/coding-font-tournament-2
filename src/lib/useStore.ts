import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import type { Store, StoreValue } from "nanostores";

// Why this exists instead of @nanostores/solid's useStore. That version has two
// behaviors that break this app, and neither is configurable away:
//
// Reconsile: It pipes every update through Solid's reconcile(value, options),
// which defaults to `key: "id"` — matching array items by an `id` field to diff
// them. Our values are arrays of font objects (no `id`) and arrays of strings,
// so every item keys to `undefined`; reconcile treats them as one entity and
// mis-diffs on shrink (38 -> 12 fonts collapsed to 1). Passing `{ key: null }`
// fixes that, but doesn't fix the hydration issue.
//
// Hydration. It reads the store and subscribes during component *setup*. Under
// client:load, setup is the hydration pass: the server rendered the atom's
// initial value, the client reads a different value from localStorage, and
// Solid won't patch that mismatch during hydration. A returning visitor's saved
// selection would show as the curated default until they interact.
//
// This wrapper sidesteps both: it returns the raw nanostore value (no
// reconcile) via a signal with `equals: false`, and subscribes in onMount —
// after hydration — so the first client value lands as a post-hydration update
// that Solid does patch.
export function useStore<T extends Store>(store: T): Accessor<StoreValue<T>> {
  const [value, setValue] = createSignal(store.get(), { equals: false });
  onMount(() => {
    // subscribe fires synchronously with the current value and mounts computed stores.
    const unbind = store.subscribe((next) => setValue(() => next));
    onCleanup(unbind);
  });
  return value;
}
