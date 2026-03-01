const STATE_PARAMS = Object.freeze({
  base: "base",
  type: "type",
  value: "value",
  part: "part",
  size: "size",
  sort: "sort",
  query: "q",
});

export function getState(defaults) {
  const params = new URLSearchParams(window.location.search);
  const result = { ...defaults };

  for (let key in STATE_PARAMS) {
    param = STATE_PARAMS[key];
    if (params.has(param)) {
      result[key] = params.get(param);
    }
  }
  return result;
}

export function pushState(state, defaults) {
  applyState(state, defaults, { replace: false });
}

export function replaceState(state, defaults) {
  applyState(state, defaults, { replace: true });
}

function applyState(state, defaults, opts) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const before = params.toString();
  
  for (let key in STATE_PARAMS) {
    if (state[key] === defaults[key]) {
      params.delete(key);
    } else {
      let param = STATE_PARAMS[key];
      params.set(param, state[key]);
    }
  }
  const after = params.toString();
  if (before !== after) {
    if (opts.replace) {
      history.replaceState(null, "", url);
    } else {
      history.pushState(null, "", url);
    }
  }
}
