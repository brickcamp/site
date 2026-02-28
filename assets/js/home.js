var base, type, value, size, sort, query;
var cachedEntries = [];
const basesWithoutTypes  = ["__any", "part"];
const basesWithoutValues = ["__any", "part", "repeat", "size"];
const typesWithoutValues = ["ellipse", "circle", "sphere", "toroid"];

document.addEventListener("DOMContentLoaded", () => {
  initQueryParams();
  initFilterDropdowns();
  initScopeTabs();
  initSearchInput();
  initStickyFilters();
  refresh();
});

window.addEventListener("popstate", (event) => {
  refresh();
})

function initStickyFilters() {
  const sticky = document.querySelector('.border-bottom-on-sticky');
  const observer = new IntersectionObserver(
    ([e]) => {
      sticky.classList.toggle('border-bottom', e.intersectionRatio < 1);
    }, {
      threshold: [1]
    }
  );
  observer.observe(sticky);
}

function initQueryParams() {
  const params = new URLSearchParams(window.location.search);
  base  = params.get("base")  || "__any";
  type  = params.get("type")  || "__any";
  value = params.get("value") || "__any";
  sort  = params.get("sort")  || "date-desc";
  size  = params.get("size")  || "__any";
  query = params.get("q")     || "";
  cleanupQueryParams();
}

function cleanupQueryParams() {
  if (basesWithoutTypes.includes(base))  type  = "__any";
  if (basesWithoutValues.includes(base)) value = "__any";
  if (typesWithoutValues.includes(type)) value = "__any";
}

function initFilterDropdowns() {
  const links = document.querySelectorAll("#filter-nav .dropdown-item");
  links.forEach(link => {
    link.addEventListener("click", onFilterLinkClicked);
    link.addEventListener("keydown", e => {
      if (e.key === "Enter") onFilterLinkClicked(e);
    });
  });
  
  // avoid clipping by horizontal scroll container
  // see https://github.com/twbs/bootstrap/issues/35397#issuecomment-1325790968
  const dropdowns = document.querySelectorAll('.dropdown-toggle')
  const dropdown = [...dropdowns].map((dropdownToggleEl) => new bootstrap.Dropdown(dropdownToggleEl, {
    popperConfig(defaultBsPopperConfig) {
      return { ...defaultBsPopperConfig, strategy: 'fixed' };
    }
  }));
}

function initScopeTabs() {
  const tabs = document.querySelectorAll("#scope-tabs [data-base]");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const newBase = tab.dataset.base;
      if (!newBase) return;
      base  = newBase;
      type  = "__any";
      value = "__any";
      changeQueryParams();
    });

    tab.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tab.click();
      }
    });
  });
}

function initSearchInput() {
  const input = document.getElementById("search-input");
  if (!input) {
    return;
  }
  syncSearchInput(input);
  input.addEventListener("input", (e) => {
    query = e.target.value || "";
    applySearchFilterAndRender();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  });
}

function syncSearchInput(input) {
  const el = input || document.getElementById("search-input");
  if (!el) {
    return;
  }
  el.value = query || "";
}

function changeQueryParams() {
  cleanupQueryParams();

  const url = new URL(location);
  const params = url.searchParams;
  const before = params.toString();
  base  == "__any"     ? params.delete("base")  : params.set("base", base);
  type  == "__any"     ? params.delete("type")  : params.set("type", type);
  value == "__any"     ? params.delete("value") : params.set("value", value);
  sort  == "date-desc" ? params.delete("sort")  : params.set("sort", sort);
  size  == "__any"     ? params.delete("size")  : params.set("size", size);
  const after = params.toString();

  if (before != after) {
    history.pushState(null, "", url);
    refresh();
  }
}

function refresh() {
  initQueryParams();
  syncSearchInput();
  refreshFilterDropdowns();
  refreshTabs();
  refreshEntries();
}

function refreshFilterDropdowns() {
  const dropdowns = document.querySelectorAll("#filter-nav .dropdown");
  const selected = {
    "nav-type": type,
    "nav-value": value,
    "nav-size": size,
    "nav-sort": sort,
  }

  // copySpanText relies on invalid items to be hidden, so refresh items first
  const links = document.querySelectorAll("#filter-nav .dropdown-item");
  links.forEach(link => {
    link.hidden = link.dataset.base && link.dataset.base != base;
  });

  dropdowns.forEach(dropdown => {
    copySpanText(dropdown.id + "-" + selected[dropdown.id], dropdown.id)
    switch(dropdown.id) {
      case "nav-type":
        dropdown.hidden = (basesWithoutTypes.includes(base));
        break;
      case "nav-value":
        dropdown.hidden = (basesWithoutValues.includes(base) || typesWithoutValues.includes(type));
        break;
    }
  });
}

