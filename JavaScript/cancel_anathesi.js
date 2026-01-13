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
    <div id="cancel-modal" class="custom-modal">
      <form id="cancel-form" class="modal-content">
        <h3>Ακύρωση ανάθεσης διπλωματικής</h3>

        <label>Διπλωματική:<br>
          <select id="cancelThesisSelect" required>
            <option value="">-- Επιλέξτε διπλωματική προς ακύρωση --</option>
          </select>
        </label><br>

        <div class="button-group">
          <button type="submit" id="confirmCancel" class="change-btn">Ακύρωση ανάθεσης</button>
          <button type="button" id="cancelCancel" class="change-btn cancel-btn">Κλείσιμο</button>
        </div>

        <div id="cancel-error" style="color:#b00;margin-top:8px;display:none;"></div>
      </form>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    const cancelBtn = document.getElementById('cancel-anathesi-button');
    if (!cancelBtn) return;

    cancelBtn.addEventListener('click', () => {
      if (document.getElementById('cancel-modal')) return; // already open
      const modal = el(modalHtml);
      document.body.appendChild(modal);
      modal.style.display = 'flex';

      const form = modal.querySelector('#cancel-form');
      const select = modal.querySelector('#cancelThesisSelect');
      const errorDiv = modal.querySelector('#cancel-error');
      const submitBtn = modal.querySelector('#confirmCancel');
      const closeBtn = modal.querySelector('#cancelCancel');

      closeBtn.addEventListener('click', () => {
        modal.remove();
      });

      select.innerHTML = '<option disabled>Φόρτωση διπλωματικών...</option>';
      select.disabled = true;

      fetch('../PHP/get_cancelable_theses.php')
        .then(res => res.json())
        .then(data => {
          select.innerHTML = '<option value="">-- Επιλέξτε διπλωματική προς ακύρωση --</option>';
          data.forEach(thesis => {
            const option = document.createElement('option');
            option.value = thesis.id;
            option.textContent = `${thesis.titlos} (ID: ${thesis.id})`;
            select.appendChild(option);
          });
          select.disabled = false;
        })
        .catch(err => {
          console.error('Σφάλμα κατά την ανάκτηση διπλωματικών:', err);
          select.innerHTML = '<option disabled>Αποτυχία φόρτωσης</option>';
          showMessage('Αποτυχία φόρτωσης διπλωματικών προς ακύρωση.', 'error');
        });

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        errorDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Αποστολή...';

        const thesisId = select.value;
        if (!thesisId) {
          errorDiv.textContent = 'Παρακαλώ επιλέξτε διπλωματική προς ακύρωση.';
          errorDiv.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ακύρωση ανάθεσης';
          return;
        }

        try {
          const resp = await fetch('../PHP/cancel_anathesi.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thesisId })
          });
          const data = await resp.json();

          if (!resp.ok || data.error) {
            throw new Error(data.error || 'Server error');
          }

          modal.remove();
          showMessage('Η ανάθεση ακυρώθηκε επιτυχώς!', 'success');
        } catch (err) {
          console.error('Σφάλμα κατά την ακύρωση:', err);
          errorDiv.textContent = 'Σφάλμα: ' + err.message;
          errorDiv.style.display = 'block';
        } finally {
          if (document.body.contains(modal)) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Ακύρωση ανάθεσης';
          }
        }
      });
    });
  });
})();
