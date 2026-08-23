// Fetch doubles for assets/js/home/lookup.js, which takes one via useFetch().

// Serves a { url: body } map; anything else answers like Hugo does for a CSV
// that rendered empty — a 404, which loadRows reads as no rows.
export function fetchFrom(files) {
  return async (url) => {
    if (!(url in files)) {
      return { ok: false };
    }
    return { ok: true, text: async () => files[url] };
  };
}

// One lookup row, as _partials/csv/getRow.html writes it: tab-separated.
export function row(...fields) {
  return fields.join("\t");
}

// Serves a real build: the same URLs, read off disk. Lets the client modules
// run against the files Hugo actually wrote, rather than a fixture of them.
export function fetchFromDir(dir) {
  return async (url) => {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    try {
      const body = await readFile(path.join(dir, url), "utf8");
      return { ok: true, text: async () => body, json: async () => JSON.parse(body) };
    } catch {
      return { ok: false };
    }
  };
}
