(function () {
  function detectDevTools() {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    return widthDiff > threshold || heightDiff > threshold;
  }

  setInterval(() => {
    if (detectDevTools()) {
      window.location.href = "copyright";
    }
  }, 1000);
})();
