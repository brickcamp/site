document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.hdn .no').forEach(el => {
    el.classList.remove('no');
    el.classList.add('y');
  });
  document.querySelectorAll('.hdn .yes').forEach(el => {
    el.classList.remove('yes');
    el.classList.add('n');
  });
});
