# 08 — Search & filters

## What & why

Two related features: a Ctrl+K search modal (word-start matching across name/specialty/task/language, grouped results, keyboard-navigable), and language/task filter chips whose active state lives in the URL hash — so a filtered view is a link you can bookmark or send someone, not just transient UI state that resets on refresh.

## Do this

**The search index and matcher**, in `public/app.js`:

```js
function buildSearchIndex(topics) {
  const rows = [];
  for (const topic of topics) {
    for (const task of topic.tasks) {
      for (const entry of task.entries) {
        rows.push({ topicSlug: topic.slug, topicName: topic.topic, taskName: task.task, entry });
      }
    }
  }
  return rows;
}

function wordStartMatch(haystack, needle) {
  return haystack.toLowerCase().split(/[\s/.\-_]+/).some((word) => word.startsWith(needle));
}

function runSearch(index, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.filter((row) =>
    wordStartMatch(row.entry.name, q) ||
    wordStartMatch(row.entry.specialty, q) ||
    wordStartMatch(row.taskName, q) ||
    wordStartMatch(row.entry.language, q)
  ).slice(0, 40);
}
```

**Opening the modal on Ctrl+K / Cmd+K / "/"**, with Esc to close:

```js
document.addEventListener("keydown", (e) => {
  const typingInField = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    toggleSearch();
  } else if (e.key === "/" && !typingInField) {
    e.preventDefault();
    openSearch();
  } else if (e.key === "Escape") {
    closeSearch();
  }
});
```

**Filters synced to the URL hash** (`#topic/notion?lang=Python,Go&task=Query+the+API`):

```js
function parseHash() {
  const [pathPart, queryPart] = location.hash.replace(/^#/, "").split("?");
  const slug = pathPart.replace(/^topic\//, "") || null;
  const params = new URLSearchParams(queryPart || "");
  const languages = new Set((params.get("lang") || "").split(",").filter(Boolean));
  return { slug, languages };
}

function writeHash(activeSlug, languages) {
  const params = new URLSearchParams();
  if (languages.size) params.set("lang", [...languages].join(","));
  history.replaceState(null, "", `#topic/${activeSlug}?${params}`);
}
```

## How it works

**Why "word-start" matching, not substring matching.** Substring matching (`"react".includes(query)`) would match `"react"` on the query `"act"` — technically correct, practically useless; nobody searching a tool catalogue expects a match to come from the middle of a word. Word-start matching splits each field on whitespace/punctuation (`react-notion-x` → `["react", "notion", "x"]`) and checks whether *any* word starts with the query — so `"not"` correctly matches `react-notion-x` (via the `"notion"` token) but `"act"` doesn't. This is the same matching style VS Code's command palette and most "quick open" UIs use, which is why it feels immediately familiar.

**Why filter state lives in the URL, not just in a JS variable.** The moment state only exists in memory, a page refresh silently discards it and a link you copy-paste to someone shows them the unfiltered view. Routing filters through `location.hash` (rather than, say, `localStorage`) specifically means the state is *shareable* — `localStorage` would persist a filter across refreshes for *you*, but wouldn't transmit it to anyone else via a link, and would leak stale filter state into a different topic's URL. `history.replaceState` (not `pushState`) is deliberate too: toggling a filter chip shouldn't add a new entry to browser back-history for every click — replaceState updates the current URL in place, so the back button still means "go to the previous *page*," not "undo my last filter click."
