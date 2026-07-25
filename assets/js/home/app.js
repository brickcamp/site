import * as appState from "./state.js";
import * as appView from "./view.js";
import * as appLookup from "./lookup.js";
import * as appScope from "./scope.js";

let state;
let renderCount = 0;

document.addEventListener("DOMContentLoaded", async () => {
  await appScope.load();
  state = appState.load();
  appView.init();
  appView.renderSearchField(state);
  await render();
});

window.addEventListener("popstate", async () => {
  state = appState.load();
  appView.renderSearchField(state);
  await render();
});

export async function dispatch(patch) {
  state = appState.save({ ...state, ...patch });

  if (patch["queryPending"] === false) {
    appView.renderSearchField(state);
  }

  await render();
}

async function render() {
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
