document.addEventListener('DOMContentLoaded', () => {
  const minDateEl = document.getElementById('minDate');
  const maxDateEl = document.getElementById('maxDate');
  const authorSelect = document.getElementById('authorSelect');
  const searchBtn = document.getElementById('searchBtn');
  const container = document.getElementById('announcementsContainer');

  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const downloadXmlBtn = document.getElementById('downloadXmlBtn');

  // Keep current query + results for download
  let lastParams = {};
  let lastData = [];

  // Utility: escape for HTML injection safety (used in rendering)
  function escHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Utility: escape for XML content
  function escXml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function renderAnnouncements(data) {
    container.innerHTML = ''; // clear
    populateAuthors(data);

    // For each announcement create a dropdown-btn and a content div (collapsed)
    data.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'dropdown-btn';
      const studentName = (a.student_onoma && a.student_epwnymo) ? `${a.student_onoma} ${a.student_epwnymo}` : '';
      const title = a.titlos ? `${studentName} — ${a.titlos}` : `${studentName} — ${a.diplomatiki_id}`;
      btn.innerHTML = `${escHtml(title)} <i class="fas fa-chevron-down"></i>`;

      const details = document.createElement('div');
      details.className = 'dropdown-content';
      details.style.display = 'none';
      details.innerHTML = `
        <p><strong>Τελευταία ενημέρωση:</strong> ${escHtml(a.updated_at || '')}</p>
        <div class="announcement-content"><pre style="white-space:pre-wrap; margin:0;">${escHtml(a.content || '')}</pre></div>
      `;

      btn.addEventListener('click', () => {
        const now = details.style.display === 'none' ? 'block' : 'none';
        details.style.display = now;
        const icon = btn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-chevron-down', now === 'none');
          icon.classList.toggle('fa-chevron-up', now === 'block');
        }
      });

      container.appendChild(btn);
      container.appendChild(details);
    });
  }

  function populateAuthors(data) {
    const authors = Array.from(new Set(data.map(x => x.author).filter(Boolean)));
    // remember current selection to preserve after repopulation
    const prev = authorSelect.value || '';
    authorSelect.innerHTML = '<option value="">Όλοι</option>';
    authors.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      authorSelect.appendChild(opt);
    });
    if (prev) authorSelect.value = prev;
  }

  function buildParams() {
    const p = {};
    if (minDateEl && minDateEl.value) p.min_date = minDateEl.value;
    if (maxDateEl && maxDateEl.value) p.max_date = maxDateEl.value;
    if (authorSelect && authorSelect.value) p.author = authorSelect.value;
    return p;
  }

  async function fetchAnnouncements(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `../PHP/get_announcements.php${query ? '?' + query : ''}`;
    const resp = await fetch(url, { credentials: 'same-origin' });
    if (!resp.ok) throw new Error('Server returned ' + resp.status);
    const json = await resp.json();
    // Normalize to array of announcements with only required fields
    return (Array.isArray(json) ? json : []).map(r => ({
      diplomatiki_id: r.diplomatiki_id ?? r.diplomatiki_id,
      author: r.author ?? '',
      content: r.content ?? '',
      updated_at: r.updated_at ?? r.updated_at,
      titlos: r.titlos ?? '',
      student_onoma: r.student_onoma ?? '',
      student_epwnymo: r.student_epwnymo ?? ''
    }));
  }

  async function loadAnnouncements(params = {}) {
    try {
      container.innerHTML = '<p>Φόρτωση ανακοινώσεων…</p>';
      const data = await fetchAnnouncements(params);
      lastParams = params;
      lastData = data;
      renderAnnouncements(data);
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Σφάλμα φόρτωσης: ${escHtml(err.message)}</p>`;
      console.error('loadAnnouncements error', err);
    }
  }

  // Download helpers
  function downloadBlob(filename, content, mime) {
    const blob = new Blob([content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleDownloadJSON() {
    const data = (lastData || []).map(a => ({
      diplomatiki_id: a.diplomatiki_id,
      author: a.author,
      content: a.content,
      updated_at: a.updated_at
    }));
    const filename = `announcements_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json');
  }

  function jsonToXml(data) {
    let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
    xml += '<announcements>\n';
    data.forEach(a => {
      xml += '  <announcement>\n';
      xml += `    <diplomatiki_id>${escXml(a.diplomatiki_id ?? '')}</diplomatiki_id>\n`;
      xml += `    <author>${escXml(a.author ?? '')}</author>\n`;
      xml += `    <content>${escXml(a.content ?? '')}</content>\n`;
      xml += `    <updated_at>${escXml(a.updated_at ?? '')}</updated_at>\n`;
      xml += '  </announcement>\n';
    });
    xml += '</announcements>\n';
    return xml;
  }

  function handleDownloadXML() {
    const data = (lastData || []).map(a => ({
      diplomatiki_id: a.diplomatiki_id,
      author: a.author,
      content: a.content,
      updated_at: a.updated_at
    }));
    const xml = jsonToXml(data);
    const filename = `announcements_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.xml`;
    downloadBlob(filename, xml, 'application/xml');
  }

  searchBtn && searchBtn.addEventListener('click', () => {
    const p = buildParams();
    loadAnnouncements(p);
  });

  downloadJsonBtn && downloadJsonBtn.addEventListener('click', () => {
    if (!lastData || !lastData.length) return alert('Δεν υπάρχουν αποτελέσματα προς λήψη.');
    handleDownloadJSON();
  });

  downloadXmlBtn && downloadXmlBtn.addEventListener('click', () => {
    if (!lastData || !lastData.length) return alert('Δεν υπάρχουν αποτελέσματα προς λήψη.');
    handleDownloadXML();
  });

  // initial load: fetch all announcements (no filters)
  loadAnnouncements({});
});
