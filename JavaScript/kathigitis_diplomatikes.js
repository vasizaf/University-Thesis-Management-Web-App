document.addEventListener('DOMContentLoaded', () => {
  fetch('../PHP/kathigitisdiplomatikes.php?filter=epivlepontas')
    .then(async r => {
      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('API error: Response is not valid JSON', text);
        document.body.insertAdjacentHTML('afterbegin', `<div style="color:#a00;background:#fff;padding:12px;border:2px solid #a00;z-index:9999;position:fixed;top:0;left:0;width:100%;">Σφάλμα API: Η απάντηση δεν είναι έγκυρο JSON.<br><pre style="white-space:pre-wrap">${text.replace(/</g,'&lt;')}</pre></div>`);
        throw e;
      }
    })
    .then(data => {
      const loggedUserRole = data.userInfo?.role;
      const currentUsername = data.userInfo?.username || null;

      if (!loggedUserRole) {
        console.error('No user role found in API response');
        return;
      }

      Promise.all([
        Promise.all([
          fetch('../PHP/kathigitisdiplomatikes.php?filter=noumero1').then(async r => {
            const text = await r.text();
            try { return JSON.parse(text); } catch (e) {
              console.error('API error: noumero1 not valid JSON', text);
              document.body.insertAdjacentHTML('afterbegin', `<div style="color:#a00;background:#fff;padding:12px;border:2px solid #a00;z-index:9999;position:fixed;top:0;left:0;width:100%;">Σφάλμα API: Η απάντηση noumero1 δεν είναι έγκυρο JSON.<br><pre style="white-space:pre-wrap">${text.replace(/</g,'&lt;')}</pre></div>`);
              throw e;
            }
          }),
          fetch('../PHP/kathigitisdiplomatikes.php?filter=noumero2').then(async r => {
            const text = await r.text();
            try { return JSON.parse(text); } catch (e) {
              console.error('API error: noumero2 not valid JSON', text);
              document.body.insertAdjacentHTML('afterbegin', `<div style="color:#a00;background:#fff;padding:12px;border:2px solid #a00;z-index:9999;position:fixed;top:0;left:0;width:100%;">Σφάλμα API: Η απάντηση noumero2 δεν είναι έγκυρο JSON.<br><pre style="white-space:pre-wrap">${text.replace(/</g,'&lt;')}</pre></div>`);
              throw e;
            }
          })
        ]).then(([noumero1Res, noumero2Res]) => ({
          diplomatikes: [...(noumero1Res.diplomatikes || []), ...(noumero2Res.diplomatikes || [])]
        })),
        data
      ])
      .then(([committeeData, supervisorData]) => {
        const processTheses = (theses, status) => (theses||[]).filter(t => t.status_diplomatiki === status);

        //populate gia na exoume osa dropdowns osa kai oi diplomatikes, simantiko gia na einai dynamic
        populateTheses('pending-trimelis', processTheses(committeeData.diplomatikes || [], 'Accepted'), loggedUserRole, false, currentUsername);
        populateTheses('active-trimelis', processTheses(committeeData.diplomatikes || [], 'Finished'), loggedUserRole, true, currentUsername);
        populateTheses('pending-epivlepontas', processTheses(supervisorData.diplomatikes || [], 'Accepted'), loggedUserRole, false, currentUsername);
        populateTheses('active-epivlepontas', processTheses(supervisorData.diplomatikes || [], 'Finished'), loggedUserRole, true, currentUsername);

        //epeidi ta canceled theses einai se diaforetiko table kanoume fetch apo allo arxeio
        fetch('../PHP/get_canceled_theses.php', { credentials: 'same-origin' })
          .then(async r => {
            if (!r.ok) throw new Error('get_canceled_theses.php error ' + r.status);
            const text = await r.text();
            try { return JSON.parse(text); } catch (e) {
              console.error('API error: get_canceled_theses.php not valid JSON', text);
              document.body.insertAdjacentHTML('afterbegin', `<div style="color:#a00;background:#fff;padding:12px;border:2px solid #a00;z-index:9999;position:fixed;top:0;left:0;width:100%;">Σφάλμα API: Η απάντηση get_canceled_theses.php δεν είναι έγκυρο JSON.<br><pre style="white-space:pre-wrap">${text.replace(/</g,'&lt;')}</pre></div>`);
              throw e;
            }
          })
          .then(data => {
            const canceled = data?.canceled || [];
            populateCanceledTheses('kanoniko_rejected-theses-container', canceled, currentUsername);
          })
          .catch(err => console.error('Failed to load canceled_theses:', err));

        populateTheses('exam-epivlepontas', processTheses(supervisorData.diplomatikes || [], 'Under exam'), loggedUserRole, true, currentUsername);
        populateTheses('exam-trimelis', processTheses(committeeData.diplomatikes || [], 'Under exam'), loggedUserRole, true, currentUsername);
        populateTheses('does-epivlepontas', processTheses(supervisorData.diplomatikes || [], 'Does not meet requirements'), loggedUserRole, true, currentUsername);
        populateTheses('does-trimelis', processTheses(committeeData.diplomatikes || [], 'Does not meet requirements'), loggedUserRole, true, currentUsername);
      })
      .catch(err => console.error('Fetch error:', err));
    });
});

