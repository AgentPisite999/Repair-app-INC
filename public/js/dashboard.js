// Page loader - hide on page load
window.addEventListener("load", () => {
  const pageLoader = document.getElementById("pageLoader");
  setTimeout(() => {
    pageLoader.classList.add("hidden");
  }, 500);
});
// Dashboard functionality
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to logout?")) {
      return;
    }
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out...";
    const pageLoader = document.getElementById("pageLoader");
    pageLoader.classList.remove("hidden");
    pageLoader.querySelector("p").textContent = "Logging out...";
    try {
      const response = await fetch("/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        pageLoader.querySelector("p").textContent =
          "Logout successful! Redirecting...";
        setTimeout(() => {
          window.location.href = data.redirectUrl || "/login";
        }, 800);
      } else {
        alert("Logout failed. Please try again.");
        pageLoader.classList.add("hidden");
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Logout";
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("Network error. Please try again.");
      pageLoader.classList.add("hidden");
      logoutBtn.disabled = false;
      logoutBtn.textContent = "Logout";
    }
  });
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "0";
        entry.target.style.transform = "translateY(20px)";
        setTimeout(() => {
          entry.target.style.transition =
            "opacity 0.5s ease, transform 0.5s ease";
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }, 100);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  const cards = document.querySelectorAll(".info-card");
  cards.forEach((card) => observer.observe(card));
});
