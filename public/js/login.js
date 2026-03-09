// Page loader - hide on page load

window.addEventListener("load", () => {
  const pageLoader = document.getElementById("pageLoader");

  setTimeout(() => {
    pageLoader.classList.add("hidden");
  }, 500);
});

// Login form handler

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  const loginBtn = document.getElementById("loginBtn");

  const errorMessage = document.getElementById("errorMessage");

  const btnText = loginBtn.querySelector(".btn-text");

  const btnLoader = loginBtn.querySelector(".btn-loader");

  // Handle form submission

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form data

    const userId = document.getElementById("user_id").value.trim();

    const password = document.getElementById("password").value;

    // Validate inputs

    if (!userId || !password) {
      showError("Please fill in all fields");

      return;
    }

    // Disable button and show loader

    loginBtn.disabled = true;

    btnText.style.display = "none";

    btnLoader.style.display = "inline-block";

    hideError();

    try {
      // Send login request

      const response = await fetch("/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          user_id: userId,

          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show page loader before redirect

        const pageLoader = document.getElementById("pageLoader");

        pageLoader.classList.remove("hidden");

        pageLoader.querySelector("p").textContent =
          "Login successful! Redirecting...";

        // Redirect to dashboard

        setTimeout(() => {
          window.location.href = data.redirectUrl || "/dashboard";
        }, 800);
      } else {
        // Show error message

        showError(data.message || "Login failed");

        resetButton();
      }
    } catch (error) {
      console.error("Login error:", error);

      showError("Network error. Please try again.");

      resetButton();
    }
  });

  // Show error message

  function showError(message) {
    errorMessage.textContent = message;

    errorMessage.style.display = "block";
  }

  // Hide error message

  function hideError() {
    errorMessage.style.display = "none";
  }

  // Reset button state

  function resetButton() {
    loginBtn.disabled = false;

    btnText.style.display = "inline";

    btnLoader.style.display = "none";
  }

  // Clear error when user starts typing

  document.getElementById("user_id").addEventListener("input", hideError);

  document.getElementById("password").addEventListener("input", hideError);
});
