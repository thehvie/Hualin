// Function to load HTML includes
function loadIncludes() {
  // Load header
  fetch("includes/header.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("header-placeholder").innerHTML = data;

      // Set active menu item based on current page
      setActiveMenuItem();

      // Reinitialize any JavaScript that depends on the header
      initializeHeaderJS();
    })
    .catch((error) => console.error("Error loading header:", error));

  // Load footer
  fetch("includes/footer.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("footer-placeholder").innerHTML = data;
    })
    .catch((error) => console.error("Error loading footer:", error));
}

// Set active menu item based on current page
function setActiveMenuItem() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const menuLinks = document.querySelectorAll(".navbar-nav .nav-link");

  menuLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });
}

// Reinitialize header JavaScript functionality
function initializeHeaderJS() {
  // Reinitialize any dropdowns, search functionality, etc.
  // This depends on your existing JavaScript
  if (typeof initializeMenu === "function") {
    initializeMenu();
  }
}

// Load includes when DOM is ready
document.addEventListener("DOMContentLoaded", loadIncludes);
