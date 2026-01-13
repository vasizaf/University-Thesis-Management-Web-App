// Toggle exam access based on thesis status
function toggleExamAccess(status) {
  const allowed = status === 'Under exam';

  // Disable or enable all inputs and buttons except logout
  document.querySelectorAll('input, select, textarea, button').forEach(el => {
    if (el.id === 'logout-button') return;
    el.disabled = !allowed;
  });

  if (!allowed) {
    const msg = document.createElement('div');
    msg.innerHTML = `
      <div style="
        background-color: #f9f9f9;
        border-left: 4px solid #f44336;
        padding: 15px 20px;
        margin-top: 80px;
        margin-bottom: 20px;
        font-family: 'Segoe UI', sans-serif;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      ">
        <strong>Σημείωση:</strong> Οι λειτουργίες της σελίδας είναι διαθέσιμες μόνο όταν η διπλωματική εργασία βρίσκεται σε κατάσταση <em>«υπό εξέταση»</em>.
        <br>Για περισσότερες πληροφορίες, παρακαλούμε επικοινωνήστε με τον επιβλέποντα.
      </div>
    `;
    document.querySelector('.main-content').prepend(msg);
  }
}

// Initial fetch to determine access
fetch('../PHP/get_foititis_data.php')
  .then(res => res.json())
  .then(data => {
    if (data.thesis && data.thesis.status) {
      toggleExamAccess(data.thesis.status.trim());
    } else {
      console.error('Δεν βρέθηκε κατάσταση διπλωματικής');
    }
  })
  .catch(err => {
    console.error('Σφάλμα κατά την ανάκτηση δεδομένων φοιτητή:', err);
  });


