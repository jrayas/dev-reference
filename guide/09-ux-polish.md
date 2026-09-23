# 09 — UX polish

## What & why

A handful of details that separate "functionally correct" from "feels considered": skeleton loaders instead of a blank flash while data loads, empty states instead of a silent blank page when a filter matches nothing, remembered scroll position per topic, and respecting `prefers-reduced-motion` for anyone who's told their OS they don't want animation.

## Do this

**Skeleton, shown before the first render:**

```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-active) 37%, var(--bg-hover) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
```

```js
function renderSkeleton() {
  document.getElementById("main-inner").innerHTML =
    Array.from({ length: 5 }, () => '<div class="skeleton skeleton-row"></div>').join("");
}
```

**Empty state, shown when filters match nothing:**

```js
function renderEmptyState() {
  return `<div class="empty-state">
    <span class="empty-state__emoji">🔍</span>
    <p>No entries match your filters</p>
  </div>`;
}
```

**Scroll position remembered per topic** (a `Map` keyed by slug, saved just before switching away):

```js
const scrollPositions = new Map();

function switchTopic(newSlug) {
  const scrollEl = document.getElementById("main-scroll");
  if (state.activeSlug) scrollPositions.set(state.activeSlug, scrollEl.scrollTop);

  state.activeSlug = newSlug;
  renderTopic(newSlug);

  scrollEl.scrollTop = scrollPositions.get(newSlug) ?? 0;
}
```

**Fade transition between topics**, applied to the container that gets replaced each time:

```css
.main__inner { animation: fade-in 220ms ease; }
@keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .main__inner { animation: none; }
}
```

## How it works

**Why a `Map`, not an object, for scroll positions.** Either works for string keys, but a `Map` makes the intent clearer (it's explicitly a collection being added to and read from by key, not a fixed-shape record) and sidesteps a real footgun: an object key that happens to collide with `Object.prototype` property names (`"constructor"`, `"toString"`) behaves unexpectedly; a `Map` has no such inherited properties to collide with.

**Why the fade-in is re-triggered by re-rendering, not by a class toggle.** `.main__inner`'s content is fully replaced (`innerHTML = ...`) on every topic switch — and a CSS animation on an element restarts automatically whenever that element is freshly inserted into the DOM (which innerHTML-replacement effectively does, since the browser tears down and rebuilds the subtree). No JS is needed to "restart" the animation; correctly triggering it is a side effect of how the rendering already works, not an extra step.

**Why `prefers-reduced-motion` is checked in *every* animation rule, not once globally.** There's no single CSS switch that disables "all" animation — each `@keyframes`-using rule needs its own opt-out (or, as this project actually does it, a single custom property like `--duration: 220ms` that gets overridden to `0ms` under the media query, and every `animation-duration`/`transition-duration` reads from that variable — one override point instead of duplicating the media query per rule).
