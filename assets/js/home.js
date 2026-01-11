var base, type, value, sort;
const basesWithoutTypes  = ["__any", "part"];
const basesWithoutValues = ["__any", "part", "repeat", "size"];
const typesWithoutValues = ["ellipse", "circle", "sphere", "toroid"];

document.addEventListener("DOMContentLoaded", () => {
  initFilterDropdowns();
  refresh();
});

window.addEventListener("popstate", (event) => {
  refresh();
})

function initQueryParams() {
  const params = new URLSearchParams(window.location.search);
  base  = params.get("base")  || "__any";
  type  = params.get("type")  || "__any";
  value = params.get("value") || "__any";
  sort  = params.get("sort")  || "date-desc";
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

function changeQueryParams() {
  cleanupQueryParams();

  const url = new URL(location);
  const params = url.searchParams;
  const before = params.toString();
  base  == "__any"     ? params.delete("base")  : params.set("base", base);
  type  == "__any"     ? params.delete("type")  : params.set("type", type);
  value == "__any"     ? params.delete("value") : params.set("value", value);
  sort  == "date-desc" ? params.delete("sort")  : params.set("sort", sort);
  const after = params.toString();

  if (before != after) {
    history.pushState(null, "", url);
    refresh();
  }
}

function refresh() {
  initQueryParams();
  refreshFilterDropdowns();
  refreshEntries();
}

function refreshFilterDropdowns() {
  const dropdowns = document.querySelectorAll("#filter-nav .dropdown");
  const selected = {
    "nav-base": base,
    "nav-type": type,
    "nav-value": value,
    "nav-sort": sort,
  }
  dropdowns.forEach(dropdown => {
    copySpanText(dropdown.id + "-" + selected[dropdown.id], dropdown.id)
    console.log(dropdown.id + "/" + base);
    switch(dropdown.id) {
      case "nav-type":
        dropdown.hidden = (basesWithoutTypes.includes(base));
        break;
      case "nav-value":
        dropdown.hidden = (basesWithoutValues.includes(base) || typesWithoutValues.includes(type));
        break;
    }
  });

  const links = document.querySelectorAll("#filter-nav .dropdown-item");
  links.forEach(link => {
    link.hidden = link.dataset.base && link.dataset.base != base;
  });
}

async function refreshEntries() {
  clearEntries();
  Promise.all([loadEntrySorting(), loadEntryFiltering()])
    .then(([listSort, listFilter]) => {
      const indexMap = new Map(listSort.map((item, index) => [item, index]));
      listFilter
        .map(line => line.split(","))
        .filter((entry) => indexMap.has(entry[0]))
        .sort((a, b) => indexMap.get(a[0]) - indexMap.get(b[0]))
        .forEach(appendEntry);
    })
    .catch((err) => console.error("refreshEntries failed:", err));
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
  const response = await fetch("/data/" + url + "/index.csv");
  const text = await response.text();
  return text
    .trim()
    .replaceAll("'", "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

function clearEntries() {
  document.getElementById("entries").textContent = "";
}

function appendEntry(entry) {
  const template = document.getElementById("entry-template");
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

  document.getElementById("entries").appendChild(clone);
}

function onFilterLinkClicked(e) {
  const id = e.target.closest("[id]")?.id;
  const segments = id.split("-");
  if (segments.length < 2 || segments[0] != "nav") {
    return;
  }

  switch (segments[1]) {
    case "base":
      base  = segments[2];
      type  = "__any";
      value = "__any";
      break;
    case "type":
      type = segments[2];
      break;
    case "value":
      value = segments[2];
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
