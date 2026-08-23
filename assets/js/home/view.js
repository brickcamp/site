import * as appEvents from "./events.js";
import * as appScope from "./scope.js";

// Page size defined by fixed row count and Bootstrap's row-cols-* classes
const BOOTSTRAP_BREAKPOINTS = { "": 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 };
const PARTS_PAGE_ROWS = 6;
const ENTRIES_PAGE_ROWS = 5;

let root;
let doc;
let elSearchInput;
let elScopeTabs;
let elPartList;
let elPartTemplate;
let elPartPagination;
let elPartStatus;
let elPartLoadMore;
let elPartColumnBreakpoints;
let elEntryList;
let elEntryTemplate;
let elEntryPagination;
let elEntryStatus;
let elEntryLoadMore;
let elEntryColumnBreakpoints;
let searchesEntries;
let searchesParts;

// Takes the root to render into, the callback for user intents, and the
// callback for a "load more" click, so nothing is read from the DOM before a
// caller asks for it — a fixture works as root.
export function mount(mountRoot, onIntent, onLoadMore) {
  root = mountRoot;
  doc = root.ownerDocument ?? root;
  elSearchInput = root.querySelector("#search-input");
  elScopeTabs = root.querySelectorAll("#scope-tabs [data-dim]");
  elPartList = root.querySelector("#parts");
  elPartTemplate = root.querySelector("#part-template");
  elPartPagination = root.querySelector("#parts-pagination");
  elPartStatus = root.querySelector("#parts-pagination-status");
  elPartLoadMore = root.querySelector("#parts-load-more");
  elEntryList = root.querySelector("#entries");
  elEntryTemplate = root.querySelector("#entry-template");
  elEntryPagination = root.querySelector("#entries-pagination");
  elEntryStatus = root.querySelector("#entries-pagination-status");
  elEntryLoadMore = root.querySelector("#entries-load-more");

  elPartColumnBreakpoints = columnBreakpoints(elPartList);
  elEntryColumnBreakpoints = columnBreakpoints(elEntryList);

  searchesEntries = elSearchInput.placeholder;
  searchesParts = elSearchInput.dataset.placeholderParts ?? searchesEntries;

  elPartLoadMore.addEventListener("click", () => onLoadMore("parts"));
  elEntryLoadMore.addEventListener("click", () => onLoadMore("entries"));

  appEvents.listenToIntents(root, onIntent);
  appEvents.listenToSearch(elSearchInput, onIntent);
}

export function pageSize(list) {
  const breakpoints = list === "parts" ? elPartColumnBreakpoints : elEntryColumnBreakpoints;
  const rows = list === "parts" ? PARTS_PAGE_ROWS : ENTRIES_PAGE_ROWS;
  return columnsFor(breakpoints) * rows;
}

// Parses a grid's own row-cols[-<breakpoint>]-<count> classes into [minWidth, count] pairs, 
// so the cols-per-width are not hardcoded at two separate places.
function columnBreakpoints(elGrid) {
  const breakpoints = [];
  for (const cls of elGrid.className.split(/\s+/)) {
    const match = /^row-cols-(?:([a-z]+)-)?(\d+)$/.exec(cls);
    if (match) {
      const [, breakpointName, columns] = match;
      breakpoints.push([BOOTSTRAP_BREAKPOINTS[breakpointName ?? ""], Number(columns)]);
    }
  }
  return breakpoints.sort((a, b) => a[0] - b[0]);
}

function columnsFor(breakpoints) {
  const width = window.innerWidth;
  let columns = breakpoints[0][1];
  for (const [minWidth, cols] of breakpoints) {
    if (width >= minWidth) {
      columns = cols;
    }
  }
  return columns;
}

export function renderSearchQuery(state) {
  elSearchInput.value = state.query;
}

// The part list searches parts, every other scope searches entries — say which.
export function renderSearchPlaceholder(state) {
  const text = appScope.scopeFor(state).isPartList ? searchesParts : searchesEntries;
  elSearchInput.placeholder = text;
  elSearchInput.setAttribute("aria-label", text.replace(/\.+$/, ""));
}

