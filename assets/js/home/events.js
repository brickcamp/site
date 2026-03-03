import { dispatch } from "./app.js";

export function listenToFilterItems(items) {
  [...items].forEach((item) => {
    item.addEventListener("click", onFilterClicked);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        onFilterClicked(e);
      }
    });
  });  
}

export function listenToScopeTabs(tabs) {
  [...tabs].forEach((tab) => {
    tab.addEventListener("click", onScopeTabClicked);
    tab.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onScopeTabClicked(e);
      }
    });
  });  
}

export function listenToSearch(search) {
  search.addEventListener("input", onSearchInput);
  search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearchInput(e);
    }
  });  
}

export function listenToPart(part) {
  part.addEventListener("click", onPartClicked);
}

async function onFilterClicked(e) {
  const segments = e.target.closest("[id]")?.id?.split("-");
  if (!segments || segments.length < 3 || segments[0] != "nav") {
    return;
  }

  if (segments[1] == "sort") {
    await dispatch({ sort: [segments[2], segments[3]].filter(Boolean).join("-") });
  } else {
    await dispatch({ [segments[1]]: segments[2] });
  }
}

async function onScopeTabClicked(e) {
  const newBase = e.target.closest("[data-base]")?.dataset?.base;
  if (!newBase) return;

  const patch = {
    base: newBase,
    type: "__any",
    value: "__any",
    part: "__any",
  }

  if (newBase === "part") {
    await dispatch({...patch, query: "", queryPending: false });    
  } else {
    await dispatch(patch);
  }
}

async function onPartClicked(e) {
  const part = e.target.dataset.part;
  await dispatch({ part: part, query: "", queryPending: false });
  
  e.preventDefault();
  return false;
}

async function onSearchInput(e) {
  const input = e.target.value;
  await dispatch({ query: input, queryPending: e.key !== "Enter" });
}