window.addEventListener("DOMContentLoaded", () => {
  // Date validation setup
  const dateInput = document.getElementById("imerominia");
  const form = document.getElementById("exetasiForm");
  const editButton = document.getElementById("editButton");
  const fileInput = document.getElementById("proxeiro_keimeno");
  const uploadForm = document.getElementById("uploadForm");
  const fileLinkContainer = document.getElementById("uploadedFileLink");
  const fileUploadContainer = document.getElementById("fileUploadContainer");
  const replaceFileButton = document.getElementById("replaceFileButton");
  const deleteFileButton = document.getElementById("deleteFileButton");

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30);

  const formatDate = date => date.toISOString().split("T")[0];
  dateInput.min = formatDate(today);
  dateInput.max = formatDate(maxDate);

  dateInput.addEventListener("blur", () => {
    const selected = new Date(dateInput.value);
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    maxDate.setHours(0, 0, 0, 0);

    if (selected < today || selected > maxDate) {
      showPopup("Η ημερομηνία πρέπει να είναι εντός των επόμενων 30 ημερών.");
      dateInput.value = "";
    }
  });


  // Fetch student and exam data
  fetch("../PHP/get_foititis_data.php")
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        showPopup("Σφάλμα: " + data.error);
        return;
      }

      fetchExamData();

      fetch("../PHP/get_proxeiro.php")
        .then(res => res.json())
        .then(fileData => {
          if (fileData.filename) {
            const link = `<a href="${fileData.filename}" target="_blank">${fileData.original}</a>`;
            fileLinkContainer.innerHTML = link;
            fileUploadContainer.style.display = "none";
            replaceFileButton.style.display = "inline-block";
            deleteFileButton.style.display = "inline-block";
          }
        })
        .catch(err => {
          console.error("Error fetching existing file:", err);
        });
    })
    .catch(error => {
      console.error("Error loading student data:", error);
    });


  // Replace file
  replaceFileButton.addEventListener("click", () => {
    fileUploadContainer.style.display = "flex";
    fileLinkContainer.innerHTML = "";
    replaceFileButton.style.display = "none";
    deleteFileButton.style.display = "none";
    fileInput.value = "";
  });

  // Delete file
  deleteFileButton.addEventListener("click", () => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε το αρχείο;")) return;

    fetch("../PHP/delete_proxeiro.php", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showPopup(data.success);
          fileLinkContainer.innerHTML = "";
          fileUploadContainer.style.display = "flex";
          replaceFileButton.style.display = "none";
          deleteFileButton.style.display = "none";
          fileInput.value = "";
        } else {
          showPopup(data.error || "Σφάλμα κατά τη διαγραφή.");
        }
      })
      .catch(err => {
        console.error("Delete error:", err);
        showPopup("Σφάλμα σύνδεσης.");
      });
  });

  // Upload file
  if (uploadForm) {
    uploadForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const file = fileInput.files[0];
      if (!file) {
        showPopup("Παρακαλώ επιλέξτε ένα αρχείο.");
        return;
      }

      const formData = new FormData();
      formData.append("proxeiro_keimeno", file);

      fetch("../PHP/upload_proxeiro.php", {
        method: "POST",
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showPopup("Το αρχείο αντικαταστάθηκε επιτυχώς.");
            fileUploadContainer.style.display = "none";
            replaceFileButton.style.display = "inline-block";
            deleteFileButton.style.display = "inline-block";
            const link = `<a href="${data.filename}" target="_blank">${data.original}</a>`;
            fileLinkContainer.innerHTML = link;
          } else {
            showPopup(data.error || "Σφάλμα κατά το ανέβασμα.");
          }
        })
        .catch(err => {
          console.error("Upload error:", err);
          showPopup("Σφάλμα σύνδεσης.");
        });
    });
  }

  // Submit exam form
  form.addEventListener("submit", function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const selected = new Date(dateInput.value);
    const todayCheck = new Date();
    const maxCheck = new Date();
    maxCheck.setDate(todayCheck.getDate() + 30);

    selected.setHours(0, 0, 0, 0);
    todayCheck.setHours(0, 0, 0, 0);
    maxCheck.setHours(0, 0, 0, 0);

    if (selected < todayCheck || selected > maxCheck) {
      showPopup("Η ημερομηνία πρέπει να είναι εντός των επόμενων 30 ημερών.");
      return;
    }

    fetch("../PHP/foititis_exetasi.php", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showPopup(data.success);
          this.querySelectorAll("input, select").forEach(el => el.disabled = true);
          fetchExamData();
        } else if (data.error) {
          showPopup(data.error);
        } else {
          showPopup("ℹΆγνωστη απάντηση από τον διακομιστή.");
        }
      })
      .catch(err => {
        showPopup("Σφάλμα κατά την αποστολή.");
        console.error("Error:", err);
      });
  });


  // Additional links logic
  const linkForm = document.getElementById("linkForm");
  const newLinkInput = document.getElementById("newLink");
  const linkList = document.getElementById("linkList");

  linkForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const link = newLinkInput.value.trim();
    if (!link) {
      showPopup("Παρακαλώ εισάγετε έναν σύνδεσμο.");
      return;
    }

    const formData = new FormData();
    formData.append("link", link);

    fetch("../PHP/add_link.php", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showPopup(data.success);
          newLinkInput.value = "";
          loadLinks();
        } else {
          showPopup(data.error || "Σφάλμα κατά την προσθήκη.");
        }
      })
      .catch(err => {
        console.error("Add link error:", err);
        showPopup("Σφάλμα σύνδεσης.");
      });
  });


  // Nimertis link logic
  const finalForm = document.getElementById("finalThesisForm");
  if (finalForm) {
    finalForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const link = document.getElementById("finalThesisLink").value.trim();
      if (!link) {
        showPopup("Παρακαλώ εισάγετε έναν σύνδεσμο.");
        return;
      }

      fetch("../PHP/add_link.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `link=${encodeURIComponent(link)}&final=true`
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showPopup(data.success);
            document.getElementById("finalThesisLink").value = "";
            loadLinks();
          } else {
            showPopup(data.error || "Σφάλμα κατά την προσθήκη.");
          }
        })
        .catch(err => {
          console.error("Add final link error:", err);
          showPopup("Σφάλμα σύνδεσης.");
        });
    });
  }


  // Load all links (additional and nimertis)
  function loadLinks() {
    fetch("../PHP/get_links.php")
      .then(res => res.json())
      .then(data => {
        // additional links
        linkList.innerHTML = "";
        if (data.links && data.links.length > 0) {
          data.links.forEach(item => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = item.link;
            a.textContent = item.link;
            a.target = "_blank";
            a.style.marginRight = "10px";

            const delBtn = document.createElement("button");
            delBtn.textContent = "Διαγραφή link";
            delBtn.style.backgroundColor = "#d9534f";
            delBtn.style.color = "white";
            delBtn.style.border = "none";
            delBtn.style.padding = "5px 10px";
            delBtn.style.borderRadius = "4px";
            delBtn.style.cursor = "pointer";
            delBtn.style.fontSize = "13px";
            delBtn.style.marginLeft = "10px";
            delBtn.title = "Διαγραφή συνδέσμου";

            delBtn.addEventListener("click", () => {
              if (!confirm("Θέλετε να διαγράψετε αυτόν τον σύνδεσμο;")) return;

              fetch("../PHP/delete_link.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ link_number: item.link_number })
              })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    showPopup(data.success);
                    loadLinks();
                  } else {
                    showPopup(data.error || "Σφάλμα κατά τη διαγραφή.");
                  }
                })
                .catch(err => {
                  console.error("Delete link error:", err);
                  showPopup("Σφάλμα σύνδεσης.");
                });
            });

            li.appendChild(a);
            li.appendChild(delBtn);
            linkList.appendChild(li);
          });
        } else {
          linkList.innerHTML = "<li>Δεν υπάρχουν σύνδεσμοι.</li>";
        }

        // nimertis link
        const finalDisplay = document.getElementById("finalThesisDisplay");
        if (finalDisplay) {
          if (data.nimertis) {
            finalDisplay.innerHTML =
              `<a href="${data.nimertis}" target="_blank" rel="noopener noreferrer">${data.nimertis}</a>`;
          } else {
            finalDisplay.innerHTML = "";
          }
        }
      })
      .catch(err => {
        console.error("Fetch links error:", err);
        linkList.innerHTML = "<li>Σφάλμα φόρτωσης συνδέσμων.</li>";
      });
  }

  loadLinks();
});


