// Entry point of the homepage bundle, built from layouts/home.html. The only
// module here with side effects; the rest just declare.
//
// Wiring is one-directional — events -> app -> view -> DOM. A control says what
// it means (events.js), this module decides how it affects the state (state.js) 
// and what to show for it (lookup.js), and view.js paints it.
// No step reaches back up.
import * as appState from "./state.js";
import * as appView from "./view.js";
import * as appLookup from "./lookup.js";
import * as appQuirks from "./quirks.js";
import * as appScope from "./scope.js";

let state;
let entries = [];
let parts = [];
let entriesShown = 0;
let partsShown = 0;

document.addEventListener("DOMContentLoaded", async () => {
  await appScope.load();
  state = appState.load();
  appView.mount(document, dispatch, loadMore);
  appQuirks.apply(document);
  await renderAll();
});

window.addEventListener("popstate", async () => {
  state = appState.load();
  await renderAll();
});

async function dispatch(patch) {
  state = appState.save(appState.next(state, patch));
  await renderAll();
}

// A page never re-fetches: the list is already in memory, so this only grows
// how much of it is rendered and moves focus onto the newly revealed items.
function loadMore(list) {
  if (list === "parts") {
    const previousShown = partsShown;
    partsShown = Math.min(parts.length, partsShown + appView.pageSize("parts"));
    appView.renderParts(parts, partsShown, previousShown);
  } else {
    const previousShown = entriesShown;
    entriesShown = Math.min(entries.length, entriesShown + appView.pageSize("entries"));
    appView.renderEntries(entries, entriesShown, previousShown);
  }
}

async function renderAll() {
  appView.renderSearchPlaceholder(state);

  // While a query is pending the user is still typing in the field, so skip then.
  if (!state.queryPending) {
    appView.renderSearchQuery(state);
  }

  const shown = await scopedItems(state);

  // A slow fetch must not paint over what a later state already rendered.
  if (shown.state !== state) {
    return;
  }

  entries = shown.entries;
  parts = shown.parts;
  entriesShown = Math.min(entries.length, appView.pageSize("entries"));
  partsShown = Math.min(parts.length, appView.pageSize("parts"));

  appView.renderEntries(entries, entriesShown);
  appView.renderParts(parts, partsShown);
  appView.renderScopeTabs(state);
  appView.renderFilterDropdowns(state);
}

// Tags the items with the state they were fetched for: by the time the lookup
// resolves, `state` may be a newer one, and renderAll drops a result whose tag
// no longer matches. Taking it as an argument is what keeps the tag and the
// fetch it describes from ever coming apart.
async function scopedItems(forState) {
  const [entries, parts] = await Promise.all([
    appLookup.scopedEntries(forState),
    appLookup.scopedParts(forState),
  ]);

  return { state: forState, entries: entries, parts: parts };
}
