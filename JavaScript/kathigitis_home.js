document.addEventListener("DOMContentLoaded", () => {
  fetch("../PHP/get_kathigitis_data.php")
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

  document.getElementById("username").textContent = data.username || '';
  document.getElementById("onoma").textContent = data.onoma || '';
  document.getElementById("eponimo").textContent = data.eponimo || '';
  document.getElementById("profession").textContent = data.profession || '';

  document.getElementById("contact-content").innerHTML = `
    <ul class="info-list">
      <li><strong>E-mail:</strong> <span id="email" class="info-text">${data.email || ''}</span></li>
      <li><strong>Τηλέφωνο:</strong> <span id="tilefono" class="info-text">${data.tilefono || ''}</span></li>
    </ul>
  `;
  document.getElementById("contact-content").classList.remove("editing");
}

function enterEditMode() {
  const btn = this;
  if (btn.dataset.editing === "true") return;

  const email0 = document.getElementById("email").textContent.trim();
  const tilefono0 = document.getElementById("tilefono").textContent.trim();

  document.getElementById("contact-content").innerHTML = `
    <ul class="info-list">
      <li><strong>E-mail:</strong> <input id="email-in" class="edit-field" type="email" value="${email0}"></li>
      <li><strong>Τηλέφωνο:</strong> <input id="tilefono-in" class="edit-field" type="text" value="${tilefono0}"></li>
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
        <li><strong>E-mail:</strong> <span id="email" class="info-text">${email0}</span></li>
        <li><strong>Τηλέφωνο:</strong> <span id="tilefono" class="info-text">${tilefono0}</span></li>
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

  const emailNew = document.getElementById("email-in").value.trim();
  const tilefonoNew = document.getElementById("tilefono-in").value.trim();

  if (!emailNew) {
    alert("Το πεδίο e-mail είναι υποχρεωτικό.");
    return;
  }

  fetch("../PHP/update_kathigitis.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `email=${encodeURIComponent(emailNew)}&tilefono=${encodeURIComponent(tilefonoNew)}`
  })
  .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
  .then(data => {
    if (data.success) {
      document.getElementById("contact-content").innerHTML = `
        <ul class="info-list">
          <li><strong>E-mail:</strong> <span id="email" class="info-text">${emailNew}</span></li>
          <li><strong>Τηλέφωνο:</strong> <span id="tilefono" class="info-text">${tilefonoNew}</span></li>
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