export function renderFilterDropdowns(state) {
  const scope = appScope.scopeFor(state);
  const shown = {
    type: scope.hasTypes,
    value: scope.hasValues,
    size: scope.hasSize,
    sort: scope.hasSort,
  };

  root.querySelectorAll("#filter-nav .dropdown-item").forEach((item) => {
    item.hidden = item.dataset.scope && item.dataset.scope != state.base;
  });

  root.querySelectorAll("#filter-nav .dropdown[data-dim]").forEach((dropdown) => {
    const dimension = dropdown.dataset.dim;
    const value = state[dimension];
    setLabel(dropdown, scope.labelFor(dimension, value), isNarrowing(dimension, value));
    dropdown.hidden = !shown[dimension];
  });
}

// For highlighting non-default dropdown values
function isNarrowing(dimension, value) {
  const untouched = dimension === "sort" ? appScope.sortDefault() : appScope.ANY;
  return value !== untouched;
}

function setLabel(dropdown, text, isBold) {
  const toggle = dropdown.querySelector(".dropdown-toggle");
  if (toggle) {
    toggle.classList.toggle("fw-bold", isBold);
  }

  const span = toggle?.querySelector("span");
  if (span) {
    span.innerText = text;
  }
}

export function renderScopeTabs(state) {
  elScopeTabs.forEach((tab) => {
    const isActive = tab.dataset.value === state.base;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

// `shown` is how many of `parts` to render; `focusFromIndex` is the index a
// "load more" click grew the list from, so focus can land on the first newly
// revealed item — omit it on a fresh (non-load-more) render.
export function renderParts(parts, shown, focusFromIndex) {
  renderItems(elPartList, elPartTemplate, parts, shown, focusFromIndex);
  renderPagination(elPartPagination, elPartStatus, elPartLoadMore, parts.length, shown, "parts");
}

export function renderEntries(entries, shown, focusFromIndex) {
  renderItems(elEntryList, elEntryTemplate, entries, shown, focusFromIndex);
  renderPagination(elEntryPagination, elEntryStatus, elEntryLoadMore, entries.length, shown, "entries");
}

function renderItems(elItemList, elItemTemplate, items, shown, focusFromIndex) {
  const visible = items.slice(0, shown);
  const fragment = doc.createDocumentFragment();

  visible.forEach((item) => {
    const elItem = newItemFromTemplate(elItemTemplate, item);
    fragment.appendChild(elItem);
  });

  elItemList.replaceChildren(fragment);

  if (focusFromIndex != null) {
    elItemList.children[focusFromIndex]?.querySelector(".insert-title")?.focus();
  }
}

// Silent (no label, no button) while everything already fits on one page;
// once a list has ever needed paging, the status line stays put so a fully
// expanded list still reads as "Showing all N", not as if it vanished.
function renderPagination(elPagination, elStatus, elLoadMore, total, shown, list) {
  if (total <= pageSize(list)) {
    elPagination.hidden = true;
    return;
  }

  elPagination.hidden = false;
  const exhausted = shown >= total;
  elStatus.textContent = exhausted ? `Showing all ${total} ${list}` : `Showing ${shown} of ${total} ${list}`;
  elLoadMore.hidden = exhausted;
}

function newItemFromTemplate(template, item) {
  const result = template.content.cloneNode(true);

  const elImage = result.querySelector(".insert-image-src");
  if (elImage) {
    elImage.src = item.image;
  }

  const elLink = result.querySelector(".insert-link");
  if (elLink) {
    elLink.href = item.link;
    elLink.title = item.title;
  }

  const elTitle = result.querySelector(".insert-title");
  if (elTitle) {
    elTitle.innerText = item.title;
  }

  // A card that declares a dimension is a control: the item's id is its value.
  const elIntent = result.querySelector("[data-dim]");
  if (elIntent) {
    elIntent.dataset.value = item.id;
  }

  return result;
}