function refreshTabs() {
  const tabs = document.querySelectorAll("#scope-tabs [data-base]");
  tabs.forEach(tab => {
    const tabBase = tab.dataset.base;
    if (!tabBase) return;
    const isActive = (tabBase === base) || (tabBase === "__any" && base === "__any");
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

async function refreshEntries() {
  clearEntries();
  Promise.all([loadEntrySorting(), loadEntryFiltering()])
    .then(([listSort, listFilter]) => {
      const indexMap = new Map(listSort.map((item, index) => [item, index]));
      cachedEntries = listFilter
        .map(line => line.split(",").map(part => part.trim()))
        .filter((entry) => indexMap.has(entry[0]))
        .filter((entry) => {
          if (!size || size === "__any") return true;
          const entrySize = (entry[2] || "").trim();
          return entrySize === size;
        })
        .sort((a, b) => indexMap.get(a[0]) - indexMap.get(b[0]));

      applySearchFilterAndRender();
    })
    .catch((err) => console.error("refreshEntries failed:", err));
}

function applySearchFilterAndRender() {
  if (!Array.isArray(cachedEntries)) {
    cachedEntries = [];
  }

  const normalizedQuery = (query || "").trim().toLowerCase();
  let entries = cachedEntries;

  if (normalizedQuery) {
    entries = entries.filter((entry) => {
      const title = (entry[1] || "").toLowerCase();
      return title.includes(normalizedQuery);
    });
  }

  renderEntries(entries);
}

async function loadEntrySorting() {
  if (sort == "random") {
    return loadCSV("/sorted/title-asc").then(list => shuffle(list));
  } else {
    return loadCSV("/sorted/" + sort);
  }
}

async function loadEntryFiltering() {
  return loadCSV("/filtered/" + base + "-" + type + "-" + value);
}

async function loadCSV(url) {
  const response = await fetch("/data" + url + "/index.csv");
  const text = await response.text();
  return text
    .trim()
    .replaceAll("'", "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

function clearEntries() {
  const container = document.getElementById("entries");
  if (container) {
    container.textContent = "";
  }
}

function createEntryNode(entry) {
  const template = document.getElementById("entry-template");
  if (!template) {
    return null;
  }
  const clone = template.content.cloneNode(true);

  const elLink      = clone.querySelector(".insert-link");
  const elImageSrc  = clone.querySelector(".insert-image-src");
  const elTitle     = clone.querySelector(".insert-title");

  if (elLink) {
    elLink.href  = entry[0];
    elLink.title = entry[1];    
  }
  if (elImageSrc) {
    elImageSrc.src = entry[0] + "__image-min.webp";
  }
  if (elTitle) {
    elTitle.innerText = entry[1];
  }

  return clone;
}

function renderEntries(entries) {
  const container = document.getElementById("entries");
  if (!container) {
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach((entry) => {
    const node = createEntryNode(entry);
    if (node) {
      fragment.appendChild(node);
    }
  });

  container.replaceChildren(fragment);
}

function appendEntry(entry) {
  const container = document.getElementById("entries");
  if (!container) {
    return;
  }
  const node = createEntryNode(entry);
  if (node) {
    container.appendChild(node);
  }
}

function onFilterLinkClicked(e) {
  const id = e.target.closest("[id]")?.id;
  const segments = id.split("-");
  if (segments.length < 2 || segments[0] != "nav") {
    return;
  }

  switch (segments[1]) {
    case "type":
      type = segments[2];
      break;
    case "value":
      value = segments[2];
      break;
    case "size":
      size = segments[2];
      break;
    case "sort":
      sort = [segments[2], segments[3]].filter(Boolean).join("-");
      break;
    default:
      return;
  }
  changeQueryParams();
}

function copySpanText(from, to) {
  const text = getSpanText(from);
  setSpanText(to, text);
}

function getSpanText(id) {
  return document.querySelector("#" + id + ":not([hidden])")?.querySelector("span")?.innerText;
}

function setSpanText(id, text) {
  const span = document.getElementById(id)?.querySelector("span");
  if (span){
    span.innerText = text;
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
