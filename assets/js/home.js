const params = new URLSearchParams(window.location.search);
var base = params.get("base") || "__any";
var type = params.get("type") || "__any";
var value = params.get("value") || "__any";
var sort = params.get("sort") || "date-desc";

document.addEventListener("DOMContentLoaded", () => {
  loadEntries();
});

async function loadCSV(url) {
  const response = await fetch("/data/" + url + "/index.csv");
  const text = await response.text();
  return text
    .trim()
    .replaceAll("'", "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

async function loadEntries() {
  const csvSorted = "/sorted/" + sort;
  const csvFilter = "/filtered/" + base + "-" + type + "-" + value;

  clearEntries();
  Promise.all([loadCSV(csvSorted), loadCSV(csvFilter)])
    .then(([listSort, listFilter]) => {
      const indexMap = new Map(listSort.map((item, index) => [item, index]));
      entries = listFilter
        .map(line => line.split(","))
        .filter((entry) => indexMap.has(entry[0]))
        .sort((a, b) => indexMap.get(a[0]) - indexMap.get(b[0]));
      entries.forEach(addEntry);
    })
    .catch((err) => console.error("loadEntries failed:", err));
}

function clearEntries() {
  document.getElementById("entries").textContent = "";
}

function addEntry(entry) {
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
