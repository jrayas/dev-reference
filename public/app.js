// Dev Reference client app. Plain ES2022, no bundler, no framework.
"use strict";

/** @typedef {{ name:string, language:string, specialty:string, docs:string, note:string, flags:string[] }} Entry */
/** @typedef {{ task:string, entries:Entry[] }} Task */
/** @typedef {{ topic:string, slug:string, description:string, cover:string, tasks:Task[] }} TopicData */

const IS_TAURI = Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__);
if (IS_TAURI) document.body.classList.add("is-tauri");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  /** @type {TopicData[]} */
  topics: [],
  activeSlug: null,
  filters: { languages: new Set(), tasks: new Set() },
  collapsedTasks: new Set(),
  scrollPositions: new Map(),
};

const scrollRestoreKey = (slug) => `scroll:${slug}`;

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadTopics() {
  if (IS_TAURI) {
    try {
      const invoke = window.__TAURI__?.core?.invoke ?? window.__TAURI__?.invoke;
      const topics = await invoke("list_topics");
      if (Array.isArray(topics) && topics.length) return topics;
    } catch (err) {
      console.warn("Tauri list_topics failed, falling back to bundled data:", err);
    }
  }

  try {
    const res = await fetch("topics/index.json", { cache: "no-store" });
    if (res.ok) {
      const manifest = await res.json();
      const topics = await Promise.all(
        manifest.map((m) => fetch(`topics/${m.slug}.json`).then((r) => r.json())),
      );
      if (topics.length) return topics;
    }
  } catch (err) {
    console.warn("Network topic fetch failed, falling back to inlined seed data:", err);
  }

  const seedEl = document.getElementById("seed-data");
  return seedEl ? JSON.parse(seedEl.textContent) : [];
}

// ---------------------------------------------------------------------------
// URL hash state: #topic/<slug>?lang=TypeScript,Python&task=Query+the+API
// ---------------------------------------------------------------------------
function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  const slug = pathPart.replace(/^topic\//, "") || null;
  const params = new URLSearchParams(queryPart || "");
  const languages = new Set((params.get("lang") || "").split(",").filter(Boolean));
  const tasks = new Set((params.get("task") || "").split(",").filter(Boolean).map(decodeURIComponent));
  return { slug, languages, tasks };
}