//gia ta dropdowns
document.querySelectorAll('.dropdown-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const cont = this.nextElementSibling;
    if (!cont) return;

    const isOpening = cont.style.display !== 'block';
    cont.style.display = isOpening ? 'block' : 'none';

    const icon = this.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-chevron-up');
      icon.classList.toggle('fa-chevron-down');
    }

    //an kleisoume to megalo dropdown tote kleinoun kai ta alla
    if (!isOpening) {
      //kai kleinei mono auta apo ta opoia proilthe
      closeDescendantDropdowns(cont);
    }
  });
});


function closeDescendantDropdowns(root) {
  if (!root) return;

  //na min fainontai ta esoterika ton dropdowns
  root.querySelectorAll('.thesis-details').forEach(d => {
    d.style.display = 'none';
  });

  root.querySelectorAll('.thesis-summary i.fa-chevron-up').forEach(i => {
    i.classList.remove('fa-chevron-up');
    i.classList.add('fa-chevron-down');
  });

  root.querySelectorAll('.dropdown-btn + *').forEach(panel => {
    panel.style.display = 'none';
  });
  
  root.querySelectorAll('.dropdown-btn i.fa-chevron-up').forEach(i => {
    i.classList.remove('fa-chevron-up');
    i.classList.add('fa-chevron-down');
  });
}

//ta functions//



