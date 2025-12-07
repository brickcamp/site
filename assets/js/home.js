const params = new URLSearchParams(window.location.search);
var base  = params.get("base")  || "__any";
var type  = params.get("type")  || "__any";
var value = params.get("value") || "__any";
var sort  = params.get("sort")  || "date-desc";

document.addEventListener("DOMContentLoaded", () => {
  initFilterNav();
  refresh();
});

function initFilterNav() {
  const links = document.querySelectorAll("#filter-nav .dropdown-item");
  links.forEach(link => link.addEventListener("click", onFilterLinkClicked));
}

function refresh() {
  refreshFilterDropdowns();
  refreshEntries();
}

function refreshFilterDropdowns() {
  const dropdowns = document.querySelectorAll("#filter-nav .nav-item.dropdown");
  const selected = {
    "nav-base": base,
    "nav-type": type,
    "nav-value": value,
    "nav-sort": sort,
  }
  dropdowns.forEach(d => copySpanText(d.id + "-" + selected[d.id], d.id));
}

async function refreshEntries() {
  const csvSorted = "/sorted/" + sort;
  const csvFilter = "/filtered/" + base + "-" + type + "-" + value;

  clearEntries();
  Promise.all([loadCSV(csvSorted), loadCSV(csvFilter)])
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
  const elCol = document.createElement("div");
  elCol.classList.add("col");
  document.getElementById("entries").appendChild(elCol);

  const elCard = document.createElement("div");
  elCard.classList.add("card", "h-100");
  elCol.appendChild(elCard);

  const elImage = document.createElement("img");
  elImage.classList.add("card-img-top");
  elImage.src = entry[0] + "/image.png";
  elCard.appendChild(elImage);

  const elFooter = document.createElement("div");
  elFooter.classList.add("card-footer", "text-center", "h-100");
  elFooter.innerText = entry[1];
  elCard.appendChild(elFooter);

  const elLink = document.createElement("a");
  elLink.href = entry[0];
  elLink.classList.add("stretched-link");
  elCard.appendChild(elLink);
}

function onFilterLinkClicked(e) {
  const id = e.target.closest("[id]")?.id;
  const segments = id.split("-", 3);
  if (segments.length < 2 || segments[0] != "nav") {
    return;
  }

  switch (segments[1]) {
    case "base":
      base = segments[2];
      break;
    case "type":
      type = segments[2];
      break;
    case "value":
      value = segments[2];
      break;
    case "sort":
      sort = segments[2];
      break;
    default:
      return;
  }
  refresh();
}

function copySpanText(from, to) {
  const text = getSpanText(from);
  setSpanText(to, text);
}

function getSpanText(id) {
  return document.getElementById(id)?.querySelector("span")?.innerText;
}

function setSpanText(id, text) {
  const span = document.getElementById(id)?.querySelector("span");
  if (span){
    span.innerText = text;
  }
}
