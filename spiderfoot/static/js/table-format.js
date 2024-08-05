
document.addEventListener('DOMContentLoaded', () => {
  console.log('meow');
  function isJson(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
  document.querySelectorAll('table td pre').forEach(el => {
    console.log(el.innerText);
    if (isJson(el.innerText)) {
      const formatter = new JSONFormatter(el.innerText);
      el.innerHTML = '';
      el.appendChild(formatter.render());
    }
  });
});