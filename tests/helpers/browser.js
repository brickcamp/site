// The globals assets/js/home/url.js reads. Enough of them to drive it, and a
// log of the history calls so a test can tell a push from a replace from
// neither. Node has URL built in, so `location` is just one.

export function installBrowser(href = "https://brick.camp/") {
  const calls = [];

  const go = (kind, url) => {
    calls.push({ kind: kind, url: String(url) });
    globalThis.window.location = new URL(String(url), globalThis.window.location);
  };

  globalThis.window = { location: new URL(href) };
  globalThis.history = {
    pushState: (_state, _title, url) => go("push", url),
    replaceState: (_state, _title, url) => go("replace", url),
  };

  return calls;
}
