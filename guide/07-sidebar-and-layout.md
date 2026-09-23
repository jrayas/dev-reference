# 07 — Sidebar & layout

## What & why

Now the actual app shell: a collapsible sidebar listing topics, a main content area, and responsive behaviour driven by **container queries** rather than media queries — because the sidebar can collapse independent of the browser window's width, and only a container query notices that the content area's *actual* available space just changed.

## Do this

The DOM shape, in `template.html` (this exact nesting matters — see "How it works"):

```html
<div class="app-shell" id="app-shell" data-sidebar="expanded">
  <div class="mobile-bar">
    <button data-open-sheet>☰</button>
    <span>Dev Reference</span>
  </div>
  <div class="shell-body">
    <aside class="sidebar">
      <nav><ul id="sidebar-nav"></ul></nav>
    </aside>
    <main class="main" id="main-scroll">
      <div class="main__inner" id="main-inner"></div>
    </main>
  </div>
</div>
```

The container query setup, in `public/style.css`:

```css
.app-shell {
  container-type: inline-size;
  container-name: shell;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.shell-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }

.mobile-bar { display: none; }
.sidebar { width: var(--sidebar-w); border-right: 1px solid var(--border); transition: width 220ms; }
.app-shell[data-sidebar="collapsed"] .sidebar { width: 3rem; }

@container shell (max-width: 48rem) {
  .sidebar { display: none; }
  .mobile-bar { display: flex; }
}
```

And the render function, in `public/app.js`:

```js
function renderSidebarNav(topics, activeSlug) {
  document.getElementById("sidebar-nav").innerHTML = topics.map((t) => `
    <li><a class="nav-item" href="#topic/${t.slug}" data-slug="${t.slug}"
      ${t.slug === activeSlug ? 'aria-current="page"' : ""}>
      <span>${t.cover}</span><span>${t.topic}</span>
    </a></li>
  `).join("");
}
```

## How it works

**Why `.mobile-bar` is *inside* `.app-shell`, not a sibling before it.** A `@container` query only matches descendants of the element carrying `container-type` — a sibling is invisible to it, full stop, regardless of how close it looks in the layout. Build `.mobile-bar` as a sibling of `.app-shell` (the natural first instinct — "it's a top bar, put it above everything") and the `@container shell (max-width: ...) { .mobile-bar { display: flex; } }` rule above will silently never fire; you'll shrink the window and nothing will happen, with no error to tell you why. This is exactly the bug this project's own build hit — see [`content/lessons-learned.md`](../content/lessons-learned.md) item 2 and [`content/concepts/container-queries.md`](../content/concepts/container-queries.md) for the full story. The fix is structural, not a CSS tweak: `.app-shell` is a flex *column* holding `.mobile-bar` then `.shell-body`, so both are genuine descendants of the queried container.

**Why `container-type: inline-size`, specifically, not just `container-type: size`.** `inline-size` means "only the container's width matters for query matching" (its height can do whatever it wants — here, `100vh`, fixed by the viewport). `size` would query both width *and* height, which we don't want — `.app-shell`'s height is deliberately not something we're breakpointing on.

**Why sidebar collapse is a `data-sidebar` attribute, not a class toggle.** Either works mechanically, but `data-*` attributes read naturally as *state* ("what mode is this element in") versus classes reading as *style* ("what does this look like") — and it makes the CSS selector self-documenting: `.app-shell[data-sidebar="collapsed"]` tells you at a glance this rule depends on application state, not just a stylistic variant.
