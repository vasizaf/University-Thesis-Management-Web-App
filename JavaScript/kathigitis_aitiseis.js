document.addEventListener('DOMContentLoaded', () => {
    loadApplications();

    const acceptedBtn = document.getElementById('show-accepted-btn');
    if (acceptedBtn) acceptedBtn.addEventListener('click', toggleAcceptedView);

    let supBtn = document.getElementById('show-supervisor-apps-btn');
    if (!supBtn) {
        supBtn = document.createElement('button');
        supBtn.id = 'show-supervisor-apps-btn';
        supBtn.className = 'logout';
        supBtn.textContent = 'Εμφάνιση αιτήσεων επιβλέποντα';
        if (acceptedBtn && acceptedBtn.parentElement) {
            acceptedBtn.parentElement.insertBefore(supBtn, acceptedBtn.nextSibling);
        } else {
            document.body.insertBefore(supBtn, document.body.firstChild);
        }
    }

    supBtn.addEventListener('click', async () => {
        try {
            supBtn.disabled = true;
            supBtn.textContent = 'Φόρτωση...';
            const resp = await fetch('../PHP/kathigitis_aitiseis_epivlepontas.php');
            if (!resp.ok) throw new Error('Network error');
            const data = await resp.json();
            if (data.error) throw new Error(data.error);
            showSupervisorAppsModal(data.applications || [], data.supervisorName || null);
        } catch (err) {
            console.error(err);
            alert('Σφάλμα: ' + (err.message || 'Αποτυχία φόρτωσης'));
        } finally {
            supBtn.disabled = false;
            supBtn.textContent = 'Εμφάνιση αιτήσεων επιβλέποντα';
        }
    });
});

async function loadApplications() {
    const container = document.getElementById('pending-applications');
    try {
        const response = await fetch('../PHP/kathigitis_aitiseis.php');
        if (!response.ok) {
            container.innerHTML = '<p class="no-pending-message">Δεν υπάρχουν εκκρεμείς αιτήσεις</p>';
            return;
        }
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        window.applicationsData = data.applications || [];

        renderPendingApplications();
        renderAcceptedDropdown();
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p class="no-pending-message">Δεν υπάρχουν εκκρεμείς αιτήσεις</p>';
    }
}

function renderPendingApplications() {
    const container = document.getElementById('pending-applications');
    if (!container) return;

    const pendingApps = (window.applicationsData || []).filter(app => app.katastasi === 'Pending');

    if (!pendingApps.length) {
        container.innerHTML = '<p class="no-pending-message">Δεν υπάρχουν εκκρεμείς αιτήσεις</p>';
        return;
    }

    container.innerHTML = '';
    const header = document.createElement('h2');
    header.textContent = 'Εκκρεμείς αιτήσεις';
    container.appendChild(header);

    pendingApps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'application-card pending-card';
        card.dataset.id = app.diplomatiki;
        card.innerHTML = `
            <div class="application-info">
                <p>Όνομα φοιτητή: <span>${app.foititis || '-'}</span></p>
                <p>Κωδικός διπλωματικής: <span>${app.diplomatiki || '-'}</span></p>
                <div class="status-control">
                    <select class="status-select" data-id="${app.diplomatiki}">
                        <option value="Pending" selected disabled>Pending</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <button class="save-btn" data-id="${app.diplomatiki}">Αποθήκευση</button>
                </div>
                <p>Ημερομηνία πρόσκλησης: <span>${formatDate(app.imerominia_prosklisis)}</span></p>
            </div>
        `;
        container.appendChild(card);
    });

    container.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', handleStatusUpdate);
    });
}

function renderAcceptedDropdown() {
    const dropdown = document.getElementById('accepted-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">-- Επιλέξτε αποδεκτή αίτηση --</option>';

    const acceptedApps = (window.applicationsData || []).filter(app => app.katastasi === 'Accepted');
    acceptedApps.forEach(app => {
        const option = document.createElement('option');
        option.value = app.diplomatiki;
        option.textContent = `${app.foititis || 'Unknown'} (${app.diplomatiki || '-'}) - ${formatDate(app.imerominia_apantisis)}`;
        dropdown.appendChild(option);
    });

    dropdown.onchange = showAcceptedDetails;
}

function handleStatusUpdate(event) {
    const id = event.target.dataset.id;
    const select = document.querySelector(`.status-select[data-id="${id}"]`);
    const status = select ? select.value : null;
    if (!id || !status) return;

    event.target.disabled = true;
    event.target.textContent = 'Αποθήκευση...';

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

    fetch('../PHP/update_status.php', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-Token': csrfToken
        },
        body: `thesisId=${encodeURIComponent(id)}&status=${encodeURIComponent(status)}`
    })
    .then(async response => {
        if (response.status === 403) {
            throw new Error('Δεν έχετε δικαίωμα να αλλάξετε αυτή την κατάσταση');
        }
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Server error');
        }
        return data;
    })
    .then(data => {
        if (data.success) {
            alert('Η κατάσταση ενημερώθηκε επιτυχώς!');
            loadApplications();
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Σφάλμα: ' + err.message);
    })
    .finally(() => {
        event.target.disabled = false;
        event.target.textContent = 'Αποθήκευση';
    });
}

