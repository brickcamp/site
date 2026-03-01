const btnToTop = document.getElementById("toTop");
btnToTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0, 
    behavior: "auto"
  });
});
window.addEventListener("scroll", () => {
  btnToTop.style.display = window.scrollY > 200 ? "block" : "none";
});

const tooltipTrigger = (window.matchMedia('(pointer: fine)').matches) ? 'hover focus' : 'click';
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
  new bootstrap.Tooltip(el, { trigger: tooltipTrigger });
})