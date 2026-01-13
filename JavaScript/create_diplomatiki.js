(function () {
  function el(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    return wrapper.firstElementChild;
  }

  function showMessage(text, type = 'info') {
    const msg = document.createElement('div');
    msg.className = `msg ${type}`;
    msg.textContent = text;
    document.getElementById('messages').appendChild(msg);
    setTimeout(() => msg.remove(), 5000);
  }

  const modalHtml = `
    <div id="create-dipl-modal" class="custom-modal">
      <form id="create-dipl-form" class="modal-content">
        <h3>Καταχώρηση νέας διπλωματικής</h3>

        <label>Τίτλος (max 50)<br>
          <input name="titlos" type="text" maxlength="50" required />
        </label><br>

        <label>Περιγραφή (max 100)<br>
          <textarea name="perigrafi" maxlength="100" required></textarea>
        </label><br>

        <label>Αρχείο (PDF/DOCX)<br>
          <input name="arxeio_perigrafis" type="file" accept=".pdf,.doc,.docx" />
        </label><br>

        <label>Σημειώσεις (προαιρετικό)<br>
          <textarea name="simeiosis" maxlength="300"></textarea>
        </label><br>

        <div class="button-group">
          <button type="submit" id="create-dipl-submit" class="change-btn">
            Καταχώρηση
          </button>
          <button type="button" id="create-dipl-cancel" class="change-btn cancel-btn">
            Κλείσιμο
          </button>
        </div>

        <div id="create-dipl-error"></div>
      </form>
    </div>
  `;

  function initCreateDipl() {
    const addBtn = document.getElementById('add-button');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
      // don't re-open if it's already in the DOM
      if (document.getElementById('create-dipl-modal')) return;

      const modal = el(modalHtml);
      document.body.appendChild(modal);
      modal.classList.add('open');

      modal
        .querySelector('#create-dipl-cancel')
        .addEventListener('click', () => modal.remove());

      const form      = modal.querySelector('#create-dipl-form');
      const errorDiv  = modal.querySelector('#create-dipl-error');
      const submitBtn = modal.querySelector('#create-dipl-submit');

      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        errorDiv.style.display  = 'none';
        submitBtn.disabled      = true;
        submitBtn.textContent   = 'Αποστολή...';

        const fd = new FormData(form);
        try {
          const resp = await fetch('../PHP/create_diplomatiki.php', {
            method: 'POST',
            body:   fd
          });
          const data = await resp.json();
          if (!resp.ok || data.error) {
            throw new Error(data.error || 'Server error');
          }

          modal.remove();
          showMessage('Η διπλωματική καταχωρήθηκε επιτυχώς!', 'success');

        } catch (err) {
          console.error(err);
          errorDiv.textContent    = 'Σφάλμα: ' + err.message;
          errorDiv.style.display  = 'block';
        } finally {
          if (document.body.contains(modal)) {
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Καταχώρηση';
          }
        }
      });
    });
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreateDipl);
  } else {
    initCreateDipl();
  }
})();
