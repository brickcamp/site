import * as appEvents from "./events.js";

const elEntryTemplate = document.getElementById("entry-template");
const elEntriesWrapper = document.getElementById("entries");
const elFilterItems = document.querySelectorAll("#filter-nav .dropdown-item");
const elScopeTabs = document.querySelectorAll("#scope-tabs [data-base]");
const elSearchInput = document.getElementById("search-input");

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
  const selected = {
    "nav-type": state.type,
    "nav-value": state.value,
    "nav-size": state.size,
    "nav-sort": state.sort,
  };

  // copySpanText relies on invalid items to be hidden, so refresh items first
  document.querySelectorAll("#filter-nav .dropdown-item").forEach((link) => {
    link.hidden = link.dataset.base && link.dataset.base != state.base;
  });
  document.querySelectorAll("#filter-nav .dropdown").forEach((dropdown) => {
    copySpanText(dropdown.id + "-" + selected[dropdown.id], dropdown.id);
    dropdown.hidden =
      (dropdown.id === "nav-type" && !state.hasTypes) ||
      (dropdown.id === "nav-value" && !state.hasValues);
  });
}

function copySpanText(from, to) {
  const text = getSpanText(from);
  setSpanText(to, text);
}

function getSpanText(id) {
  return document
    .querySelector("#" + id + ":not([hidden])")
    ?.querySelector("span")?.innerText;
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

export function renderEntries(entries) {
  const fragment = document.createDocumentFragment();

  entries.forEach((entry) => {
    const elEntry = newEntryNode(entry);
    fragment.appendChild(elEntry);
  });

  elEntriesWrapper.replaceChildren(fragment);
}

function newEntryNode(entry) {
  const result = elEntryTemplate.content.cloneNode(true);

  const elImage = result.querySelector(".insert-image-src");
  const elLink = result.querySelector(".insert-link");
  const elTitle = result.querySelector(".insert-title");

  if (elImage) {
    elImage.src = entry.image;
  }
  if (elLink) {
    elLink.href = entry.link;
    elLink.title = entry.title;
  }
  if (elTitle) {
    elTitle.innerText = entry.title;
  }

  return result;
}