//gia ta canceled theses
function populateCanceledTheses(containerId, canceledRows = [], currentUsername = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found!`);
    return;
  }
  container.innerHTML = canceledRows?.length ? '' : '<p class="no-theses">Δεν βρέθηκαν εγγεγραμμένες ανακλήσεις</p>';
  if (!canceledRows?.length) return;

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  //theloume apologia, arithmo gs kai etos
  canceledRows.forEach(row => {
    const card = document.createElement('div');
    card.className = 'thesis-card';
    card.innerHTML = `
      <div class="thesis-summary">
        <h4>[${esc(row.diplomatiki_id)}] ${esc(row.titlos)}</h4>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="thesis-details" style="display:none">
        <p><strong>Φοιτητής:</strong> ${esc(row.foititis)}</p>
        <p><strong>Καθηγητής:</strong> ${esc(row.kathigitis)}</p>
        <p><strong>Αριθμός GS:</strong> ${esc(row.arithmos_gs)}</p>
        <p><strong>Έτος:</strong> ${esc(row.etos)}</p>
        <p><strong>Απολογία:</strong></p>
        <div class="apologia-block"><pre style="white-space:pre-wrap">${esc(row.apologia)}</pre></div>
      </div>
    `;
    const summary = card.querySelector('.thesis-summary');
    if (summary) {
      summary.addEventListener('click', function() {
        const details = this.nextElementSibling;
        if (details) details.style.display = details.style.display === 'none' ? 'block' : 'none';
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-chevron-up');
          icon.classList.toggle('fa-chevron-down');
        }
      });
    }
    container.appendChild(card);
  });
}

//populateTheses
function populateTheses(containerId, theses, userRole = null, showGrades = false, currentUsername = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found!`);
    return;
  }

  container.innerHTML = theses?.length ? '' : '<p class="no-theses">Δεν βρέθηκαν διαθέσιμες διπλωματικές</p>';
  if (!theses?.length) return;

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  //pairnoume tous vathmous ton diplomatikon kai gia to poios tha vazei vathmous
  function getGradeValue(thesisObj, graderKey, index) {
    
    if (graderKey === 'epivlepontas') {
      const k = `ep_grade${index}`;
      if (k in thesisObj) return thesisObj[k];
    } else if (graderKey === 'noumero1') {
      const k = `n1_grade${index}`;
      if (k in thesisObj) return thesisObj[k];
    } else if (graderKey === 'noumero2') {
      const k = `n2_grade${index}`;
      if (k in thesisObj) return thesisObj[k];
    }

    //AUTO EINAI PERITTO, EINAI APO TIN PALIA VASI ALLA EXEI MEINEI
    if (index === 1) {
      if (graderKey === 'epivlepontas' && ('vathmos1' in thesisObj)) return thesisObj.vathmos1;
      if (graderKey === 'noumero1' && ('vathmos2' in thesisObj)) return thesisObj.vathmos2;
      if (graderKey === 'noumero2' && ('vathmos3' in thesisObj)) return thesisObj.vathmos3;
    }
    return null;
  }

  //ta onomata
  const gradeLabels = {
    1: 'Βαθμός εκπλήρωσης στόχων',
    2: 'Χρονικό διάστημα εκπόνησης',
    3: 'Ποιότητα και Πληρότητα του κειμένου',
    4: 'Συνολική εικόνα της παρουσίασης'
  };

  function graderLabel(graderKey) {
    return {
      'epivlepontas': 'Επιβλέπων',
      'noumero1': 'Μέλος Επιτροπής 1',
      'noumero2': 'Μέλος Επιτροπής 2'
    }[graderKey] || graderKey;
  }

  //ipologizoume tous vathmous analoga me vari kai ean den iparxei o vathmos tote einai 0 i null
  function computeGraderTotal(thesisObj, graderKey) {
    let nums = [];
    for (let i = 1; i <= 4; i++) {
      const raw = getGradeValue(thesisObj, graderKey, i);
      const n = (raw === null || raw === '' || typeof raw === 'undefined') ? null : parseFloat(String(raw).replace(',', '.'));
      nums.push(Number.isFinite(n) ? n : null);
    }
    const hasAny = nums.some(n => n !== null);
    if (!hasAny) return null;
    //to missing einai 0
    const g1 = nums[0] || 0;
    const g2 = nums[1] || 0;
    const g3 = nums[2] || 0;
    const g4 = nums[3] || 0;
    const total = (0.60 * g1) + (0.15 * g2) + (0.15 * g3) + (0.10 * g4);
    return Math.round(total * 100) / 100; // 2 decimals
  }

  //extra html gia tous 4 vathmous kathe kathigiti
  function buildGraderSection(thesisObj, graderKey) {
    const items = [];
    for (let i = 1; i <= 4; i++) {
      const val = getGradeValue(thesisObj, graderKey, i);
      const display = (val === null || typeof val === 'undefined' || val === '') ? '–' : esc(val);
      items.push(`
        <div class="grade-item">
          <span class="grade-label">${esc(gradeLabels[i])}</span>:
          <span class="grade-value" data-grader="${esc(graderKey)}" data-grade-index="${i}">${display}</span>
        </div>
      `);
    }

    //gia to TOTAL tis vathmologias
    const total = computeGraderTotal(thesisObj, graderKey);
    const totalDisplay = (total === null ? '–' : total.toFixed(2));

    return `
      <div class="grader-block" data-grader="${esc(graderKey)}">
        <p><strong>${esc(graderLabel(graderKey))}</strong></p>
        <div class="grader-grades">${items.join('')}</div>
        <p class="grader-total" data-grader="${esc(graderKey)}"><strong>Σύνολο αξιολόγησης:</strong> ${esc(totalDisplay)}</p>
      </div>
    `;
  }

  //display olous tous vathmous
  function computeFinalTotal(thesisObj) {
    const gEp = computeGraderTotal(thesisObj, 'epivlepontas') || 0;
    const gN1 = computeGraderTotal(thesisObj, 'noumero1') || 0;
    const gN2 = computeGraderTotal(thesisObj, 'noumero2') || 0;
    const sum = Math.round(((gEp + gN1 + gN2) /3 )* 100) / 100;
    const any = (computeGraderTotal(thesisObj, 'epivlepontas') !== null) ||
                (computeGraderTotal(thesisObj, 'noumero1') !== null) ||
                (computeGraderTotal(thesisObj, 'noumero2') !== null);
    return { sum: any ? sum : null, parts: { ep: gEp, n1: gN1, n2: gN2 } };
  }

  theses.forEach(t => {
    const card = document.createElement('div');
    card.className = 'thesis-card';

    //vriskei poios kathigitis tha mporei na kanei grade
    let userGrader = null;
    if (currentUsername) {
      if (t.epivlepontas === currentUsername) userGrader = 'epivlepontas';
      else if (t.noumero1 === currentUsername) userGrader = 'noumero1';
      else if (t.noumero2 === currentUsername) userGrader = 'noumero2';
    }

    const switchOn = (String(t.switch).toLowerCase() === 'true' || String(t.switch) === '1');
    const canEditUnderExam = !!userGrader && switchOn && t.status_diplomatiki === 'Under exam';

    const showUnderExamBtn = containerId.includes('epivlepontas')
      && t.status_diplomatiki === 'Accepted'
      && currentUsername && t.epivlepontas === currentUsername;

    const showSwitchControl = currentUsername && t.epivlepontas === currentUsername && t.status_diplomatiki == 'Under exam';

    const proxeiroRow = containerId.includes('exam')
      ? `<p><strong>Προχειρο κείμενο εξέτασης:</strong> ${
          t.proxeiro_keimeno 
            ? `<a href="../uploads/proxeiro/${encodeURIComponent(t.proxeiro_keimeno)}" target="_blank">${esc(t.proxeiro_keimeno)}</a>`
            : '–'
        }</p>`
      : '';

    const notesPlaceholderHtml = `<div class="notes-placeholder"></div>`;

    //emfanizei tous vathmous tou
    const gradeHtml = userGrader ? buildGraderSection(t, userGrader)
                                 : (buildGraderSection(t, 'epivlepontas') + buildGraderSection(t, 'noumero1') + buildGraderSection(t, 'noumero2'));

//i teliki html
    const final = computeFinalTotal(t);
    const finalDisplay = final.sum === null ? '–' : final.sum.toFixed(2);

    card.innerHTML = `
      <div class="thesis-summary">
        <h4>[${esc(t.id)}] ${esc(t.titlos)}</h4>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="thesis-details" style="display:none">
        <p><strong>Περιγραφή:</strong> ${esc(t.perigrafi)}</p>
        <p><strong>Αρχείο:</strong> ${esc(t.arxeio_perigrafis) || '–'}</p>
        <p><strong>Σημειώσεις:</strong> ${esc(t.simeiosis) || '–'}</p>
        <p><strong>Κατάσταση:</strong> <span class="status-text">${esc(t.status_diplomatiki)}</span></p>
        <p><strong>Επιβλέπων:</strong> ${esc(t.epivlepontas)}</p>
        <p><strong>Επιτροπή:</strong> ${esc(t.noumero1) || '–'}, ${esc(t.noumero2) || '–'}</p>

        <p><strong>Switch:</strong>
          ${showSwitchControl
            ? `<button class="toggle-switch-btn" data-thesis-id="${esc(t.id)}" data-switch="${esc(t.switch)}">${switchOn ? 'On' : 'Off'}</button>`
            : `<span class="switch-readonly">${switchOn ? 'On' : 'Off'}</span>`
          }
        </p>

        ${proxeiroRow}
        ${notesPlaceholderHtml}

        <div class="grade-display">
          ${gradeHtml}
          <p class="final-total"><strong>Τελικό Σύνολο (3 μελών):</strong> ${esc(finalDisplay)}</p>
        </div>

        ${showUnderExamBtn ? `
          <div class="status-actions">
            <button class="mark-under-exam-btn" data-thesis-id="${t.id}">Mark Under exam</button>
          </div>
        ` : ''}
      </div>
    `;

    //o epivlepontas mporei na kanei edit ta stoixeia tis diplomatiksi ean einai ipo anathesi
    if (containerId.includes('does-epivlepontas')
        && currentUsername && t.epivlepontas === currentUsername
        && t.status_diplomatiki === 'Does not meet requirements') {

      const detailsEl = card.querySelector('.thesis-details');
      if (detailsEl) {
//edit form
        detailsEl.insertAdjacentHTML('beforeend', `
          <hr>
          <div class="epivlepontas-edit">
            <p><strong>Επεξεργασία (μόνο Επιβλέπων):</strong></p>
            <p>
              <label>Τίτλος:<br>
                <input type="text" class="edit-title" style="width:100%" value="${esc(t.titlos)}" />
              </label>
            </p>
            <p>
              <label>Περιγραφή:<br>
                <textarea class="edit-desc" rows="4" style="width:100%">${esc(t.perigrafi)}</textarea>
              </label>
            </p>
            <p>
              <label>Αρχείο (PDF): <input type="file" accept="application/pdf" class="edit-file" /></label>
              <span class="current-file">${t.arxeio_perigrafis ? `<a href="../uploads/${encodeURIComponent(t.arxeio_perigrafis)}" target="_blank">${esc(t.arxeio_perigrafis)}</a>` : '–'}</span>
            </p>
            <p>
              <button class="save-epivlepontas-edit" data-thesis-id="${esc(t.id)}">Αποθήκευση αλλαγών</button>
              <span class="save-status" style="margin-left:8px"></span>
            </p>
          </div>
        `);

        //o handler
        const saveBtn = detailsEl.querySelector('.save-epivlepontas-edit');
        const statusSpan = detailsEl.querySelector('.save-status');
        if (saveBtn) {
          saveBtn.addEventListener('click', async function () {
            const thesisId = this.dataset.thesisId;
            const parent = this.closest('.epivlepontas-edit');
            const titleInput = parent.querySelector('.edit-title');
            const descInput = parent.querySelector('.edit-desc');
            const fileInput = parent.querySelector('.edit-file');

            const newTitle = titleInput ? titleInput.value.trim() : '';
            const newDesc = descInput ? descInput.value.trim() : '';
            const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

            if (!confirm('Θέλετε να αποθηκεύσετε τις αλλαγές;')) return;

//disable kai to UI
            saveBtn.disabled = true;
            const prevText = saveBtn.textContent;
            saveBtn.textContent = 'Αποστολή...';
            if (statusSpan) statusSpan.textContent = '';

//send
            const fd = new FormData();
            fd.append('thesisId', thesisId);
            fd.append('titlos', newTitle);
            fd.append('perigrafi', newDesc);
            if (file) fd.append('arxeio_perigrafis', file);

            try {
              const resp = await fetch('../PHP/update_thesis_fields.php', {
                method: 'POST',
                credentials: 'same-origin',
                body: fd
              });
              const txt = await resp.text();
              let data;
              try { data = JSON.parse(txt); } catch (e) { throw new Error('Invalid server response: ' + txt); }

              if (!data || !data.success) throw new Error(data?.error || 'Αποτυχία αποθήκευσης');


              const summaryH4 = card.querySelector('.thesis-summary h4');
              if (summaryH4) summaryH4.innerHTML = `[${esc(t.id)}] ${esc(newTitle)}`;

              const paras = card.querySelectorAll('.thesis-details > p');
              for (let p of paras) {
                if (p.innerHTML.includes('<strong>Περιγραφή:</strong>')) {
                  p.innerHTML = `<strong>Περιγραφή:</strong> ${esc(newDesc)}`;
                  break;
                }
              }
              //update to file
              for (let p of paras) {
                if (p.innerHTML.includes('<strong>Αρχείο:</strong>')) {
                  const filename = data.newFilename || (t.arxeio_perigrafis || '');
                  p.innerHTML = `<strong>Αρχείο:</strong> ${filename ? `<a href="../uploads/${encodeURIComponent(filename)}" target="_blank">${esc(filename)}</a>` : '–'}`;
                  break;
                }
              }


              const cf = parent.querySelector('.current-file');
              if (cf) {
                const filename = data.newFilename || (t.arxeio_perigrafis || '');
                cf.innerHTML = filename ? `<a href="../uploads/${encodeURIComponent(filename)}" target="_blank">${esc(filename)}</a>` : '–';
              }

//update tous neous titlous kai description
              t.titlos = newTitle;
              t.perigrafi = newDesc;
              if (data.newFilename) t.arxeio_perigrafis = data.newFilename;

              if (statusSpan) statusSpan.style.color = 'green', statusSpan.textContent = 'Αποθηκεύτηκε';
            } catch (err) {
              console.error('Save edit error', err);
              if (statusSpan) statusSpan.style.color = 'crimson', statusSpan.textContent = 'Σφάλμα';
              alert('Σφάλμα αποθήκευσης: ' + (err.message || err));
            } finally {
              saveBtn.disabled = false;
              saveBtn.textContent = prevText;

            }
          });
        }
      }
    }


//announcements gia tis Under exam
if (t.status_diplomatiki === 'Under exam') {
//fetch ean iparxei idi
  fetch('../PHP/check_presentation.php?thesisId=' + encodeURIComponent(t.id), { credentials: 'same-origin' })
          .then(async r => {
            const text = await r.text();
            try { return JSON.parse(text); } catch (e) {
              console.error('API error: check_presentation.php not valid JSON', text);
              document.body.insertAdjacentHTML('afterbegin', `<div style="color:#a00;background:#fff;padding:12px;border:2px solid #a00;z-index:9999;position:fixed;top:0;left:0;width:100%;">Σφάλμα API: Η απάντηση check_presentation.php δεν είναι έγκυρο JSON.<br><pre style="white-space:pre-wrap">${text.replace(/</g,'&lt;')}</pre></div>`);
              throw e;
            }
          })
          .then(info => {
      
      const detailsEl = card.querySelector('.thesis-details');
      if (!detailsEl) return;

      //ftiaxnoume to container
      const presWrap = document.createElement('div');
      presWrap.className = 'presentation-block';
      presWrap.style.marginTop = '8px';
      presWrap.innerHTML = `
        <hr>
        <p><strong>Παρουσίαση (προϋπόθεση συμπλήρωσης από φοιτητή):</strong></p>
        <p><strong>Φοιτητής:</strong> ${esc(info.student || '–')}</p>
      `;

      if (info.exetasi) {
        // show exetasi basics
        let mode = info.exetasi.tropos_exetasis || '–';
        
if (mode === 'Dia Zosis') mode = 'Δια Ζώσης';
else if (mode === 'Diadiktiaka') mode = 'Διαδικτυακά';

const exHtml = `
  <p><strong>Τρόπος:</strong> ${esc(mode)}
   <strong>Αίθουσα:</strong> ${esc(info.exetasi.aithousa || '–')}
   <strong>Ημερομηνία:</strong> ${esc(info.exetasi.imerominia || '–')}
   <strong>Ώρα:</strong> ${esc(info.exetasi.ora || '–')}</p>
`;

        presWrap.insertAdjacentHTML('beforeend', exHtml);
      } else {
        presWrap.insertAdjacentHTML('beforeend', `<p>Δεν υπάρχουν στοιχεία παρουσίασης (exetasi).</p>`);
      }

      //emfanizetai to announcement
      const ann = info.announcement;
      //read-only
      const viewBlock = document.createElement('div');
      viewBlock.className = 'announcement-view';
      viewBlock.style.marginTop = '6px';
      viewBlock.innerHTML = ann ? `<p><strong>Ανακοίνωση:</strong></p><div class="announcement-content"><pre style="white-space:pre-wrap">${esc(ann.content)}</pre></div>` : `<p><em>Δεν υπάρχει αποθηκευμένη ανακοίνωση.</em></p>`;
      presWrap.appendChild(viewBlock);

      //ean eiani epivlepontas tote mporei na kanei edit
      if (info.isSupervisor && info.student && info.exetasi) {
        const editor = document.createElement('div');
        editor.className = 'announcement-editor';
        editor.style.marginTop = '8px';
        editor.innerHTML = `
          <p><strong>Δημιουργία / Επεξεργασία Ανακοίνωσης (μόνο Επιβλέπων):</strong></p>
          <textarea class="announcement-text" rows="6" style="width:100%;box-sizing:border-box;color=black;">${ann ? esc(ann.content) : ''}</textarea>
          <div style="margin-top:6px;">
            <button class="preview-ann-btn">Προεπισκόπηση</button>
            <button class="save-ann-btn" style="margin-left:8px;">Αποθήκευση ανακοίνωσης</button>
          </div>
          <div class="announcement-preview" style="margin-top:8px;display:none;border:1px solid #000000ff;padding:8px;background:#fafafa;color: black;"></div>
        `;
        presWrap.appendChild(editor);

        //proepiskopisi
        editor.querySelector('.preview-ann-btn').addEventListener('click', () => {
          const txt = editor.querySelector('.announcement-text').value;
          const preview = editor.querySelector('.announcement-preview');
          preview.style.display = 'block';
          preview.innerHTML = `<pre style="white-space:pre-wrap">${esc(txt)}</pre>`;
        });

        //save
        editor.querySelector('.save-ann-btn').addEventListener('click', () => {
          const txt = editor.querySelector('.announcement-text').value.trim();
          if (!txt) return alert('Το κείμενο είναι κενό');
          const fd = new FormData();
          fd.append('thesisId', t.id);
          fd.append('content', txt);

          const btn = editor.querySelector('.save-ann-btn');
          btn.disabled = true;
          btn.textContent = 'Αποστολή...';
          fetch('../PHP/save_announcement.php', { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(r => r.json())
            .then(res => {
              if (!res || res.error) throw new Error(res?.error || 'Server error');
              alert('Η ανακοίνωση αποθηκεύτηκε.');
              // update viewBlock
              viewBlock.innerHTML = `<p><strong>Ανακοίνωση:</strong></p><div class="announcement-content"><pre style="white-space:pre-wrap">${esc(txt)}</pre></div>`;
              btn.disabled = false;
              btn.textContent = 'Αποθήκευση ανακοίνωσης';
            })
            .catch(err => {
              console.error('save announcement error', err);
              alert('Αποτυχία αποθήκευσης: ' + (err.message || err));
              btn.disabled = false;
              btn.textContent = 'Αποθήκευση ανακοίνωσης';
            });
        });
      }

      //ean o foititis den exei simplirosei ta stoixeia tote den mporoun na ginoun anakoinoseis
      if (!info.exetasi || !info.student) {
        presWrap.insertAdjacentHTML('beforeend', `<p style="color:#a00"><em>Ο φοιτητής δεν έχει συμπληρώσει τα στοιχεία της παρουσίασης ή δεν είναι ανατεθειμένος.</em></p>`);
      }

      detailsEl.appendChild(presWrap);
    })
    .catch(err => {
      console.error('check_presentation failed', err);
    });
}
    //parakato einai gia na mporoun na kanoun edit
    if (canEditUnderExam && userGrader) {
      const gradeSpans = card.querySelectorAll(`.grade-value[data-grader="${userGrader}"]`);
      gradeSpans.forEach(span => {
        const gradeIndex = span.getAttribute('data-grade-index');
        //edit button dipla apo tous vathmous
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-grade-btn';
        editBtn.setAttribute('data-grader', userGrader);
        editBtn.setAttribute('data-grade-index', gradeIndex);
        editBtn.setAttribute('data-thesis-id', t.id);
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.style.marginLeft = '6px';
        span.insertAdjacentElement('afterend', editBtn);

        editBtn.addEventListener('click', function() {
          if (!((String(t.switch).toLowerCase() === 'true' || String(t.switch) === '1') && t.status_diplomatiki === 'Under exam')) {
            alert('Δεν επιτρέπεται η επεξεργασία — το switch πρέπει να είναι ενεργό και η κατάσταση "Under exam".');
            return;
          }

          const grader = this.dataset.grader;
          const gIndex = this.dataset.gradeIndex;
          const thesisId = this.dataset.thesisId;

          
          const targetSpan = card.querySelector(`.grade-value[data-grader="${grader}"][data-grade-index="${gIndex}"]`);
          if (!targetSpan) return;
          const currentGrade = (targetSpan.textContent === '–') ? '' : targetSpan.textContent;

          //SIMANTIKO: pollaplasia tou 0.5 mexri to 10
          targetSpan.innerHTML = `
            <select class="edit-grade-select">
              ${Array.from({length: 21}, (_, i) =>
                `<option value="${i*0.5}" ${currentGrade == (i*0.5) ? 'selected' : ''}>${i*0.5}</option>`
              ).join('')}
            </select>
          `;
          this.style.display = 'none';

          //confirm i cancel
          const confirmBtn = document.createElement('button');
          confirmBtn.className = 'confirm-edit-btn';
          confirmBtn.setAttribute('data-thesis-id', thesisId);
          confirmBtn.setAttribute('data-grader', grader);
          confirmBtn.setAttribute('data-grade-index', gIndex);
          confirmBtn.innerHTML = '<i class="fas fa-check"></i>';
          confirmBtn.style.marginLeft = '6px';

          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'cancel-edit-btn';
          cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
          cancelBtn.style.marginLeft = '6px';

          targetSpan.insertAdjacentElement('afterend', confirmBtn);
          confirmBtn.insertAdjacentElement('afterend', cancelBtn);

          confirmBtn.addEventListener('click', function() {
            const sel = card.querySelector('.edit-grade-select');
            const newGrade = sel ? sel.value : null;
            const gradeFieldName = `${grader}_grade${gIndex}`; // e.g. epivlepontas_grade1
            updateGrade(thesisId, gradeFieldName, newGrade, this);
          });

          cancelBtn.addEventListener('click', function() {
            targetSpan.textContent = currentGrade || '–';
            editBtn.style.display = 'inline-block';
            confirmBtn.remove();
            cancelBtn.remove();
          });
        });
      });
    }

    //summary
    const summary = card.querySelector('.thesis-summary');
    if (summary) {
      summary.addEventListener('click', function() {
        const details = this.nextElementSibling;
        if (details) details.style.display = details.style.display === 'none' ? 'block' : 'none';
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-chevron-up');
          icon.classList.toggle('fa-chevron-down');
        }
      });
    }

    // Mark Under Exam koumpi
    const underBtn = card.querySelector('.mark-under-exam-btn');
    if (underBtn) {
      underBtn.addEventListener('click', async function() {
        const thesisId = this.dataset.thesisId;
        if (!confirm('Θέλετε να αλλάξετε την κατάσταση σε "Under exam";')) return;
        const btn = this;
        btn.disabled = true;
        const prevText = btn.textContent;
        btn.textContent = 'Αποστολή...';

        try {
          const resp = await fetch('../PHP/update-thesis.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({ id: thesisId, status_diplomatiki: 'Under exam' })
          });
          const data = await resp.json();
          if (!resp.ok || data.error) throw new Error(data.error || 'Server error');

          const statusEl = card.querySelector('.status-text');
          if (statusEl) statusEl.textContent = 'Under exam';
          btn.textContent = 'Ολοκληρώθηκε';
          btn.disabled = true;
        } catch (err) {
          console.error(err);
          alert('Σφάλμα: ' + (err.message || 'Αποτυχία ενημέρωσης'));
          btn.textContent = prevText;
          btn.disabled = false;
        }
      });
    }

    //SIMANTIKO: to switch button gia na mporoun na mpainoun vathmologies
    const toggleBtn = card.querySelector('.toggle-switch-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', async function() {
        const thesisId = this.dataset.thesisId;
        const current = (this.dataset.switch === 'True' || this.dataset.switch === '1' || String(this.dataset.switch).toLowerCase() === 'true') ? 'True' : 'False';
        const newVal = current === 'True' ? 'False' : 'True';

        if (!confirm(`Θέλετε να θέσετε το switch σε "${newVal}" ;`)) return;

        const btn = this;
        btn.disabled = true;
        const prevTxt = btn.textContent;
        btn.textContent = 'Αποστολή...';

        try {
          const resp = await fetch('../PHP/update_switch.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({ thesisId, switchValue: newVal })
          });
          const data = await resp.json();
          if (!resp.ok || data.error) throw new Error(data.error || 'Server error');

          location.reload();
        } catch (err) {
          console.error(err);
          alert('Σφάλμα: ' + (err.message || 'Αποτυχία ενημέρωσης'));
          btn.textContent = prevTxt;
          btn.disabled = false;
        }
      });
    }

    //gia na emfanizontai oi simeioseis
    if (t.status_diplomatiki === 'Accepted') {
      fetch('../PHP/get_notes.php?thesisId=' + encodeURIComponent(t.id), { credentials: 'same-origin' })
        .then(async resp => {
          if (!resp.ok) throw new Error('get_notes endpoint returned ' + resp.status);
          const text = await resp.text();
          try { return JSON.parse(text); } catch (e) {
            console.error('API error: get_notes.php not valid JSON', text);
            document.body.insertAdjacentHTML('afterbegin', `<div style="color:#a00;background:#fff;padding:12px;border:2px solid #a00;z-index:9999;position:fixed;top:0;left:0;width:100%;">Σφάλμα API: Η απάντηση get_notes.php δεν είναι έγκυρο JSON.<br><pre style="white-space:pre-wrap">${text.replace(/</g,'&lt;')}</pre></div>`);
            throw e;
          }
        })
        .then(data => {
          if (!data || !data.allowed) return;
          const placeholder = card.querySelector('.notes-placeholder');
          if (!placeholder) return;
          Object.entries(data.fields || {}).forEach(([fieldName, filename]) => {
            placeholder.insertAdjacentHTML('beforeend', buildNotesRow(fieldName, filename));
          });
          placeholder.querySelectorAll('.upload-notes-btn').forEach(btn => {
            const field = btn.dataset.field;
            const input = placeholder.querySelector('.upload-notes-input[data-field="' + field + '"]') ||
                          placeholder.querySelector('.upload-notes-input');
            btn.addEventListener('click', () => {
              const file = input && input.files && input.files[0];
              if (!file) return alert('Επιλέξτε αρχείο πρώτα!');
              const fd = new FormData();
              fd.append('file', file);
              fd.append('thesisId', t.id);
              fd.append('field', field);
              fetch('../PHP/upload_notes.php', { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(upResp => upResp.json())
                .then(upData => {
                  if (!upData || upData.error) throw new Error(upData?.error || 'Upload failed');
                  alert('Οι σημειώσεις ανέβηκαν!');
                  location.reload();
                })
                .catch(err => {
                  console.error('upload error', err);
                  alert('Αποτυχία: ' + (err.message || err));
                });
            });
          });
        })
        .catch(err => {
          console.error('get_notes error', err);
        });
    }

    container.appendChild(card);
  });
}

