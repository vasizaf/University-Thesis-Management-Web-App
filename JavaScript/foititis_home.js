document.addEventListener("DOMContentLoaded", () => {
  fetch("../PHP/get_foititis_data.php")
    .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
    .then(renderData)
    .catch(e => console.error("Fetch error:", e));

  document.querySelector(".change-btn")
          .addEventListener("click", enterEditMode);
});

function renderData(data) {
  if (data.error) {
    console.error("Error from server:", data.error);
    return;
  }

  document.getElementById("eponimo").textContent = data.eponimo || '';
  document.getElementById("onoma").textContent = data.onoma || '';
  document.getElementById("am").textContent = data.am || '';
  document.getElementById("etos").textContent = data.etos || '';

  document.getElementById("contact-content").innerHTML = `
    <ul class="info-list">
      <li><strong>Διεύθυνση:</strong> <span id="dieuthinsi" class="info-text">${data.dieuthinsi || ''}</span></li>
      <li><strong>E-mail:</strong> <span id="email" class="info-text">${data.email || ''}</span></li>
      <li><strong>Κινητό τηλέφωνο:</strong> <span id="kinito" class="info-text">${data.kinito || ''}</span></li>
      <li><strong>Σταθερό τηλέφωνο:</strong> <span id="stathero" class="info-text">${data.stathero || ''}</span></li>
    </ul>
  `;
  document.getElementById("contact-content").classList.remove("editing");
}

function enterEditMode() {
  const btn = this;
  if (btn.dataset.editing === "true") return;

  const dieuthinsi0 = document.getElementById("dieuthinsi").textContent.trim();
  const email0 = document.getElementById("email").textContent.trim();
  const kinito0 = document.getElementById("kinito").textContent.trim();
  const stathero0 = document.getElementById("stathero").textContent.trim();

  document.getElementById("contact-content").innerHTML = `
    <ul class="info-list">
      <li><strong>Διεύθυνση:</strong> <input id="dieuthinsi-in" class="edit-field" type="text" value="${dieuthinsi0}"></li>
      <li><strong>E-mail:</strong> <input id="email-in" class="edit-field" type="email" value="${email0}"></li>
      <li><strong>Κινητό τηλέφωνο:</strong> <input id="kinito-in" class="edit-field" type="text" value="${kinito0}"></li>
      <li><strong>Σταθερό τηλέφωνο:</strong> <input id="stathero-in" class="edit-field" type="text" value="${stathero0}"></li>
    </ul>
  `;
  document.getElementById("contact-content").classList.add("editing");

  btn.textContent = "Αποθήκευση";
  btn.dataset.editing = "true";

  const cancel = document.createElement("button");
  cancel.textContent = "Άκυρο";
  cancel.classList.add("cancel-btn");
  btn.after(cancel);

  btn.removeEventListener("click", enterEditMode);
  btn.addEventListener("click", saveChanges);

  cancel.addEventListener("click", () => {
    document.getElementById("contact-content").innerHTML = `
      <ul class="info-list">
        <li><strong>Διεύθυνση:</strong> <span id="dieuthinsi" class="info-text">${dieuthinsi0}</span></li>
        <li><strong>E-mail:</strong> <span id="email" class="info-text">${email0}</span></li>
        <li><strong>Κινητό τηλέφωνο:</strong> <span id="kinito" class="info-text">${kinito0}</span></li>
        <li><strong>Σταθερό τηλέφωνο:</strong> <span id="stathero" class="info-text">${stathero0}</span></li>
      </ul>
    `;
    document.getElementById("contact-content").classList.remove("editing");

    btn.textContent = "Αλλαγή στοιχείων";
    delete btn.dataset.editing;
    cancel.remove();

    btn.removeEventListener("click", saveChanges);
    btn.addEventListener("click", enterEditMode);
  });
}

function saveChanges(e) {
  e.preventDefault();
  const btn = this;

  const dieuthinsiNew = document.getElementById("dieuthinsi-in").value.trim();
  const emailNew = document.getElementById("email-in").value.trim();
  const kinitoNew = document.getElementById("kinito-in").value.trim();
  const statheroNew = document.getElementById("stathero-in").value.trim();

  if (!emailNew || !dieuthinsiNew) {
    alert("Τα πεδία διεύθυνση και e-mail είναι υποχρεωτικά.");
    return;
  }

  fetch("../PHP/update_foititis.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `dieuthinsi=${encodeURIComponent(dieuthinsiNew)}&email=${encodeURIComponent(emailNew)}&kinito=${encodeURIComponent(kinitoNew)}&stathero=${encodeURIComponent(statheroNew)}`
  })
  .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
  .then(data => {
    if (data.success) {
      document.getElementById("contact-content").innerHTML = `
        <ul class="info-list">
          <li><strong>Διεύθυνση:</strong> <span id="dieuthinsi" class="info-text">${dieuthinsiNew}</span></li>
          <li><strong>E-mail:</strong> <span id="email" class="info-text">${emailNew}</span></li>
          <li><strong>Κινητό τηλέφωνο:</strong> <span id="kinito" class="info-text">${kinitoNew}</span></li>
          <li><strong>Σταθερό τηλέφωνο:</strong> <span id="stathero" class="info-text">${statheroNew}</span></li>
        </ul>
      `;
      document.getElementById("contact-content").classList.remove("editing");

      btn.textContent = "Αλλαγή στοιχείων";
      delete btn.dataset.editing;
      document.querySelector(".cancel-btn")?.remove();

      btn.removeEventListener("click", saveChanges);
      btn.addEventListener("click", enterEditMode);
    } else {
      alert(data.error || "Σφάλμα αποθήκευσης");
    }
  })
  .catch(err => {
    console.error("Update failed:", err);
    alert("Πρόβλημα με τον εξυπηρετητή. Δοκιμάστε ξανά.");
  });
}
