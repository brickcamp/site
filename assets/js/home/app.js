import * as appState from "./state.js";
import * as appView from "./view.js";
import * as appLookup from "./lookup.js";
import * as appScope from "./scope.js";

let state;

document.addEventListener("DOMContentLoaded", async () => {
  await appScope.load();
  state = appState.load();
  appView.mount(document, dispatch);
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

  appView.renderEntries(shown.entries);
  appView.renderParts(shown.parts);
  appView.renderScopeTabs(state);
  appView.renderFilterDropdowns(state);
}

// Tags the items with the state they were fetched for: by the time the lookup
// resolves, `state` may be a newer one. The tag travels as an argument rather
// than a local, because the js minifier reorders declarations around an await.
async function scopedItems(forState) {
  const [entries, parts] = await Promise.all([
    appLookup.scopedEntries(forState),
    appLookup.scopedParts(forState),
  ]);

  return { state: forState, entries: entries, parts: parts };
}
