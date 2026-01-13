document.addEventListener("DOMContentLoaded", () => {
  fetch("../PHP/get_foititis_data.php")
    .then(response => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then(data => {
      if (data.error) {
        displayNoData();
        console.error("Server error:", data.error);
        return;
      }

      // Populate fields with data
      document.getElementById("titlos").textContent = data.thesis?.title || "-";
      document.getElementById("perigrafi").textContent = data.thesis?.summary || "-";

      const arxeioElem = document.getElementById("arxeio");
      arxeioElem.textContent = "";
      if (data.thesis?.file) {
        const link = document.createElement("a");
        link.href = data.thesis.file;
        link.textContent = "Άνοιγμα αρχείου";
        link.target = "_blank";
        arxeioElem.appendChild(link);
      } else {
        arxeioElem.textContent = "-";
      }

      document.getElementById("status").textContent = data.thesis?.status || "-";
      document.getElementById("epivlepontas").textContent = data.thesis?.supervisor || "-";
      document.getElementById("meloi").textContent = data.thesis?.committee || "-";

      // Show the calculated vathmos
      if (typeof data.vathmos === "number") {
        document.getElementById("vathmos").textContent = data.vathmos.toFixed(2);
      } else {
        document.getElementById("vathmos").textContent = "-";
      }

      // Logic for xronos apo enarxi
      const thesisStatus = (data.thesis?.status || "").toLowerCase();
      let xronosText = "-";

      if (thesisStatus.includes("does not meet") || thesisStatus.includes("not started") || thesisStatus === "") {
        xronosText = "Δεν έχει ξεκινήσει";
      } else if (data.thesis_start_date) {
        const startDate = new Date(data.thesis_start_date);
        const now = new Date();

        const diffTime = Math.abs(now - startDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffMonths / 12);

        let parts = [];
        if (diffYears > 0) parts.push(`${diffYears} έτος${diffYears > 1 ? 'η' : ''}`);
        if (diffMonths % 12 > 0) parts.push(`${diffMonths % 12} μήνα${(diffMonths % 12) > 1 ? 'ες' : ''}`);
        if (diffDays % 30 > 0) parts.push(`${diffDays % 30} ημέρα${(diffDays % 30) > 1 ? 'ς' : ''}`);

        xronosText = parts.length ? parts.join(" ") : "0 ημέρες";
      } else {
        xronosText = "Δεν έχει οριστεί ημερομηνία έναρξης";
      }

      document.getElementById("xronos").textContent = xronosText;
    })
    .catch(error => {
      console.error("Fetch error:", error);
      displayNoData();
    });
});

function displayNoData() {
  const fields = ["titlos", "perigrafi", "arxeio", "status", "epivlepontas", "meloi", "xronos", "vathmos"];
  fields.forEach(id => {
    document.getElementById(id).textContent = "Δεν υπάρχουν διαθέσιμα στοιχεία";
  });
}