function fetchExamData() {
  const form = document.getElementById("exetasiForm");
  const editButton = document.getElementById("editButton");
  const fileLinkContainer = document.getElementById("uploadedFileLink");
  const fileUploadContainer = document.getElementById("fileUploadContainer");
  const replaceFileButton = document.getElementById("replaceFileButton");
  const deleteFileButton = document.getElementById("deleteFileButton");

  fetch("../PHP/get_exetasi_data.php")
    .then(response => response.json())
    .then(data => {
      if (data && !data.error) {
        form.querySelector("select[name='tropos_exetasis']").value = data.tropos_exetasis;
        form.querySelector("input[name='aithousa']").value = data.aithousa || data.link;
        form.querySelector("input[name='imerominia']").value = data.imerominia;
        form.querySelector("select[name='ora']").value = data.ora;
        editButton.disabled = false;

        if (data.proxeiro_keimeno) {
          const fileName = data.original || data.proxeiro_keimeno.split("/").pop();
          fileLinkContainer.innerHTML =
            `<a href="${data.proxeiro_keimeno}" target="_blank">${fileName}</a>`;
          fileUploadContainer.style.display = "none";
          replaceFileButton.style.display = "inline-block";
          deleteFileButton.style.display = "inline-block";
        }

        form.querySelectorAll("input, select").forEach(el => el.disabled = true);
        editButton.style.display = "inline-block";

        const examDate = new Date(data.imerominia);
        const today = new Date();
        examDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const daysRemaining =
          Math.floor((examDate - today) / (1000 * 60 * 60 * 24));

        editButton.addEventListener("click", () => {
          if (daysRemaining >= 7) {
            form.querySelectorAll("input, select").forEach(el => el.disabled = false);
            showPopup("Μπορείτε τώρα να επεξεργαστείτε τα στοιχεία.");
          } else {
            showPopup("Δεν μπορείτε να επεξεργαστείτε την εξέταση λιγότερο από 7 ημέρες πριν.");
          }
        });

        showPopup("Έχετε ήδη καταχωρήσει στοιχεία εξέτασης.");
      } else if (data && data.error) {
        console.warn("Exam data error:", data.error);
        editButton.disabled = true;
      }
    })
    .catch(error => {
      console.error("Error fetching exam data:", error);
    });
}

// Popup message utility
function showPopup(message) {
  const popup = document.createElement("div");
  popup.textContent = message;
  popup.style.position = "fixed";
  popup.style.bottom = "20px";
  popup.style.right = "20px";
  popup.style.color = "white";
  popup.style.padding = "10px 20px";
  popup.style.borderRadius = "5px";
  popup.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  popup.style.zIndex = "1000";
  popup.style.fontFamily = "sans-serif";
  popup.style.fontSize = "14px";
  popup.style.backgroundColor = "#2196F3";

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 6000);
}
