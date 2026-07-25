// Turns DOM events into state patches and hands them to the given callback.
// Controls declare what they mean with data-dim / data-value, so nothing 
// here knows what a dimension is or what any value stands for.

export function listenToIntents(root, onIntent) {
  root.addEventListener("click", (e) => activate(e, onIntent));
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      activate(e, onIntent);
    }
  });
}

export function listenToSearch(input, onIntent) {
  input.addEventListener("input", (e) => search(e, onIntent));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      search(e, onIntent);
    }
  });
}

async function activate(e, onIntent) {
  const el = e.target?.closest?.("[data-dim][data-value]");
  if (!el) {
    // handling is left to the browser
    return;
  }

  e.preventDefault();
  await onIntent({ [el.dataset.dim]: el.dataset.value });
}

// Typing keeps the query pending, so the URL and the search field are only
// rewritten once the user is done.
async function search(e, onIntent) {
  await onIntent({ query: e.target.value, queryPending: e.key !== "Enter" });
}
