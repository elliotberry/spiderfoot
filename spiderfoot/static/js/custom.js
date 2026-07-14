window.addEventListener('load', function () {
  var right = document.querySelector('#optsect_global');
  if (!right) return;

  var style = window.getComputedStyle(right);
  var heightNum = parseFloat(style.height);
  var leftNav = document.querySelector('.lefty-navo');
  if (leftNav && !isNaN(heightNum)) {
    leftNav.style.maxHeight = heightNum + 'px';
  }
});