//emfanizontai oi simeioseis tou kathe kathigiti
function buildNotesRow(field, filename) {
  const currentFile = filename ? `<a href="../uploads/notes/${encodeURIComponent(filename)}" target="_blank">${filename}</a>` : '–';
  const label = field === 'simeioseis_epivlepontas' ? 'Σημειώσεις Επιβλέποντα'
              : field === 'simeioseis_noumero1' ? 'Σημειώσεις Μέλους 1'
              : field === 'simeioseis_noumero2' ? 'Σημειώσεις Μέλους 2'
              : field;
  return `
    <div class="notes-row">
      <p><strong>${label}:</strong> ${currentFile}</p>
      <div class="notes-upload-controls">
        <input type="file" class="upload-notes-input" data-field="${field}" />
        <button class="upload-notes-btn" data-field="${field}">Ανέβασμα</button>
      </div>
    </div>
  `;
}

//update grade
function updateGrade(thesisId, gradeField, grade, button) {
  if (!button) {
    console.error('updateGrade called without button');
    return;
  }

  const prevHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  let gradeVal = (typeof grade !== 'undefined' && grade !== null) ? String(grade) : null;
  if (!gradeVal) {
    const sel = button.parentElement.querySelector('.edit-grade-select, .grade-select');
    if (sel) gradeVal = sel.value;
  }

  //to 1.5 paramenei 1.5, paliotera eixe thema me ta decimals
  if (gradeVal !== null) {
    gradeVal = String(gradeVal).replace(',', '.');
    const gNum = parseFloat(gradeVal);
    if (!isNaN(gNum)) {
      gradeVal = (gNum % 1 === 0) ? String(Math.round(gNum)) : gNum.toFixed(1);
    } else {
      gradeVal = '';
    }
  } else {
    gradeVal = '';
  }

  //fetch 
  fetch('../PHP/update_grade.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ thesisId, gradeField, grade: gradeVal })
  })
  .then(async r => {
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      // make the error informative (and restore UI below)
      throw new Error('Server returned non-JSON response: ' + text);
    }
  })
  .then(data => {
    if (!data || !data.success) {
      throw new Error(data?.error || 'Αποτυχία ενημέρωσης (no success flag)');
    }

    //update ton neo vathmo 
    const card = button.closest('.thesis-card');
    const grader = button.dataset?.grader || (gradeField ? gradeField.split('_')[0] : null);
    const gIndex = button.dataset?.gradeIndex || (gradeField ? gradeField.match(/\d+$/)?.[0] : null);

    
    const targetSpan = card && grader && gIndex
      ? card.querySelector(`.grade-value[data-grader="${grader}"][data-grade-index="${gIndex}"]`)
      : null;
    if (targetSpan) {
      targetSpan.textContent = gradeVal || '–';
    }

    //svinei ta confirm/select pou ipirxan kata tin diarkeia tou edit
    const select = card && card.querySelector('.edit-grade-select');
    if (select) {
      const parent = select.parentElement;
      if (parent && targetSpan) parent.innerHTML = targetSpan.textContent;
      else if (parent) parent.remove();
    }
    const cancelBtn = card && card.querySelector('.cancel-edit-btn');
    if (cancelBtn) cancelBtn.remove();


    try { button.remove(); } catch (e) { /* ignore */ }

    //emfanizeteai pali to edit koumpi
    const editBtn = card && grader && gIndex
      ? card.querySelector(`.edit-grade-btn[data-grader="${grader}"][data-grade-index="${gIndex}"]`)
      : null;
    if (editBtn) editBtn.style.display = 'inline-block';

    //xanaipologizei ta grades
    function parseNumber(txt) {
      if (!txt || txt.trim() === '–') return null;
      const n = parseFloat(String(txt).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    function computeGraderFromCard(cardEl, graderKey) {
      const nums = [];
      for (let i = 1; i <= 4; i++) {
        const s = cardEl.querySelector(`.grade-value[data-grader="${graderKey}"][data-grade-index="${i}"]`);
        nums.push(parseNumber(s ? s.textContent : null));
      }
      if (nums.every(n => n === null)) return null;
      const g1 = nums[0] || 0;
      const g2 = nums[1] || 0;
      const g3 = nums[2] || 0;
      const g4 = nums[3] || 0;
      return Math.round(((0.60*g1) + (0.15*g2) + (0.15*g3) + (0.10*g4)) * 100) / 100;
    }

    ['epivlepontas','noumero1','noumero2'].forEach(gk => {
      const tot = computeGraderFromCard(card, gk);
      const totEl = card.querySelector(`.grader-total[data-grader="${gk}"]`);
      if (totEl) {
        totEl.innerHTML = `<strong>Σύνολο αξιολόγησης:</strong> ${tot === null ? '–' : tot.toFixed(2)}`;
      }
    });

    //o telikos vathmos (ton 12 vathmon)
    //SIMANTIKO: to /3 pou ginetai giati pairnei tous 3 total vathmous ton kathigiton
    const ep = computeGraderFromCard(card, 'epivlepontas');
    const n1 = computeGraderFromCard(card, 'noumero1');
    const n2 = computeGraderFromCard(card, 'noumero2');
    const any = (ep !== null) || (n1 !== null) || (n2 !== null);
    const finalSum = any ? Math.round((( (ep||0) + (n1||0) + (n2||0) ) / 3) * 100) / 100 : null;
    const finalEl = card.querySelector('.final-total');
    if (finalEl) finalEl.innerHTML = `<strong>Τελικό Σύνολο (3 μελών):</strong> ${finalSum === null ? '–' : finalSum.toFixed(2)}`;

//emfanizetai minima oti egine update o vathmos
  })
  .catch(err => {
    console.error('updateGrade error:', err);
    alert('Σφάλμα ενημέρωσης βαθμού: ' + err.message);

    
    try {
      button.disabled = false;
      button.innerHTML = prevHtml || '<i class="fas fa-check"></i>';
    } catch (e) {
      // if original button was removed, show the edit button so user can retry
      const card = document.querySelector('.thesis-card');
      if (card) {
        const anyEdit = card.querySelector('.edit-grade-btn');
        if (anyEdit) anyEdit.style.display = 'inline-block';
      }
    }
  });
}