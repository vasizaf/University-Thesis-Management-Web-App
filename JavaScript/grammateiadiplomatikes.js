const submitModalHtml = `
  <div id="submit-modal" class="custom-modal">
    <form id="submit-form" class="modal-content">
      <h3>Υποβολή αριθμού ΓΣ</h3>

      <label>
        Αριθμός ΓΣ:
        <input type="number" name="arithmos_gs" min="1" required />
      </label>

      <div class="button-group">
        <button type="submit" class="change-btn">Υποβολή</button>
        <button type="button" id="submit-close" class="change-btn cancel-btn">Άκυρο</button>
      </div>
    </form>
  </div>
`;

const cancelModalHtml = `
  <div id="cancel-modal" class="custom-modal">
    <form id="cancel-form" class="modal-content">
      <h3>Ακύρωση διπλωματικής</h3>

      <label>
        Έτος:
        <input type="number" name="etos" min="2020" required />
      </label>

      <label>
        Αριθμός ΓΣ:
        <input type="number" name="arithmos_gs" min="1" required />
      </label>

      <label>
        Απολογία:
        <textarea name="apologia" required></textarea>
      </label>

      <div class="button-group">
        <button type="submit" class="change-btn">Υποβολή</button>
        <button type="button" id="cancel-close" class="change-btn cancel-btn">Άκυρο</button>
      </div>

      <div id="cancel-form-error" class="error-message"></div>
    </form>
  </div>
`;

const updateModalHtml = `
  <div id="update-modal" class="custom-modal">
    <form id="update-form" class="modal-content">
      <h3>Δήλωση περάτωσης</h3>
      <div class="button-group">
        <button type="submit" class="change-btn">Υποβολή</button>
        <button type="button" id="update-close" class="change-btn cancel-btn">Άκυρο</button>
      </div>
    </form>
  </div>
`;

// Globals
let activeThesesnpa = [];
let activeThesesypa = [];
let tfTheses        = [];
let ueTheses        = [];
let pendingTheses   = [];

let currentThesis = null;
let currentCard   = null;

