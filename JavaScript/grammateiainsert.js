document.addEventListener("DOMContentLoaded", () => {
  const showManualBtn = document.getElementById("show-manual-btn");
  const showJsonBtn   = document.getElementById("show-json-btn");
  const manualSection = document.getElementById("manual-form");
  const jsonSection   = document.getElementById("json-form");
  const previewEl     = document.getElementById("preview");
  const resultDiv     = document.getElementById("result");

  const studentForm   = document.getElementById("student-form");
  const profForm      = document.getElementById("prof-form");
  const radios        = Array.from(document.querySelectorAll('input[name="user-type"]'));

  const fileInput     = document.getElementById("jsonFile");
  const uploadBtn     = document.getElementById("uploadBtn");
  const fileNameSpan  = document.getElementById("fileName");

  console.log("grammateiainsert.js loaded", {
    manualSection,
    jsonSection,
    fileInput,
    previewEl,
    uploadBtn
  });

  let selectedFile = null;
  let selectedType = null;

  function showResult(msg, success = true, timeout = 5000) {
    resultDiv.textContent         = msg;
    resultDiv.style.color         = success ? "green" : "red";
    resultDiv.style.opacity       = "1";
    resultDiv.style.pointerEvents = "auto";
    setTimeout(() => {
      resultDiv.style.opacity       = "0";
      resultDiv.style.pointerEvents = "none";
    }, timeout);
  }

  function resetPreviewUI() {
    // do NOT clear fileInput.value here
    uploadBtn.disabled       = true;
    fileNameSpan.textContent = "Κανένα αρχείο επιλεγμένο";
    previewEl.textContent    = "";
    previewEl.classList.add("hidden");
    selectedFile             = null;
    selectedType             = null;
  }

  function showManual() {
    manualSection.classList.remove("hidden");
    jsonSection.classList.add("hidden");
    previewEl.classList.add("hidden");
    studentForm.classList.add("hidden");
    profForm.classList.add("hidden");
    radios.forEach(r => r.checked = false);

    // clear any previous preview/UI state
    resetPreviewUI();
    fileInput.value = "";
  }

  function showJson() {
    jsonSection.classList.remove("hidden");
    manualSection.classList.add("hidden");
    previewEl.classList.add("hidden");

    // clear any previous preview/UI state
    resetPreviewUI();
    fileInput.value = "";
  }

  showManualBtn.addEventListener("click", showManual);
  showJsonBtn.addEventListener("click", showJson);

  //Manual entry logic
  radios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "φοιτητής") {
        studentForm.classList.remove("hidden");
        profForm.classList.add("hidden");
        profForm.reset();
      } else {
        profForm.classList.remove("hidden");
        studentForm.classList.add("hidden");
        studentForm.reset();
      }
    });
  });

  document.querySelectorAll(".cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      studentForm.classList.add("hidden");
      profForm.classList.add("hidden");
      radios.forEach(r => r.checked = false);
    });
  });

document.addEventListener("submit", e => {
  if (e.target === studentForm || e.target === profForm) {
    e.preventDefault();
    const fd = new FormData(e.target);

    fetch("../PHP/grammateiainsertmanual.php", {
      method: "POST",
      body: fd,
      credentials: 'same-origin',                 
      headers: { 'Accept': 'application/json' }  
    })
    .then(async (r) => {
      const txt = await r.text();
      console.log('RAW SERVER RESPONSE:', txt);   

      if (!r.ok) {
        //parse to JSON error
        try {
          const parsedErr = JSON.parse(txt);
          alert('Σφάλμα: ' + (parsedErr.message || JSON.stringify(parsedErr)));
        } catch (_) {
          // not JSON — show raw text snippet so user/dev can see what happened
          const snippet = txt.replace(/\s+/g, ' ').slice(0, 1000);
          alert('Server error (' + r.status + '): ' + snippet);
        }
        return;
      }

      // r.ok: try to parse JSON safely
      let data = null;
      try {
        data = JSON.parse(txt);
      } catch (parseErr) {
        // invalid JSON — show raw response so you can debug
        console.error('Invalid JSON from server. Raw response:', txt);
        alert('Σφάλμα διακομιστή — παρατηρήστε την κονσόλα για λεπτομέρειες.');
        return;
      }

      if (data && data.success) {
        alert(data.message);
        e.target.reset();
        e.target.classList.add("hidden");
        radios.forEach(r => r.checked = false);
      } else {
        alert("Σφάλμα: " + (data && data.message ? data.message : "Άγνωστο σφάλμα"));
      }
    })
    .catch(err => {
      console.error('Fetch failed:', err);
      alert("Κάτι πήγε στραβά κατά την υποβολή.");
    });
  }
});


  // JSON upload logic
  fileInput.addEventListener("change", e => {
    console.log("fileInput.change fired, files:", e.target.files);

    // clear old preview/UI but keep the fileInput value
    uploadBtn.disabled       = true;
    fileNameSpan.textContent = "Κανένα αρχείο επιλεγμένο";
    previewEl.textContent    = "";
    previewEl.classList.add("hidden");

    const file = e.target.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".json")) {
      alert("Το αρχείο πρέπει να είναι τύπου JSON");
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      console.log("reader.onload fired");
      let data;
      try {
        data = JSON.parse(evt.target.result);
      } catch (err) {
        alert("Μη έγκυρο JSON: " + err.message);
        return;
      }

      let key;
      if (Array.isArray(data.foitites)) {
        key = "foitites";
        selectedType = "students";
      } else if (Array.isArray(data.professors)) {
        key = "professors";
        selectedType = "professors";
      } else {
        alert('JSON πρέπει να περιέχει "foitites" ή "professors"');
        return;
      }

      const required = selectedType === "students"
        ? ["am","username","pass_word","onoma","eponimo","etos","email","kinito","stathero","dieuthinsi"]
        : ["username","pass_word","profession","email","onoma","eponimo","tilefono"];

      const invalidRows = data[key].filter(obj =>
        required.some(f => !obj.hasOwnProperty(f) || obj[f] === "")
      );
      if (invalidRows.length) {
        alert(`Λείπουν πεδία σε ${invalidRows.length} εγγραφές`);
        return;
      }

      // show preview and enable upload
      previewEl.textContent    = JSON.stringify(data[key], null, 2);
      previewEl.classList.remove("hidden");

      selectedFile             = file;
      uploadBtn.disabled       = false;
      fileNameSpan.textContent = file.name;
    };

    reader.readAsText(file, "UTF-8");
  });

  uploadBtn.addEventListener("click", () => {
    if (!selectedFile || !selectedType) return;
    const fd = new FormData();
    fd.append("jsonFile", selectedFile);

    showResult("Ανέβασμα σε εξέλιξη...", true);

    const endpoint = selectedType === "students"
      ? "../PHP/grammateiainsert.php"
      : "../PHP/grammateiainsertprof.php";

    fetch(endpoint, { method: "POST", body: fd })
      .then(r => r.text())
      .then(txt => {
        const data = JSON.parse(txt);
        if (data.success) {
          showResult(
            `Εισήχθησαν ${data.inserted} ` +
            (selectedType === "students" ? "φοιτητές" : "καθηγητές")
          );
        } else {
          showResult("Σφάλματα:\n" + data.errors.join("\n"), false);
        }
      })
      .catch(err => {
        console.error(err);
        showResult("Σφάλμα κατά το ανέβασμα: " + err.message, false);
      })
      .finally(() => {
        // keep fileInput.value until user toggles or re-selects
        // hide preview
        previewEl.classList.add("hidden");
        uploadBtn.disabled = true;
      });
  });
});