function writeHash({ replace = false } = {}) {
  const params = new URLSearchParams();
  if (state.filters.languages.size) params.set("lang", [...state.filters.languages].join(","));
  if (state.filters.tasks.size) params.set("task", [...state.filters.tasks].map(encodeURIComponent).join(","));
  const query = params.toString();
  const hash = `#topic/${state.activeSlug}${query ? `?${query}` : ""}`;
  const url = location.pathname + location.search + hash;
  if (replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------
const FLAG_LABEL = {
  paid: "💰 paid",
  "windows-only": "Windows only",
  "mac-only": "Mac only",
  "linux-only": "Linux only",
  deprecated: "Deprecated",
};

function flagClass(flag) {
  if (flag === "paid") return "badge--flag-paid";
  if (flag === "deprecated") return "badge--flag-deprecated";
  return "badge--flag-platform";
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getActiveTopic() {
  return state.topics.find((t) => t.slug === state.activeSlug) ?? state.topics[0] ?? null;
}

function entryMatchesFilters(entry) {
  const { languages, tasks } = state.filters;
  if (languages.size && !languages.has(entry.language)) return false;
  return true;
}

function taskMatchesFilters(task) {
  const { tasks } = state.filters;
  if (tasks.size && !tasks.has(task.task)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function renderSidebarNav() {
  const nav = document.getElementById("sidebar-nav");
  nav.innerHTML = state.topics
    .map((t) => {
      const count = t.tasks.reduce((n, task) => n + task.entries.length, 0);
      const current = t.slug === state.activeSlug;
      return `<li>
        <a class="nav-item" href="#topic/${t.slug}" data-slug="${t.slug}" ${current ? 'aria-current="page"' : ""}>
          <span class="nav-item__emoji">${t.cover}</span>
          <span class="nav-item__label">${escapeHtml(t.topic)}</span>
          <span class="nav-item__count">${count}</span>
        </a>
      </li>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------
function renderSkeleton() {
  const main = document.getElementById("main-inner");
  main.innerHTML = `
    <div class="skeleton" style="height:4.5rem;width:4.5rem;border-radius:${"0.5rem"};margin-bottom:1rem"></div>
    <div class="skeleton" style="height:1.875rem;width:40%;margin-bottom:0.5rem"></div>
    <div class="skeleton" style="height:1rem;width:60%;margin-bottom:2rem"></div>
    ${Array.from({ length: 5 }, () => '<div class="skeleton skeleton-row"></div>').join("")}
  `;
}

function allLanguages(topic) {
  const set = new Set();
  topic.tasks.forEach((t) => t.entries.forEach((e) => set.add(e.language)));
  return [...set].sort();
}

function renderToolbar(topic) {
  const langs = allLanguages(topic);
  const { languages, tasks } = state.filters;

  const langChips = langs
    .map((l) => `<button class="chip" data-filter-lang="${l}" aria-pressed="${languages.has(l)}">${l}</button>`)
    .join("");
  const taskChips = topic.tasks
    .map(
      (t) =>
        `<button class="chip" data-filter-task="${escapeHtml(t.task)}" aria-pressed="${tasks.has(t.task)}">${escapeHtml(t.task)}</button>`,
    )
    .join("");

  const activeBadges = [
    ...[...languages].map(
      (l) => `<button class="chip chip--removable" data-remove-lang="${l}">${l} &times;</button>`,
    ),
    ...[...tasks].map(
      (t) => `<button class="chip chip--removable" data-remove-task="${escapeHtml(t)}">${escapeHtml(t)} &times;</button>`,
    ),
  ].join("");

  return `
    <div class="toolbar">
      <div class="chip-group" role="group" aria-label="Filter by language">${langChips}</div>
      <div class="chip-group" role="group" aria-label="Filter by task">${taskChips}</div>
      <div class="toolbar__spacer"></div>
      <button class="link-btn" id="collapse-all-btn">Collapse all</button>
      <button class="link-btn" id="expand-all-btn">Expand all</button>
    </div>
    ${activeBadges ? `<div class="chip-group" id="active-filters" style="margin-bottom:1rem">${activeBadges}</div>` : ""}
  `;
}

function renderEntry(entry) {
  const flagBadges = entry.flags
    .map((f) => `<span class="badge ${flagClass(f)}" title="${entry.note ? escapeHtml(entry.note) : ""}">${FLAG_LABEL[f] ?? f}</span>`)
    .join("");
  return `
    <div class="entry" data-entry-name="${escapeHtml(entry.name)}">
      <span class="entry__name">${escapeHtml(entry.name)}</span>
      <span class="badge badge--lang">${entry.language}</span>
      <span class="entry__specialty" title="${escapeHtml(entry.specialty)}">${escapeHtml(entry.specialty)}</span>
      <a class="entry__domain" href="${entry.docs}" target="_blank" rel="noopener noreferrer">${domainOf(entry.docs)}</a>
      <span class="entry__flags">${flagBadges}</span>
    </div>
  `;
}

function renderTask(task) {
  const isOpen = !state.collapsedTasks.has(task.task);
  const visibleEntries = task.entries.filter(entryMatchesFilters);
  if (state.filters.tasks.size && !taskMatchesFilters(task)) return "";
  if (!visibleEntries.length) return "";

  return `
    <section class="task" data-open="${isOpen}" data-task="${escapeHtml(task.task)}">
      <div class="task__header">
        <button class="task__toggle" aria-expanded="${isOpen}">
          <svg class="task__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 2L8 6L3 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="task__title">${escapeHtml(task.task)}</span>
          <span class="task__count">${visibleEntries.length}</span>
        </button>
        <button class="task__copy icon-btn" data-copy-task="${escapeHtml(task.task)}" title="Copy link to this task" aria-label="Copy link to ${escapeHtml(task.task)}">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 10a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2h-1M6 10a2 2 0 01-2-2V4a2 2 0 012-2h4a2 2 0 012 2v1M6 10h4a2 2 0 002-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="task__body">
        ${visibleEntries.map(renderEntry).join("")}
      </div>
    </section>
  `;
}

function renderEmptyNoResults() {
  return `
    <div class="empty-state">
      <span class="empty-state__emoji">🔍</span>
      <p class="empty-state__title">No entries match your filters</p>
      <p>Try removing a filter or clearing them all.</p>
    </div>
  `;
}

function renderTopic(topic) {
  const main = document.getElementById("main-inner");
  document.title = `${topic.topic} — Dev Reference`;

  const tasksHtml = topic.tasks.map(renderTask).join("");
  const hasVisible = topic.tasks.some((t) => {
    if (state.filters.tasks.size && !taskMatchesFilters(t)) return false;
    return t.entries.some(entryMatchesFilters);
  });

  main.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="#">Home</a><span class="breadcrumb__sep">/</span>
      <span>${escapeHtml(topic.topic)}</span>
    </nav>
    <header class="cover">
      <span class="cover__emoji">${topic.cover}</span>
      <h1 class="cover__title">${escapeHtml(topic.topic)}</h1>
      <p class="cover__desc">${escapeHtml(topic.description)}</p>
    </header>
    ${renderToolbar(topic)}
    <div id="task-list">
      ${topic.tasks.length === 0 ? '<div class="empty-state"><span class="empty-state__emoji">\u{1F4ED}</span><p class="empty-state__title">No tasks in this topic yet</p></div>' : hasVisible ? tasksHtml : renderEmptyNoResults()}
    </div>
  `;

  bindTaskEvents();
  bindToolbarEvents(topic);

  const savedScroll = state.scrollPositions.get(scrollRestoreKey(topic.slug));
  document.getElementById("main-scroll").scrollTop = savedScroll ?? 0;
}

function bindTaskEvents() {
  document.querySelectorAll(".task__toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".task");
      const name = section.dataset.task;
      const nowOpen = section.dataset.open !== "true";
      section.dataset.open = String(nowOpen);
      btn.setAttribute("aria-expanded", String(nowOpen));
      if (nowOpen) state.collapsedTasks.delete(name);
      else state.collapsedTasks.add(name);
    });
  });

  document.querySelectorAll("[data-copy-task]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const taskName = btn.dataset.copyTask;
      const params = new URLSearchParams();
      params.set("task", taskName);
      const url = `${location.origin}${location.pathname}#topic/${state.activeSlug}?${params.toString()}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard");
      } catch {
        showToast(url);
      }
    });
  });
}

function bindToolbarEvents(topic) {
  document.querySelectorAll("[data-filter-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.filterLang;
      state.filters.languages.has(lang) ? state.filters.languages.delete(lang) : state.filters.languages.add(lang);
      writeHash({ replace: true });
      renderTopic(topic);
    });
  });
  document.querySelectorAll("[data-filter-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const task = btn.dataset.filterTask;
      state.filters.tasks.has(task) ? state.filters.tasks.delete(task) : state.filters.tasks.add(task);
      writeHash({ replace: true });
      renderTopic(topic);
    });
  });
  document.querySelectorAll("[data-remove-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filters.languages.delete(btn.dataset.removeLang);
      writeHash({ replace: true });
      renderTopic(topic);
    });
  });
  document.querySelectorAll("[data-remove-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filters.tasks.delete(btn.dataset.removeTask);
      writeHash({ replace: true });
      renderTopic(topic);
    });
  });
  document.getElementById("collapse-all-btn")?.addEventListener("click", () => {
    topic.tasks.forEach((t) => state.collapsedTasks.add(t.task));
    renderTopic(topic);
  });
  document.getElementById("expand-all-btn")?.addEventListener("click", () => {
    state.collapsedTasks.clear();
    renderTopic(topic);
  });
}

// ---------------------------------------------------------------------------
// Topic switching
// ---------------------------------------------------------------------------
function switchTopic(slug, { pushHash = true } = {}) {
  const mainScroll = document.getElementById("main-scroll");
  if (state.activeSlug) state.scrollPositions.set(scrollRestoreKey(state.activeSlug), mainScroll.scrollTop);

  const topic = state.topics.find((t) => t.slug === slug) ?? state.topics[0];
  if (!topic) return;

  state.activeSlug = topic.slug;
  state.collapsedTasks.clear();
  renderSidebarNav();
  renderTopic(topic);
  if (pushHash) writeHash({ replace: true });
  closeSheet();
}

// ---------------------------------------------------------------------------
// Search modal
// ---------------------------------------------------------------------------
const search = { activeIndex: 0, results: [] };

function buildSearchIndex() {
  const rows = [];
  for (const topic of state.topics) {
    for (const task of topic.tasks) {
      for (const entry of task.entries) {
        rows.push({ topicSlug: topic.slug, topicName: topic.topic, taskName: task.task, entry });
      }
    }
  }
  return rows;
}
let searchIndex = [];

function wordStartMatch(haystack, needle) {
  return haystack
    .toLowerCase()
    .split(/[\s/.\-_]+/)
    .some((word) => word.startsWith(needle));
}

function highlight(text, needle) {
  if (!needle) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, idx))}<mark>${escapeHtml(text.slice(idx, idx + needle.length))}</mark>${escapeHtml(text.slice(idx + needle.length))}`;
}

function runSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return searchIndex
    .filter(
      (row) =>
        wordStartMatch(row.entry.name, q) ||
        wordStartMatch(row.entry.specialty, q) ||
        wordStartMatch(row.taskName, q) ||
        wordStartMatch(row.entry.language, q),
    )
    .slice(0, 40);
}

function renderSearchResults(query) {
  const container = document.getElementById("search-results");
  search.results = runSearch(query);
  search.activeIndex = 0;

  if (!query.trim()) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state__emoji">⌘</span><p>Search tools, specialties, tasks or languages across every topic.</p></div>`;
    return;
  }
  if (!search.results.length) {
    container.innerHTML = renderEmptyNoResults();
    return;
  }

  const groups = new Map();
  for (const row of search.results) {
    const key = `${row.topicName} → ${row.taskName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let i = -1;
  container.innerHTML = [...groups.entries()]
    .map(
      ([label, rows]) => `
        <div class="search-group">
          <div class="search-group__label">${escapeHtml(label)}</div>
          ${rows
            .map((row) => {
              i++;
              return `<div class="search-result" data-active="${i === search.activeIndex}" data-index="${i}" data-slug="${row.topicSlug}" data-task="${escapeHtml(row.taskName)}">
                <span class="badge badge--lang">${row.entry.language}</span>
                <span>${highlight(row.entry.name, query)}</span>
                <span class="search-result__meta">${escapeHtml(row.entry.specialty)}</span>
              </div>`;
            })
            .join("")}
        </div>`,
    )
    .join("");
}

function openSearch() {
  searchIndex = buildSearchIndex();
  const overlay = document.getElementById("search-overlay");
  overlay.dataset.open = "true";
  const input = document.getElementById("search-input");
  input.value = "";
  renderSearchResults("");
  input.focus();
}

function closeSearch() {
  document.getElementById("search-overlay").dataset.open = "false";
}

function activateSearchResult(index) {
  const row = search.results[index];
  if (!row) return;
  closeSearch();
  switchTopic(row.topicSlug);
  state.filters.tasks = new Set([row.taskName]);
  state.collapsedTasks.clear();
  writeHash({ replace: true });
  renderTopic(getActiveTopic());
}

function initSearch() {
  const overlay = document.getElementById("search-overlay");
  const input = document.getElementById("search-input");

  document.querySelectorAll("[data-open-search]").forEach((el) => el.addEventListener("click", openSearch));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSearch();
  });

  input.addEventListener("input", () => renderSearchResults(input.value));

  document.addEventListener("keydown", (e) => {
    const isOpen = overlay.dataset.open === "true";
    const typingInField = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      isOpen ? closeSearch() : openSearch();
      return;
    }
    if (e.key === "/" && !typingInField && !isOpen) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      search.activeIndex = Math.min(search.activeIndex + 1, search.results.length - 1);
      updateActiveResult();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      search.activeIndex = Math.max(search.activeIndex - 1, 0);
      updateActiveResult();
    } else if (e.key === "Enter") {
      e.preventDefault();
      activateSearchResult(search.activeIndex);
    } else if (e.key === "Tab") {
      trapFocus(e, document.getElementById("search-modal"));
    }
  });

  document.getElementById("search-results").addEventListener("click", (e) => {
    const row = e.target.closest(".search-result");
    if (row) activateSearchResult(Number(row.dataset.index));
  });
}

function updateActiveResult() {
  document.querySelectorAll(".search-result").forEach((el) => {
    const active = Number(el.dataset.index) === search.activeIndex;
    el.dataset.active = String(active);
    if (active) el.scrollIntoView({ block: "nearest" });
  });
}

function trapFocus(e, container) {
  const focusables = container.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// ---------------------------------------------------------------------------
// Mobile bottom sheet
// ---------------------------------------------------------------------------
function openSheet() {
  renderSidebarNav();
  document.getElementById("sheet-nav").innerHTML = document.getElementById("sidebar-nav").innerHTML;
  document.getElementById("sheet-overlay").dataset.open = "true";
}
function closeSheet() {
  document.getElementById("sheet-overlay").dataset.open = "false";
}

function initSheet() {
  document.querySelectorAll("[data-open-sheet]").forEach((el) => el.addEventListener("click", openSheet));
  const overlay = document.getElementById("sheet-overlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSheet();
  });
  document.getElementById("sheet-nav").addEventListener("click", (e) => {
    const a = e.target.closest("[data-slug]");
    if (a) {
      e.preventDefault();
      switchTopic(a.dataset.slug);
    }
  });

  let startY = null;
  const sheet = document.getElementById("bottom-sheet");
  sheet.addEventListener("touchstart", (e) => (startY = e.touches[0].clientY));
  sheet.addEventListener("touchmove", (e) => {
    if (startY === null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 80) closeSheet();
  });
}

// ---------------------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------------------
function initTheme() {
  const stored = safeGet("theme");
  if (stored) document.documentElement.dataset.theme = stored;
  updateThemeButton();

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || systemTheme();
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    safeSet("theme", next);
    updateThemeButton();
  });
}
function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function updateThemeButton() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const current = document.documentElement.dataset.theme || systemTheme();
  btn.setAttribute("aria-pressed", String(current === "dark"));
  btn.setAttribute("aria-label", current === "dark" ? "Switch to light theme" : "Switch to dark theme");
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore (private browsing, storage disabled, etc.) */
  }
}

// ---------------------------------------------------------------------------
// Sidebar collapse
// ---------------------------------------------------------------------------
function initSidebarCollapse() {
  const shell = document.getElementById("app-shell");
  const stored = safeGet("sidebar");
  if (stored === "collapsed") shell.dataset.sidebar = "collapsed";

  document.getElementById("sidebar-collapse-btn")?.addEventListener("click", () => {
    const collapsed = shell.dataset.sidebar === "collapsed";
    shell.dataset.sidebar = collapsed ? "expanded" : "collapsed";
    safeSet("sidebar", collapsed ? "expanded" : "collapsed");
  });
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
let toastTimer = null;
function showToast(message, { actionLabel, onAction } = {}) {
  const toast = document.getElementById("toast");
  toast.querySelector(".toast__msg").textContent = message;
  const actionBtn = toast.querySelector(".toast__action");
  if (actionLabel && onAction) {
    actionBtn.hidden = false;
    actionBtn.textContent = actionLabel;
    actionBtn.onclick = onAction;
  } else {
    actionBtn.hidden = true;
  }
  toast.hidden = false;
  clearTimeout(toastTimer);
  if (!actionLabel) toastTimer = setTimeout(() => (toast.hidden = true), 2500);
}

// ---------------------------------------------------------------------------
// Offline indicator + SW update prompt
// ---------------------------------------------------------------------------
function initConnectivity() {
  const update = () => {
    if (!navigator.onLine) showToast("You're offline — showing cached data", { });
  };
  window.addEventListener("offline", update);
  window.addEventListener("online", () => showToast("Back online"));
}

function initServiceWorker() {
  if (IS_TAURI || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("sw.js");
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            showToast("A new version is available", {
              actionLabel: "Reload",
              onAction: () => location.reload(),
            });
          }
        });
      });
    } catch (err) {
      console.warn("Service worker registration failed:", err);
    }
  });
}

// ---------------------------------------------------------------------------
// Tauri live reload on filesystem change
// ---------------------------------------------------------------------------
async function initTauriWatch() {
  if (!IS_TAURI) return;
  try {
    const listen = window.__TAURI__?.event?.listen;
    if (!listen) return;
    await listen("topics-changed", async () => {
      state.topics = await loadTopics();
      renderSidebarNav();
      const topic = getActiveTopic();
      if (topic) renderTopic(topic);
      showToast("Topics reloaded from disk");
    });
  } catch (err) {
    console.warn("Tauri watch init failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Titlebar (Tauri)
// ---------------------------------------------------------------------------
function initTitlebar() {
  if (!IS_TAURI) return;
  const win = window.__TAURI__?.window?.getCurrentWindow?.();
  document.getElementById("titlebar-min")?.addEventListener("click", () => win?.minimize());
  document.getElementById("titlebar-max")?.addEventListener("click", () => win?.toggleMaximize());
  document.getElementById("titlebar-close")?.addEventListener("click", () => win?.close());
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  renderSkeleton();

  state.topics = await loadTopics();
  const { slug, languages, tasks } = parseHash();
  state.filters.languages = languages;
  state.filters.tasks = tasks;

  initTheme();
  initSidebarCollapse();
  initSearch();
  initSheet();
  initConnectivity();
  initServiceWorker();
  initTitlebar();
  initTauriWatch();

  document.getElementById("sidebar-nav").addEventListener("click", (e) => {
    const a = e.target.closest("[data-slug]");
    if (a) {
      e.preventDefault();
      switchTopic(a.dataset.slug);
    }
  });

  window.addEventListener("popstate", () => {
    const parsed = parseHash();
    state.filters.languages = parsed.languages;
    state.filters.tasks = parsed.tasks;
    switchTopic(parsed.slug ?? state.topics[0]?.slug, { pushHash: false });
  });

  switchTopic(slug ?? state.topics[0]?.slug, { pushHash: false });
}

boot();