document.addEventListener('DOMContentLoaded', () => {

  document.body.insertAdjacentHTML('beforeend', submitModalHtml);
  document.body.insertAdjacentHTML('beforeend', cancelModalHtml);
  document.body.insertAdjacentHTML('beforeend', updateModalHtml);

  const cancelModal = document.getElementById('cancel-modal');
  const cancelClose = document.getElementById('cancel-close');
  const cancelForm  = document.getElementById('cancel-form');
  const cancelError = document.getElementById('cancel-form-error');

  cancelClose.addEventListener('click', () => {
    cancelModal.classList.remove('open');
    cancelError.style.display = 'none';
    currentThesis = null;
  });

  cancelForm.addEventListener('submit', function(e) {
    e.preventDefault();
    cancelError.style.display = 'none';

    if (!currentThesis) {
      cancelError.textContent = 'Δεν έχει επιλεγεί διπλωματική.';
      cancelError.style.display = 'block';
      return;
    }

    const payload = {
      id:          currentThesis.id,
      arithmos_gs: this.arithmos_gs.value.trim(),
      etos:        this.etos.value.trim(),
      apologia:    this.apologia.value.trim()
    };

    fetch('../PHP/delete_thesis.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        cancelModal.classList.remove('open');
        if (currentCard) currentCard.remove();
        fetchAndPopulateTheses();
      } else {
        cancelError.textContent = res.error || 'Αποτυχία ακύρωσης.';
        cancelError.style.display = 'block';
      }
    })
    .catch(err => {
      console.error(err);
      cancelError.textContent = 'Σφάλμα κατά την ακύρωση.';
      cancelError.style.display = 'block';
    });
  });

  const submitModal = document.getElementById('submit-modal');
  const submitClose = document.getElementById('submit-close');
  const submitForm  = document.getElementById('submit-form');

  submitClose.addEventListener('click', () => {
    submitModal.classList.remove('open');
    currentThesis = null;
  });

  submitForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!currentThesis) {
      return alert('Σφάλμα: Δεν έχει επιλεγεί διπλωματική.');
    }

    const gsValue = this.arithmos_gs.value.trim();
    if (!gsValue) {
      return alert('Παρακαλώ εισάγετε τον αριθμό ΓΣ.');
    }

    const payload = {
      id:          currentThesis.id,
      arithmos_gs: parseInt(gsValue, 10)
    };

    fetch('../PHP/submit_gs.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        alert('Ο αριθμός ΓΣ υποβλήθηκε με επιτυχία!');
        this.reset();
        submitModal.classList.remove('open');
        fetchAndPopulateTheses();
      } else {
        alert('Σφάλμα υποβολής ΓΣ: ' + (res.error || 'Άγνωστο σφάλμα'));
      }
    })
    .catch(err => {
      console.error('Submit GS error:', err);
      alert('Σφάλμα κατά την υποβολή αριθμού ΓΣ.');
    });
  });

  const updateModal = document.getElementById('update-modal');
  const updateClose = document.getElementById('update-close');
  const updateForm  = document.getElementById('update-form');

  updateClose.addEventListener('click', () => {
    updateModal.classList.remove('open');
    currentThesis = null;
  });

  updateForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!currentThesis) return;

    const thesisJson = {
      id:                 currentThesis.id,
      status_diplomatiki: 'Finished'
    };

    fetch('../PHP/update-thesis.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(thesisJson)
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        updateModal.classList.remove('open');
        if (currentCard) currentCard.remove();
        fetchAndPopulateTheses();
      } else {
        alert('Αποτυχία ενημέρωσης: ' + (res.error || ''));
      }
    })
    .catch(err => {
      console.error(err);
      alert('Σφάλμα κατά την ενημέρωση.');
    });
  });

  fetchAndPopulateTheses();

  document.querySelectorAll('.dropdown-btn').forEach(button => {
    button.addEventListener('click', () => {
      const content   = button.nextElementSibling;
      const isVisible = content.style.display === 'block';

      content.style.display     = isVisible ? 'none' : 'block';
      button.style.marginBottom = isVisible ? '1%' : '0';

      if (isVisible) resetThesisCards(content);
    });
  });
});

function populateTheses(containerId, theses) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  theses.forEach(thesis => {
    const card = document.createElement('div');
    card.classList.add('thesis-card');

    const summary = document.createElement('div');
    summary.classList.add('thesis-summary');
    summary.innerHTML = `
      <p>ID: ${thesis.id}, Τίτλος: ${thesis.titlos}</p>
      <i class="fas fa-chevron-down"></i>
    `;
    card.appendChild(summary);

    const details = document.createElement('div');
    details.classList.add('thesis-details');
    details.style.display = 'none';
    details.innerHTML = `
      <p>Φοιτητής: ${thesis.student_name || 'N/A'} ${thesis.student_surname || ''}</p>
      <p>Επιβλέπων: ${thesis.epivlepontas || 'N/A'}</p>
      <p>Τριμελής επιτροπή: ${thesis.noumero1 || 'N/A'}, ${thesis.noumero2 || 'N/A'}</p>
      <p>Κατάσταση: ${thesis.status_diplomatiki}</p>
      <p>Βαθμολογία: ${thesis.average_score != null ? thesis.average_score : 'N/A'}</p>
      <p>Νημερτής: ${thesis.nimertis? `<a href="${thesis.nimertis}" target="_blank">${thesis.nimertis}</a>`: 'N/A'}</p>
      <p>Αριθμός ΓΣ: ${thesis.gs_anathesi != null && thesis.gs_anathesi !== '' ? thesis.gs_anathesi : 'N/A'}</p>
    `;

    // “Accepted” actions
    if (thesis.status_diplomatiki === 'Accepted') {
      const hasGS = thesis.gs_anathesi != null && thesis.gs_anathesi !== '';

      if (!hasGS) {
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Υποβολή αριθμού ΓΣ';
        submitBtn.classList.add('submit-btn');
        submitBtn.addEventListener('click', e => {
          e.stopPropagation();
          currentThesis = thesis;
          currentCard   = card;
          document.getElementById('submit-modal').classList.add('open');
        });
        details.appendChild(submitBtn);
      } else {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Διαγραφή';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', e => {
          e.stopPropagation();
          currentThesis = thesis;
          currentCard   = card;
          document.getElementById('cancel-modal').classList.add('open');
        });
        details.appendChild(deleteBtn);
      }
    }

    // “Under exam” fully graded action
    if (
      thesis.status_diplomatiki === 'Under exam' &&
      thesis.nimertis &&
      Number(thesis.completed_graders) === 3
    ) {
      const updateBtn = document.createElement('button');
      updateBtn.textContent = 'Δήλωση περάτωσης';
      updateBtn.classList.add('update-btn');
      updateBtn.addEventListener('click', e => {
        e.stopPropagation();
        currentThesis = thesis;
        currentCard   = card;
        document.getElementById('update-modal').classList.add('open');
      });
      details.appendChild(updateBtn);
    }

    card.appendChild(details);

    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
      const icon = card.querySelector('.thesis-summary i');
      if (card.classList.contains('expanded')) {
        icon.classList.replace('fa-chevron-down','fa-chevron-up');
        details.style.display = 'block';
      } else {
        icon.classList.replace('fa-chevron-up','fa-chevron-down');
        details.style.display = 'none';
      }
    });

    container.appendChild(card);
  });
}

