let counter = 1;
setInterval(() => {
  document.querySelector(h1).innerText = counter;
  counter++;
}, 1000);