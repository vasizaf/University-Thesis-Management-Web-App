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
    const container = document.getElementById('messages') || document.body;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 5000);
  }

  const modalHtml = `
    <div id="cancelThesisModal" class="custom-modal" style="display:none; align-items:center; justify-content:center;">
      <form id="cancelThesisForm" class="modal-content" style="max-width:600px;">
        <h3>Ακύρωση διπλωματικής</h3>

        <label>Διπλωματική:<br>
          <select id="cancelThesisFinalSelect" required>
            <option value="">-- Επιλέξτε διπλωματική --</option>
          </select>
        </label><br>

        <div id="extraInputs" style="display:none; margin-top:10px;">
          <label>Αριθμός ΓΣ:<br>
            <input type="text" id="arithmos_gs" />
          </label><br>
          <label>Έτος:<br>
            <input type="text" id="year" />
          </label>
        </div><br>

        <div class="button-group">
          <button type="submit" id="confirmThesisCancel" class="change-btn">Ακύρωση διπλωματικής</button>
          <button type="button" id="closeThesisCancel" class="change-btn cancel-btn">Κλείσιμο</button>
        </div>

        <div id="cancelThesisError" class="error-message" style="display:none; color:#b00; margin-top:8px;"></div>
      </form>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('cancel-thesis-button');
    if (!openBtn) return;

    if (!document.getElementById('cancelThesisModal')) {
      document.body.appendChild(el(modalHtml));
    }

    const modal = document.getElementById('cancelThesisModal');
    const form = document.getElementById('cancelThesisForm');
    const select = document.getElementById('cancelThesisFinalSelect');
    const errorDiv = document.getElementById('cancelThesisError');
    const confirmBtn = document.getElementById('confirmThesisCancel');
    const closeBtn = document.getElementById('closeThesisCancel');
    const extraInputs = document.getElementById('extraInputs');

    async function loadCancelableDiplomas() {
      select.innerHTML = '<option disabled>Φόρτωση διπλωματικών...</option>';
      select.disabled = true;

      try {
        const resp = await fetch('../PHP/get_delayed_theses.php', { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
        const text = await resp.text();
        console.log('get_delayed_theses raw response (first 2000 chars):', text.slice(0, 2000));

        let data;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error('Invalid JSON from server when loading theses. Server returned: ' + text.replace(/\s+/g, ' ').slice(0, 1000));
        }

        select.innerHTML = '<option value="">-- Επιλέξτε διπλωματική --</option>';
        if (Array.isArray(data) && data.length) {
          data.forEach(thesis => {
            const option = document.createElement('option');
            option.value = thesis.id;
            option.textContent = `${thesis.titlos} (ID: ${thesis.id})`;
            select.appendChild(option);
          });
        } else {
          const opt = document.createElement('option');
          opt.value = '';
          opt.disabled = true;
          opt.textContent = 'Δεν βρέθηκαν διπλωματικές';
          select.appendChild(opt);
        }
        select.disabled = false;
      } catch (err) {
        console.error('Σφάλμα κατά την ανάκτηση διπλωματικών:', err);
        alert('Αποτυχία φόρτωσης διπλωματικών προς ακύρωση. Δες console για λεπτομέρειες.');
        select.innerHTML = '<option value="">-- Σφάλμα φόρτωσης --</option>';
        select.disabled = true;
      }
    }

    function ensureExtraInputs() {
      if (!select.dataset.inputsHandlerAttached) {
        select.addEventListener('change', function () {
          extraInputs.style.display = this.value ? 'block' : 'none';
        });
        select.dataset.inputsHandlerAttached = '1';
      }
    }

    openBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      loadCancelableDiplomas();
      ensureExtraInputs();
    });

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      errorDiv.style.display = 'none';
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Αποστολή...';

      const thesisId = select.value;
      const arithmos_gs = document.getElementById('arithmos_gs').value.trim();
      const year = document.getElementById('year').value.trim();

      if (!thesisId) {
        errorDiv.textContent = 'Παρακαλώ επιλέξτε διπλωματική προς ακύρωση.';
        errorDiv.style.display = 'block';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Ακύρωση διπλωματικής';
        return;
      }

      if (!arithmos_gs || !year) {
        errorDiv.textContent = 'Παρακαλώ συμπληρώστε Αριθμό ΓΣ και Έτος.';
        errorDiv.style.display = 'block';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Ακύρωση διπλωματικής';
        return;
      }

      try {
        const resp = await fetch('../PHP/cancel_diplomatiki.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          credentials: 'same-origin', // ensure cookies/session are sent
          body: `thesis_id=${encodeURIComponent(thesisId)}&arithmos_gs=${encodeURIComponent(arithmos_gs)}&year=${encodeURIComponent(year)}`
        });

        // Always read raw text first (so HTML error pages won't break JSON parsing)
        const text = await resp.text();
        console.log('cancel_diplomatiki raw response:', resp.status, text.slice(0, 2000));

        let data = null;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          const isHtml = text.trim().startsWith('<');
          throw new Error('Invalid JSON from server — server returned ' + (isHtml ? 'HTML/markup' : 'non-JSON text') + '. Response snippet: ' + text.replace(/\s+/g, ' ').slice(0, 1000));
        }

        if (!resp.ok) {
          throw new Error(data.error || ('Server returned status ' + resp.status));
        }
        if (data.error) {
          throw new Error(data.error);
        }

        modal.style.display = 'none';
        showMessage('Η διπλωματική ακυρώθηκε επιτυχώς.', 'success');

      } catch (err) {
        console.error('Σφάλμα κατά την ακύρωση:', err);
        errorDiv.textContent = 'Σφάλμα: ' + err.message;
        errorDiv.style.display = 'block';
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Ακύρωση διπλωματικής';
      }
    });
  });
})();
