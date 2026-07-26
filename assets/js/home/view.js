import * as appEvents from "./events.js";
import * as appScope from "./scope.js";

let root;
let doc;
let elSearchInput;
let elScopeTabs;
let elPartList;
let elPartTemplate;
let elEntryList;
let elEntryTemplate;
let searchesEntries;
let searchesParts;

// Takes the root to render into and the callback for user intents, so nothing
// is read from the DOM before a caller asks for it — a fixture works as root.
export function mount(mountRoot, onIntent) {
  root = mountRoot;
  doc = root.ownerDocument ?? root;
  elSearchInput = root.querySelector("#search-input");
  elScopeTabs = root.querySelectorAll("#scope-tabs [data-dim]");
  elPartList = root.querySelector("#parts");
  elPartTemplate = root.querySelector("#part-template");
  elEntryList = root.querySelector("#entries");
  elEntryTemplate = root.querySelector("#entry-template");

  // The two things the one search box can search, both worded in the markup.
  searchesEntries = elSearchInput.placeholder;
  searchesParts = elSearchInput.dataset.placeholderParts ?? searchesEntries;

  appEvents.listenToIntents(root, onIntent);
  appEvents.listenToSearch(elSearchInput, onIntent);

  initDropdownFix();
  initStickyFilterFix();
}

function initDropdownFix() {
  // avoid hidden dropdowns because of horizontal scroll container
  // see https://github.com/twbs/bootstrap/issues/35397#issuecomment-1325790968
  const toggles = root.querySelectorAll(".dropdown-toggle");
  const fixes = [...toggles].map(
    (toggle) =>
      new bootstrap.Dropdown(toggle, {
        popperConfig(defaultBsPopperConfig) {
          return { ...defaultBsPopperConfig, strategy: "fixed" };
        },
      }),
  );
}

function initStickyFilterFix() {
  const addBorderIfSticky = ([e]) =>
    sticky.classList.toggle("border-bottom", e.intersectionRatio < 1);

  const sticky = root.querySelector(".border-bottom-on-sticky");
  const observer = new IntersectionObserver(addBorderIfSticky, {
    threshold: [1],
  });

  sticky.style.top = -1; // <- to make sticky state noticeable
  observer.observe(sticky);
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

// A dropdown left at its default narrows nothing — only the others are worth
// spotting at a glance, so only those are bold.
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

export function renderParts(parts) {
  renderItems(elPartList, elPartTemplate, parts);
}

export function renderEntries(entries) {
  renderItems(elEntryList, elEntryTemplate, entries);
}

function renderItems(elItemList, elItemTemplate, items) {
  const fragment = doc.createDocumentFragment();

  items.forEach((item) => {
    const elItem = newItemFromTemplate(elItemTemplate, item);
    fragment.appendChild(elItem);
  });

  elItemList.replaceChildren(fragment);
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
