document.addEventListener("DOMContentLoaded", () => {
  initDropdowns();
  refresh();
});

function initDropdowns() {
  const unit = document.querySelectorAll("#conversion-unit-picker .dropdown-item");
  unit.forEach(link => {
    link.addEventListener("click", onUnitLinkClicked);
    link.addEventListener("keydown", e => {
      if (e.key === "Enter") onUnitLinkClicked(e);
    });
  });

  const scale = document.querySelectorAll("#conversion-scale-picker .dropdown-item");
  scale.forEach(link => {
    link.addEventListener("click", onScaleLinkClicked);
    link.addEventListener("keydown", e => {
      if (e.key === "Enter") onScaleLinkClicked(e);
    });
  });
}

function onUnitLinkClicked(e) {
  const link = e.target.closest("[data-unit]");
  console.log(link?.dataset.unit);
}

function onScaleLinkClicked(e) {
  const link = e.target.closest(".dropdown-item");
  console.log(link?.innerText);
}

function refresh() {

}