// Collapse all cards
function resetThesisCards(content) {
  content.querySelectorAll('.thesis-card').forEach(card => {
    card.classList.remove('expanded');
    const icon = card.querySelector('.thesis-summary i');
    icon.classList.replace('fa-chevron-up','fa-chevron-down');
    card.querySelector('.thesis-details').style.display = 'none';
  });
}

// Fetch, categorize and render all theses
function fetchAndPopulateTheses() {
  fetch('../PHP/grammateiadiplomatikes.php')
    .then(r => r.json())
    .then(data => {
      // All “Under exam”
      const underExam = data.diplomatikes
        .filter(t => t.status_diplomatiki === 'Under exam');

      // Under exam: no nimertis or fewer than 3 completed graders
      const uePending = underExam.filter(t =>
        !t.nimertis ||
        Number(t.completed_graders) < 3
      );

      // Ready to finish: has nimertis and exactly 3 completed graders
      const ueReady = underExam.filter(t =>
        t.nimertis &&
        Number(t.completed_graders) === 3
      );

      const accepted = data.diplomatikes.filter(t => t.status_diplomatiki === 'Accepted');
      const noGS     = accepted.filter(t => !t.gs_anathesi);
      const withGS   = accepted.filter(t => t.gs_anathesi);

      pendingTheses   = uePending;
      ueTheses        = uePending;
      tfTheses        = ueReady;
      activeThesesnpa = noGS;
      activeThesesypa = withGS;

      populateTheses('pending-theses-container',    uePending);
      populateTheses('active-theses-container-npa',  noGS);
      populateTheses('active-theses-container-ypa',  withGS);
      populateTheses('final-theses-container',       ueReady);
    })
    .catch(err => console.error(err));
}

// Live search filtering
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  if (!q) {
    return fetchAndPopulateTheses();
  }

  function match(t) {
    return ['titlos','simeiosis','epivlepontas','noumero1','noumero2']
      .some(f => t[f] && t[f].toLowerCase().includes(q)) ||
      (t.gs_anathesi && t.gs_anathesi.toString().includes(q));
  }

  populateTheses('pending-theses-container',      ueTheses.filter(match));
  populateTheses('active-theses-container-npa',    activeThesesnpa.filter(match));
  populateTheses('active-theses-container-ypa',    activeThesesypa.filter(match));
  populateTheses('final-theses-container',         tfTheses.filter(match));
});
