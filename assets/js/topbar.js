document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-input");
  if (!input) return;

  if (window.location.pathname === "/") {
    return;
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      redirectToHomeWithQuery(input.value || "");
    }
  });
});

function redirectToHomeWithQuery(rawQuery) {
  const url = new URL("/", window.location.origin);
  const value = (rawQuery || "").trim();
  if (value) {
    url.searchParams.set("q", value);
  }
  window.location.href = url.toString();
}

