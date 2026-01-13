document.addEventListener("DOMContentLoaded", () => {
  const endpoint = "../PHP/get_praktiko.php";

  function qAll(selector) {
    try { return Array.from(document.querySelectorAll(selector)); }
    catch(e) { return []; }
  }

  function setAll(selector, text) {
    const nodes = qAll(selector);
    if (!nodes.length) return false;
    nodes.forEach(n => n.textContent = text == null ? '' : String(text));
    return true;
  }

  function setAllByIdValue(idValue, text) {
    const nodes = qAll(`[id="${idValue}"]`);
    if (!nodes.length) return false;
    nodes.forEach(n => n.textContent = text == null ? '' : String(text));
    return true;
  }

  fetch(endpoint, { credentials: 'same-origin' })
    .then(async res => {
      if (!res.ok) {
        const t = await res.text().catch(()=>'');
        let parsed = null;
        try { parsed = JSON.parse(t); } catch(e) { parsed = null; }
        throw new Error(parsed?.error || `HTTP ${res.status}: ${t}`);
      }
      return res.json();
    })
    .then(json => {
      if (!json.success) throw new Error(json.error || 'server error');
      const d = json.data;

      setAllByIdValue('student', d.student_fullname || '');

      setAll('#titlos, [id="titlos"], .quote-title .field', d.titlos || '');

      setAll('#aithousa, [id="aithousa"]', d.aithousa || '');
      setAll('#imerominia, [id="imerominia"]', d.imerominia || '');
      setAll('#ora, [id="ora"]', d.ora || '');

      setAll('#gs_anathesi, [id="gs_anathesi"]', d.gs_anathesi ?? '');

      setAll('#avg_total, [id="avg_total"]', d.avg_total !== null ? d.avg_total : '');

      const epName = d.epivlepontas?.fullname || '';
      const epProf = d.epivlepontas?.profession || '';
      setAll('#epivlepontas_name, [id="epivlepontas_name"]', epName);
      setAll('.k1, [class~="k1"]', epName);

      const members = [
        { fullname: d.epivlepontas?.fullname || '', profession: d.epivlepontas?.profession || '' },
        { fullname: d.noumero1?.fullname || '', profession: d.noumero1?.profession || '' },
        { fullname: d.noumero2?.fullname || '', profession: d.noumero2?.profession || '' }
      ];

      setAll('.k1', members[0].fullname);
      setAll('.k2', members[1].fullname);
      setAll('.k3', members[2].fullname);

      // Prepare alphabetical (by surname) sorted array
      const sorted = members
        .map(m => ({ fullname: m.fullname || '', profession: m.profession || '' }))
        .filter(m => m.fullname && m.fullname.trim() !== '')
        .sort((a,b) => {
          const sa = a.fullname.trim().split(/\s+/).pop();
          const sb = b.fullname.trim().split(/\s+/).pop();
          return sa.localeCompare(sb, 'el', { sensitivity: 'base' });
        });

      // Fill list fields (alphabetical by surname)
      const voteEls = qAll('.vote-list .vote-item .field');
      for (let i = 0; i < voteEls.length; i++) {
        voteEls[i].textContent = sorted[i] ? sorted[i].fullname : '';
      }

      // Grade-table
      const rows = qAll('.grade-table tbody tr');
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const tds = row.querySelectorAll('td');
        const mem = sorted[i] || { fullname: '', profession: '' };
        // if the first td currently contains "1." we replace it with "1. Name"
        if (tds[0]) tds[0].textContent = `${i+1}. ${mem.fullname}`;
        if (tds[1]) tds[1].textContent = mem.profession;
      }

      window.noumero1Fullname = members[1].fullname;
      window.noumero1Profession = members[1].profession;

      console.log('Praktiko loaded, members:', members, 'sorted:', sorted);
    })
    .catch(err => {
      console.error('Fetch error:', err);
      const m = document.createElement('div');
      m.style.color = '#a00';
      m.textContent = 'Σφάλμα φόρτωσης δεδομένων: ' + (err.message || err);
      document.body.prepend(m);
    });
});