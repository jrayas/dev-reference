# Concept: container queries

## What they are

A `@media` query responds to the **viewport's** size. A `@container` query responds to the size of a specific **element** (its "containment context"), regardless of the viewport. You opt an element in with `container-type: inline-size` (and optionally `container-name: <name>`), and then any descendant can write `@container <name> (min-width: ...) { ... }` — the condition is evaluated against that named ancestor's width, not the window's.

## Why this project uses them, not media queries

`prompt.md` asks for breakpoints "container queries, not media queries." The practical reason to prefer them here: the sidebar can be collapsed to an icon rail independent of viewport width (a user choice, via `#sidebar-collapse-btn`), which changes how much width `.main` actually has to work with. A `@media` query watching the *window* width would have no idea the sidebar just gave `.main` an extra 200px — a `@container` query watching `.app-shell`'s actual content width adapts correctly either way, because it measures the real available space, not the viewport.

## The gotcha this project hit

A `@container` query only matches **descendants** of the element carrying `container-type`. A sibling — even one positioned right next to the container in the layout — is invisible to it. This project's mobile top bar was built as a sibling of the queried `.app-shell` and silently never appeared at narrow widths, because the rule had nothing to attach to. See [[lessons-learned]] item 2 for the full story, [[decisions]] for the structural fix (folding the bar into the container as a nested flex row).

**Rule of thumb:** before writing `@container name (...) { .thing { ... } }`, check that `.thing` is actually inside the element with `container-type` — `grep` the HTML for where the container div opens and closes if it's not obvious.

## Where to look in this repo

- `public/style.css`: `.app-shell { container-type: inline-size; container-name: shell; }`, and every `@container shell (...)` rule below it
- `template.html`: the DOM nesting that makes the container query on `.mobile-bar` actually work (`.app-shell > .mobile-bar`, `.app-shell > .shell-body > (.sidebar, .main)`)
