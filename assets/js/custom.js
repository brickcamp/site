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