function showAcceptedDetails(event) {
    const selectedId = event.target.value;
    const detailsContainer = document.getElementById('accepted-details');
    if (!detailsContainer) return;

    if (!selectedId) {
        detailsContainer.innerHTML = '';
        return;
    }

    const selectedApp = (window.applicationsData || []).find(app => String(app.diplomatiki) === String(selectedId));
    if (selectedApp) {
        const supervisorName = (selectedApp.epiv_onoma && selectedApp.epiv_eponimo)
            ? `${selectedApp.epiv_onoma} ${selectedApp.epiv_eponimo}`
            : (selectedApp.epivlepontas || '-');

        const studentName = (selectedApp.foititis_onoma && selectedApp.foititis_eponimo)
            ? `${selectedApp.foititis_onoma} ${selectedApp.foititis_eponimo}`
            : (selectedApp.foititis || '-');

        detailsContainer.innerHTML = `
            <div class="application-info">
                <h3>Λεπτομέρειες αποδεκτής αίτησης</h3>
                <p>Φοιτητής: <span>${studentName}</span></p>
                <p>Επιβλέποντας: <span>${supervisorName}</span></p>
                <p>Κωδικός διπλωματικής: <span>${selectedApp.diplomatiki || '-'}</span></p>
                <p>Ημερομηνία πρόσκλησης: <span>${formatDate(selectedApp.imerominia_prosklisis)}</span></p>
                <p>Ημερομηνία αποδοχής: <span>${formatDate(selectedApp.imerominia_apantisis)}</span></p>
            </div>
        `;
    }
}

function toggleAcceptedView() {
    const section = document.getElementById('accepted-section');
    const button = document.getElementById('show-accepted-btn');
    if (!section || !button) return;

    if (!section.style.display || section.style.display === 'none') {
        section.style.display = 'block';
        button.textContent = 'Απόκρυψη αποδεκτών αιτήσεων';
    } else {
        section.style.display = 'none';
        button.textContent = 'Εμφάνιση αποδεκτών αιτήσεων';
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
}

function showSupervisorAppsModal(apps, supervisorName) {
    const existing = document.getElementById('supervisor-apps-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'supervisor-apps-modal';
    overlay.className = 'modal-overlay';

    const modalBox = document.createElement('div');
    modalBox.className = 'modal-box';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h3');
    title.textContent = `Αιτήσεις για επιβλέποντα${supervisorName ? `: ${supervisorName}` : ''}`;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Κλείσιμο');
    header.appendChild(closeBtn);

    modalBox.appendChild(header);

    const content = document.createElement('div');

    if (apps.length === 0) {
        content.innerHTML = '<p>Δεν βρέθηκαν αιτήσεις</p>';
    } else {
        const table = document.createElement('table');
        table.className = 'modal-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Κωδικός Διπλωματικής</th>
                <th>Φοιτητής</th>
                <th>Καθηγητής</th>
                <th>Κατάσταση</th>
                <th>Ημερομηνία Πρόσκλησης</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        apps.forEach(a => {
            const studentName = (a.foititis_onoma && a.foititis_eponimo)
                ? `${a.foititis_onoma} ${a.foititis_eponimo}`
                : (a.foititis || '-');

            const professorName = (a.kath_onoma && a.kath_eponimo)
                ? `${a.kath_onoma} ${a.kath_eponimo}`
                : (a.kathigitis || '-');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${a.diplomatiki || '-'}</td>
                <td>${studentName}</td>
                <td>${professorName}</td>
                <td>${a.katastasi || '-'}</td>
                <td>${formatDate(a.imerominia_prosklisis)}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        content.appendChild(table);
    }

    modalBox.appendChild(content);
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', ev => {
        if (ev.target === overlay) overlay.remove();
    });
}