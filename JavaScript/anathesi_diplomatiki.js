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
    <div id="assign-modal" class="custom-modal">
      <form id="assign-form" class="modal-content">
        <h3>Ανάθεση διπλωματικής</h3>

        <label>Φοιτητής:<br>
          <select id="foititisSelect" required>
            <option value="">-- Επιλέξτε φοιτητή --</option>
          </select>
        </label><br>

        <label>Διπλωματική:<br>
          <select id="diplomaSelect" required>
            <option value="">-- Επιλέξτε διπλωματική --</option>
          </select>
        </label><br>

        <div class="button-group">
          <button type="submit" id="confirmAssign" class="change-btn">Ανάθεση</button>
          <button type="button" id="cancelAssign" class="change-btn cancel-btn">Κλείσιμο</button>
        </div>

        <div id="assign-error" style="color:#b00;margin-top:8px;display:none;"></div>
      </form>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    const anathesiBtn = document.getElementById('anathesi-button');
    if (!anathesiBtn) return;

    anathesiBtn.addEventListener('click', () => {
      if (document.getElementById('assign-modal')) return; // already open
      const modal = el(modalHtml);
      document.body.appendChild(modal);

      modal.style.display = 'flex';

      modal.querySelector('#cancelAssign').addEventListener('click', () => {
        modal.remove();
      });

      fetch('../PHP/get_available_foititis.php')
        .then(res => res.json())
        .then(data => {
          const select = modal.querySelector('#foititisSelect');
          select.innerHTML = '<option value="">-- Επιλέξτε φοιτητή --</option>';
          data.forEach(student => {
            const option = document.createElement('option');
            option.value = student.username;
            option.textContent = `${student.onoma} ${student.eponimo} (${student.username})`;
            select.appendChild(option);
          });
        });

      fetch('../PHP/get_available_diplomas.php')
        .then(res => res.json())
        .then(data => {
          const select = modal.querySelector('#diplomaSelect');
          select.innerHTML = '<option value="">-- Επιλέξτε διπλωματική --</option>';
          data.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = `${d.titlos} (ID: ${d.id})`;
            select.appendChild(option);
          });
        });

      const form = modal.querySelector('#assign-form');
      const errorDiv = modal.querySelector('#assign-error');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        errorDiv.style.display = 'none';
        const submitBtn = modal.querySelector('#confirmAssign');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Αποστολή…';

        const foititis = modal.querySelector('#foititisSelect').value;
        const diploma  = modal.querySelector('#diplomaSelect').value;

        if (!foititis || !diploma) {
          errorDiv.textContent = 'Παρακαλώ επιλέξτε φοιτητή και διπλωματική.';
          errorDiv.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ανάθεση';
          return;
        }

        try {
          const resp = await fetch('../PHP/assign_diplomatiki.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ foititis, diploma })
          });

          // Read raw text to expose any HTML/errors
          const text = await resp.text();
          console.log('Raw server response:', text);

          let data;
          try {
            data = JSON.parse(text);
          } catch (parseErr) {
            throw new Error('Μη αναμενόμενη απάντηση από τον διακομιστή.');
          }

          if (!resp.ok || data.error) {
            throw new Error(data.error || 'Σφάλμα από διακομιστή');
          }

          modal.remove();
          showMessage('Η ανάθεση ολοκληρώθηκε!', 'success');

        } catch (err) {
          console.error(err);
          errorDiv.textContent = 'Σφάλμα: ' + err.message;
          errorDiv.style.display = 'block';

        } finally {
          if (document.body.contains(modal)) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Ανάθεση';
          }
        }
      });
    });
  });
})();
