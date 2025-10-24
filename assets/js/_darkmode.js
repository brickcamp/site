let isDark = false;

function init() {
  switch (localStorage.getItem("theme")) {
    case "dark":
      setDark(true);
      return;
    case "light":
      setDark(false);
      return;
  }

  const darkMatcher = window.matchMedia("(prefers-color-scheme: dark)");
  setDark(darkMatcher.matches);
}

function setDark(enabled) {
  isDark = enabled;

  const theme = isDark ? "dark" : "light";
  document.documentElement.setAttribute("data-bs-theme", theme);
  localStorage.setItem("theme", theme);
}

function toggle() {
  setDark(!isDark);
}

function initToggle() {
  document.getElementById("darkmode-toggle").addEventListener("click", toggle);
}

init();
window.addEventListener("DOMContentLoaded", initToggle);
