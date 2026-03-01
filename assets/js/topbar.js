document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname === "/") {
    return;
  }

  const input = document.getElementById("search-input");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      redirectToHomeWithQuery(input.value);
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

