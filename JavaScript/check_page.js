document.addEventListener('DOMContentLoaded', () => {
  // Highlight active sidebar link
  const currentPage = window.location.pathname.split("/").pop(); 
  document.querySelectorAll('.sidebar-links a').forEach(link => {
    const linkHref   = link.getAttribute('href') || "";
    const linkPage   = linkHref.split("/").pop();
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });

  const userRole = localStorage.getItem('role');

  const roleMapping = {
    foititis:   [
      "foititishome.html",
      "foititisaitiseis.html",
      "foititisdiplomatiki.html",
      "foititisexetasi.html"
    ],
    kathigitis: [
      "kathigitishome.html",
      "kathigitisdiplomatikes.html",
      "kathigitisaitiseis.html",
      "kathigitis_statistics.html"
    ],
    grammateia: [
      "grammateiahome.html",
      "grammateiadiplomatikes.html",
      "grammateiainsert.html"
    ],
  };

  // Determine which role is required by this page
  let requiredRole = null;
  for (const [role, pages] of Object.entries(roleMapping)) {
    if (pages.includes(currentPage)) {
      requiredRole = role;
      break;
    }
  }

  // If page is public, stop here
  if (!requiredRole) {
    return;
  }

  // If userRole doesn't match, show permission modal
  if (userRole !== requiredRole) {
    const modal = document.createElement("div");
    modal.id = "custom-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <p id="modal-message">
          You do not have permission to access this page.
          Are you sure you want to proceed?
        </p>
        <button id="confirm-yes">Yes</button>
        <button id="confirm-no">No</button>
      </div>
    `;
    document.body.appendChild(modal);

    const style = document.createElement("style");
    style.innerHTML = `
      #custom-modal {
        position: fixed;
        top:0; left:0;
        width:100%; height:100%;
        background:rgba(0,0,0,0.5);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:1000;
      }
      .modal-content {
        background:#fff;
        padding:20px;
        border-radius:8px;
        text-align:center;
        box-shadow:0 4px 10px rgba(0,0,0,0.3);
        max-width:90%;
        width:380px;
      }
      .modal-content p {
        margin-bottom:16px;
        font-size:16px;
        color:#333;
      }
      .modal-content button {
        margin:6px;
        padding:8px 16px;
        font-size:14px;
        cursor:pointer;
        border:none;
        border-radius:4px;
      }
      #confirm-yes { background:#007bff; color:#fff; }
      #confirm-no  { background:#dc3545; color:#fff; }
      #confirm-yes:hover,
      #confirm-no:hover { opacity:.95; }
    `;
    document.head.appendChild(style);

    document.getElementById("confirm-yes").onclick = () => {
      modal.remove();
      window.location.href = "../HTML/login.html";
    };
    document.getElementById("confirm-no").onclick = () => {
      modal.remove();
      window.history.back();
    };

    return;  // stop here for unauthorized users
  }

  //Inactivity warning
  const IDLE_MS   = 30 * 60 * 1000; //30 minutes
  const WARN_MS   =  5 * 60 * 1000; //5 minutes before logout
  const activityEvents = [
    'mousemove','mousedown','keydown',
    'touchstart','scroll','click'
  ];

  let idleTimeoutId     = null;
  let warnTimeoutId     = null;
  let countdownInterval = null;
  let warningVisible    = false;
  let warningEndsAt     = null;

  function activityHandler() { resetIdleTimer(); }
  function visibilityHandler() {
    if (!document.hidden) resetIdleTimer();
  }

  function createWarningModal() {
    if (document.getElementById('idle-warning-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'idle-warning-modal';
    wrap.style.display = 'none';
    wrap.innerHTML = `
      <div class="idle-warning-content">
        <p id="idle-warning-msg">
          You will be logged out due to inactivity in
          <span id="idle-countdown">0</span> seconds.
        </p>
        <div style="margin-top:10px;">
          <button id="idle-stay-btn">Stay logged in</button>
          <button id="idle-logout-btn">Logout now</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const css = document.createElement('style');
    css.id = 'idle-warning-styles';
    css.innerHTML = `
      #idle-warning-modal {
        position:fixed;
        top:0; left:0;
        width:100%; height:100%;
        background:rgba(0,0,0,.35);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:10000;
      }
      .idle-warning-content {
        background:#fff;
        padding:18px;
        border-radius:8px;
        box-shadow:0 6px 16px rgba(0,0,0,.25);
        text-align:center;
        max-width:90%;
        width:360px;
      }
      .idle-warning-content p {
        font-size:16px;
        margin:0 0 8px;
      }
      #idle-stay-btn, #idle-logout-btn {
        margin:6px;
        padding:8px 14px;
        border-radius:4px;
        border:none;
        cursor:pointer;
      }
      #idle-stay-btn  { background:#28a745; color:#fff; }
      #idle-logout-btn { background:#dc3545; color:#fff; }
    `;
    document.head.appendChild(css);

    wrap.querySelector('#idle-stay-btn')
      .addEventListener('click', () => {
        hideWarning();
        resetIdleTimer();
      });

    wrap.querySelector('#idle-logout-btn')
      .addEventListener('click', () => {
        hideWarning();
        logoutDueToInactivity();
      });
  }

  function showWarning() {
    createWarningModal();
    const modal = document.getElementById('idle-warning-modal');
    if (!modal) return;
    warningVisible = true;
    warningEndsAt = Date.now() + WARN_MS;
    modal.style.display = 'flex';
    updateCountdownDisplay();
    clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdownDisplay, 250);
  }

  function updateCountdownDisplay() {
    const el = document.getElementById('idle-countdown');
    if (!el) return;
    const msLeft  = Math.max(0, warningEndsAt - Date.now());
    const secLeft = Math.ceil(msLeft / 1000);
    el.textContent = String(secLeft);
    if (msLeft <= 0) {
      hideWarning();
      logoutDueToInactivity();
    }
  }

  function hideWarning() {
    const modal = document.getElementById('idle-warning-modal');
    if (modal) modal.style.display = 'none';
    warningVisible = false;
    warningEndsAt = null;
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function logoutDueToInactivity() {
    stopIdleWatcher();
    try {
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Error clearing storage on logout', e);
    }
    alert('You were logged out due to inactivity.');
    window.location.href = '../HTML/login.html';
  }

  function resetIdleTimer() {
    if (warningVisible) hideWarning();
    if (idleTimeoutId) clearTimeout(idleTimeoutId);
    if (warnTimeoutId) clearTimeout(warnTimeoutId);

    const warnDelay = Math.max(0, IDLE_MS - WARN_MS);
    warnTimeoutId = setTimeout(showWarning, warnDelay);
    idleTimeoutId = setTimeout(() => {
      hideWarning();
      logoutDueToInactivity();
    }, IDLE_MS);
  }

  function startIdleWatcher() {
    activityEvents.forEach(evt =>
      document.addEventListener(evt, activityHandler, true)
    );
    document.addEventListener('visibilitychange', visibilityHandler);
    resetIdleTimer();
  }

  function stopIdleWatcher() {
    activityEvents.forEach(evt =>
      document.removeEventListener(evt, activityHandler, true)
    );
    document.removeEventListener('visibilitychange', visibilityHandler);
    if (idleTimeoutId) clearTimeout(idleTimeoutId);
    if (warnTimeoutId) clearTimeout(warnTimeoutId);
    if (countdownInterval) clearInterval(countdownInterval);
    hideWarning();
  }

  // Start inactivity watcher for authenticated users on protected pages
  startIdleWatcher();
});
