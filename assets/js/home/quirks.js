// Two workarounds for library and browser behaviour, applied once by app.js.
// They live outside view.js because they reach for globals it never receives:
// Bootstrap's and IntersectionObserver. Not fixture-safe, by design — mount() is
// the seam that is.

export function apply(root) {
  fixDropdowns(root);
  fixStickyFilter(root);
}

// avoid hidden dropdowns because of horizontal scroll container
// see https://github.com/twbs/bootstrap/issues/35397#issuecomment-1325790968
function fixDropdowns(root) {
  root.querySelectorAll(".dropdown-toggle").forEach((toggle) => {
    new bootstrap.Dropdown(toggle, {
      popperConfig(defaultBsPopperConfig) {
        return { ...defaultBsPopperConfig, strategy: "fixed" };
      },
    });
  });
}

// Bootstrap's .sticky-top sets top: 0, so a stuck element stays fully
// intersecting and this observer would never fire. custom.css pulls it to
// top: -1px, so one pixel leaves the viewport and the ratio drops below the
// threshold. Both halves are load-bearing, and "border-bottom" only has a rule
// behind it because postcss.config.js safelists it.
function fixStickyFilter(root) {
  const sticky = root.querySelector(".border-bottom-on-sticky");
  const addBorderIfSticky = ([e]) =>
    sticky.classList.toggle("border-bottom", e.intersectionRatio < 1);

  const observer = new IntersectionObserver(addBorderIfSticky, {
    threshold: [1],
  });

  observer.observe(sticky);
}
