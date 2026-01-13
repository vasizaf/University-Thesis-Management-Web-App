document.getElementById("loginForm").addEventListener("submit", function(event) {
  event.preventDefault(); // Prevent form submission

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
      document.getElementById("errorMessage").textContent = "Please fill in both username and password.";
      return;
  }

  // Send login request to the server
  fetch("../PHP/check_login.php", {
      method: "POST",
      headers: {
          "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
          document.getElementById("errorMessage").textContent = data.error;
      } else if (data.success) {
          // Store role in localStorage
          localStorage.setItem('role', data.role);
          // Redirect based on role
          window.location.href = data.redirectUrl;
      }
  })
  .catch(error => {
      console.error('Error:', error);
      document.getElementById("errorMessage").textContent = "An error occurred. Please try again later.";
  });
});
