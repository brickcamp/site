import * as appEvents from "./events.js";

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
      (dropdown.id === "nav-value" && !state.hasValues) ||
      (dropdown.id === "nav-size" && !state.hasSize) ||
      (dropdown.id === "nav-sort" && !state.hasSort);
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
