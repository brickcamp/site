import * as appEvents from "./events.js";
import * as appScope from "./scope.js";

const elSearchInput = document.getElementById("search-input");
const elScopeTabs = document.querySelectorAll("#scope-tabs [data-base]");
const elFilterItems = document.querySelectorAll("#filter-nav .dropdown-item");

const elPartList = document.getElementById("parts");
const elPartTemplate = document.getElementById("part-template");

const elEntryList = document.getElementById("entries");
const elEntryTemplate = document.getElementById("entry-template");

export function init() {
  initEventListeners();
  initDropdownFix();
  initStickyFilterFix();
}

function initEventListeners() {
  appEvents.listenToFilterItems(elFilterItems);
  appEvents.listenToScopeTabs(elScopeTabs);
  appEvents.listenToSearch(elSearchInput);
}

function initDropdownFix() {
  // avoid hidden dropdowns because of horizontal scroll container
  // see https://github.com/twbs/bootstrap/issues/35397#issuecomment-1325790968
  const toggles = document.querySelectorAll(".dropdown-toggle");
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

  const sticky = document.querySelector(".border-bottom-on-sticky");
  const observer = new IntersectionObserver(addBorderIfSticky, {
    threshold: [1],
  });

  sticky.style.top = -1; // <- to make sticky state noticeable
  observer.observe(sticky);
}

export function renderSearchField(state) {
  elSearchInput.value = state.query;
}

export function renderFilterDropdowns(state) {
  const scope = appScope.scopeFor(state);
  const dropdowns = {
    "nav-type": { dimension: "type", value: state.type, shown: scope.hasTypes },
    "nav-value": { dimension: "value", value: state.value, shown: scope.hasValues },
    "nav-size": { dimension: "size", value: state.size, shown: scope.hasSize },
    "nav-sort": { dimension: "sort", value: state.sort, shown: scope.hasSort },
  };

  document.querySelectorAll("#filter-nav .dropdown-item").forEach((link) => {
    link.hidden = link.dataset.base && link.dataset.base != state.base;
  });
  document.querySelectorAll("#filter-nav .dropdown").forEach((dropdown) => {
    const selected = dropdowns[dropdown.id];
    if (!selected) {
      return;
    }
    setSpanText(dropdown.id, scope.labelFor(selected.dimension, selected.value));
    dropdown.hidden = !selected.shown;
  });
}

function setSpanText(id, text) {
  const span = document.getElementById(id)?.querySelector("span");
  if (span) {
    span.innerText = text;
  }
}

export function renderScopeTabs(state) {
  elScopeTabs.forEach((tab) => {
    const tabBase = tab.dataset.base;
    const isActive = tabBase && tabBase === state.base;
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
  const fragment = document.createDocumentFragment();

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

    if (elLink.classList.contains("insert-part-event")) {
      elLink.dataset.part = item.id;
      appEvents.listenToPart(elLink);
    }
  }

  const elTitle = result.querySelector(".insert-title");
  if (elTitle) {
    elTitle.innerText = item.title;
  }

  return result;
}
