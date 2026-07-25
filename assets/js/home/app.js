import * as appState from "./state.js";
import * as appView from "./view.js";
import * as appLookup from "./lookup.js";
import * as appScope from "./scope.js";

let state;
let renderCount = 0;

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
  // While a query is pending the user is still typing in the field, so leave it be.
  if (!state.queryPending) {
    appView.renderSearchField(state);
  }

  const renderId = ++renderCount;
  const [entries, parts] = await Promise.all([
    appLookup.scopedEntries(state),
    appLookup.scopedParts(state),
  ]);

  // A slow first fetch must not paint over what a later state already rendered.
  if (renderId !== renderCount) {
    return;
  }

  appView.renderEntries(entries);
  appView.renderParts(parts);
  appView.renderScopeTabs(state);
  appView.renderFilterDropdowns(state);
}
