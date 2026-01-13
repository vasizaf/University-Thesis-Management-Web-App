document.addEventListener("DOMContentLoaded", () => {
  const logoutButton = document.querySelector(".logout");

  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();

      const modal = document.createElement("div");
      modal.id = "logout-modal";

      modal.innerHTML = `
        <div class="modal-content">
          <p>Are you sure you want to log out?</p>
          <button id="logout-confirm-yes">Yes</button>
          <button id="logout-confirm-no">No</button>
        </div>
      `;

      document.body.appendChild(modal);

      const yesBtn = document.getElementById("logout-confirm-yes");
      const noBtn = document.getElementById("logout-confirm-no");

      yesBtn.addEventListener("click", () => {
        localStorage.removeItem("role");
        window.location.href = "../PHP/logout.php";
      });

      noBtn.addEventListener("click", () => {
        modal.remove();
      });
    });
  }
});
