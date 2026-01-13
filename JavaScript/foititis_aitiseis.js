document.addEventListener('DOMContentLoaded', () => {
  const thesisInput  = document.getElementById('thesisId');
  const profSelect   = document.getElementById('professor');
  const modal        = document.getElementById('applicationModal');
  const openBtn      = document.querySelector('.add-application-btn');
  const closeBtn     = document.querySelector('.close-button');
  const form         = document.getElementById('application-form');

  const msgContainer = document.querySelector('.application-message-container');

  let cardWrapper = msgContainer.querySelector('.application-card-wrapper');
  if (!cardWrapper) {
    cardWrapper = document.createElement('div');
    cardWrapper.className = 'application-card-wrapper';
    msgContainer.appendChild(cardWrapper);
  }

  fetch('../PHP/get_application_data.php')
    .then(res => res.json())
    .then(data => {
      thesisInput.value = data.assignedThesisId;

      profSelect.innerHTML = ''; // Clear previous options

      if (data.professors.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'Έχετε ήδη υποβάλει αίτηση σε όλους τους διαθέσιμους καθηγητές';
        opt.disabled = true;
        opt.selected = true;
        profSelect.appendChild(opt);
      } else {
        data.professors.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.username;
          opt.textContent = p.label;
          profSelect.appendChild(opt);
        });
      }
    })
    .catch(err => {
      console.error('fetch error:', err);
      alert('Σφάλμα φόρτωσης δεδομένων. Κοιτάξτε την κονσόλα.');
    });

  openBtn.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', e => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('../PHP/submit_application.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Network error');
      }

      const noDataMsg = msgContainer.querySelector('.no-data-message');
      if (noDataMsg) noDataMsg.remove();

      // Add the new application card
      const card = document.createElement('div');
      card.className = 'application-card';
      card.innerHTML = `
        <p><strong>Καθηγητής:</strong> ${data.professorName}</p>
        <p><strong>Κατάσταση αίτησης:</strong> ${data.status}</p>
        <p><strong>Απάντηση:</strong> ${data.answer || '-'}</p>
      `;
      cardWrapper.appendChild(card);

      // Re-fetch professors and rebuild dropdown
      fetch('../PHP/get_application_data.php')
        .then(res => res.json())
        .then(newData => {
          thesisInput.value = newData.assignedThesisId;
          profSelect.innerHTML = '';

          if (newData.professors.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'Έχετε ήδη υποβάλει αίτηση σε όλους τους διαθέσιμους καθηγητές';
            opt.disabled = true;
            opt.selected = true;
            profSelect.appendChild(opt);
          } else {
            newData.professors.forEach(p => {
              const opt = document.createElement('option');
              opt.value = p.username;
              opt.textContent = p.label;
              profSelect.appendChild(opt);
            });
          }
        });

      form.reset();
      modal.style.display = 'none';
    } catch (err) {
      console.error('Σφάλμα υποβολής:', err);
      alert('Σφάλμα υποβολής: ' + err.message);
    }
  });

  fetch('../PHP/load_applications.php')
    .then(res => res.json())
    .then(applications => {
      if (!applications.length) {
        const noData = document.createElement("p");
        noData.textContent = "Δεν υπάρχουν αποθηκευμένες αιτήσεις.";
        noData.classList.add("no-data-message");
        msgContainer.appendChild(noData);
        return;
      }

      applications.forEach(app => {
        const card = document.createElement("div");
        card.className = "application-card";
        card.innerHTML = `
          <p><strong>Καθηγητής:</strong> ${app.professorName}</p>
          <p><strong>Κατάσταση αίτησης:</strong> ${app.status}</p>
          <p><strong>Απάντηση:</strong> ${app.answer || '-'}</p>
        `;
        cardWrapper.appendChild(card);
      });
    })
    .catch(error => {
      console.error("Σφάλμα κατά τη φόρτωση αιτήσεων:", error);
      alert("Παρουσιάστηκε σφάλμα κατά τη φόρτωση των αιτήσεων.");
    });
});
