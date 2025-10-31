document.addEventListener("DOMContentLoaded", () => {
  fetch("footer.html")
    .then((res) => {
      if (!res.ok) throw new Error("Footer not found");
      return res.text();
    })
    .then((html) => {
      document.getElementById("footer-placeholder").innerHTML = html;
    })
    .catch((err) => {
      console.warn("Gagal load footer:", err);
    });
});
