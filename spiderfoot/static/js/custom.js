window.addEventListener('load', function (event) {
  console.log('All resources finished loading!');
  //get width

  let right = document.querySelector('#optsect_global');
  //let h = right.offsetHeight;
  const style = window.getComputedStyle(right);
  const h = style.height;
  const hj = right.getBoundingClientRect().height;
  console.log('Height is: ' + hj);
  const heightNum = parseFloat(style.height);
  console.log('Height is: ' + h);
  document.querySelector('.lefty-navo').style.maxHeight = heightNum + 'px';
});
