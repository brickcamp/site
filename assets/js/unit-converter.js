const elNumber  = document.getElementById("conversion-number");
const elUnit    = document.getElementById("conversion-unit");
const elUnits   = document.querySelectorAll("#conversion-units [data-factor]");
const elScale   = document.getElementById("conversion-scale");
const elScales  = document.querySelectorAll("#conversion-scales [data-factor]");
const elResults = document.querySelectorAll("#conversion-results input");

document.addEventListener("DOMContentLoaded", () => {
  initInputs();
  onNumberInputChanged();
});

function initInputs() {
  elNumber.addEventListener("input", onNumberInputChanged);
  elUnits.forEach(link => {
    link.classList.toggle("active", link.dataset.factor == elUnit.dataset.factor);
    link.addEventListener("click", onUnitLinkClicked);
    link.addEventListener("keydown", e => {
      if (e.key === "Enter") onUnitLinkClicked(e);
    });
  });

  elScale.addEventListener("input", onScaleInputChanged);
  elScales.forEach(link => {
    link.classList.toggle("active", link.dataset.factor == elScale.dataset.factor);
    link.addEventListener("click", onScaleLinkClicked);
    link.addEventListener("keydown", e => {
      if (e.key === "Enter") onScaleLinkClicked(e);
    });
  });
}

function onUnitLinkClicked(e) {
  const selected = e.target.closest("[data-factor]");
  elUnit.dataset.factor = selected.dataset.factor;
  elUnit.innerText      = selected.innerText;

  elUnits.forEach((el) => el.classList.remove("active"));
  selected.classList.add("active");

  calculate();
}

function onScaleLinkClicked(e) {
  const selected = e.target.closest("[data-factor]");
  elScale.dataset.factor = selected.dataset.factor;
  elScale.value          = selected.dataset.factor == "1" ? "× 1" : selected.innerText;

  elScales.forEach((el) => el.classList.remove("active"));
  selected.classList.add("active");

  calculate();
}

function onNumberInputChanged() {
  elNumber.dataset.factor = elNumber.valueAsNumber;

  calculate();
}

function onScaleInputChanged() {
  const MULTIPLIERS = /[·×xX*]/g;
  const DIVIDERS    = /[\\\/∕⁄÷:]/g;
  const PERCENTAGE  = /^[\d.,]+%$/g;
  const RATIO       = /^[\d.,]+:[\d.,]+$/g;
  
  var input = elScale.value
      .replace(MULTIPLIERS, "x")
      .replace(DIVIDERS, ":")
      .replace(/[^\d.,:x%]/g, "");

  var factor;
  if (input.match(PERCENTAGE)) {
    factor = Number(input.replace("%", "")) / 100;
  } else if (input.match(RATIO)) {
    const ratio = input.split(":", 2);
    factor = Number(ratio[0]) * 1.0 / Number(ratio[1]);
  } else if (input.match(DIVIDERS)) {
    factor = 1.0 / Number(input.replace(/[^\d.,]/g, ""));
  } else {
    factor = Number(input.replace(/[^\d.,]/g, ""));
  }

  elScale.dataset.factor = isNaN(factor) ? "" : factor;
  elScales.forEach((el) => el.classList.remove("active"));
  calculate();
}

function setActive(element, active) {
  active ? element.classList.add("active") : element.classList.remove("active");
}

function calculate() {
  const number = Number(elNumber.dataset.factor);
  const unit   = Number(elUnit.dataset.factor);
  const scale  = Number(elScale.dataset.factor);
  const input  = number * unit * scale;

  if (isNaN(input)) {
    elResults.forEach((result) => result.value = "");
    return;
  }

  elResults.forEach((result) => {
    const conversion = Number(result.dataset.factor);
    result.value = Number((input / conversion).toFixed(3));
    if (result.value == 0) {
      result.value = "≈ 0";
    }
  });
}