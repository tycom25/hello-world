// === Netscape Navigator - Google Search App ===

(function () {
  "use strict";

  // DOM Elements
  const locationInput = document.getElementById("location-input");
  const goBtn = document.getElementById("go-btn");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const searchPage = document.getElementById("search-page");
  const resultsFrame = document.getElementById("results-frame");
  const statusText = document.getElementById("status-text");
  const progressBar = document.getElementById("progress-bar");
  const throbber = document.getElementById("throbber");
  const securityIcon = document.getElementById("security-icon");
  const titleBarText = document.querySelector(".title-bar-text");

  // Navigation history
  const history = {
    entries: ["https://www.google.com/"],
    index: 0,
  };

  // === SEARCH FUNCTIONALITY ===

  function performSearch(query) {
    if (!query || !query.trim()) return;

    const encodedQuery = encodeURIComponent(query.trim());
    const googleUrl = `https://www.google.com/search?igu=1&q=${encodedQuery}`;

    // Update the location bar
    const displayUrl = `https://www.google.com/search?q=${encodedQuery}`;
    locationInput.value = displayUrl;

    // Update title
    titleBarText.textContent = `Netscape Navigator - [${query.trim()} - Google Search]`;

    // Add to history
    history.entries = history.entries.slice(0, history.index + 1);
    history.entries.push(displayUrl);
    history.index = history.entries.length - 1;

    // Show loading state
    startLoading(`Searching for "${query.trim()}"...`);

    // Hide home page, show iframe with Google results
    searchPage.style.display = "none";
    resultsFrame.style.display = "block";
    resultsFrame.src = googleUrl;

    resultsFrame.onload = function () {
      stopLoading();
      setStatus("Document: Done");
      updateSecurity(displayUrl);
    };

    // Timeout fallback in case onload doesn't fire (cross-origin)
    setTimeout(function () {
      stopLoading();
      setStatus("Document: Done");
    }, 5000);
  }

  function navigateToUrl(url) {
    // If it looks like a search query (no dots or protocol), search for it
    if (!url.includes(".") && !url.startsWith("http")) {
      performSearch(url);
      return;
    }

    // Ensure URL has protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    locationInput.value = url;

    // If it's a google search URL, show in iframe
    if (url.includes("google.com")) {
      // Extract search query if present
      const urlObj = new URL(url);
      const query = urlObj.searchParams.get("q");

      if (query) {
        titleBarText.textContent = `Netscape Navigator - [${query} - Google Search]`;
      } else {
        showHomePage();
        return;
      }

      startLoading("Connecting to " + url + "...");
      searchPage.style.display = "none";
      resultsFrame.style.display = "block";

      // Use igu=1 parameter for Google to allow iframe embedding
      const iframeUrl = url.includes("igu=1") ? url : url + "&igu=1";
      resultsFrame.src = iframeUrl;

      resultsFrame.onload = function () {
        stopLoading();
        setStatus("Document: Done");
      };

      setTimeout(function () {
        stopLoading();
      }, 5000);
    } else {
      // For non-Google URLs, try loading in iframe
      startLoading("Connecting to " + url + "...");
      searchPage.style.display = "none";
      resultsFrame.style.display = "block";
      resultsFrame.src = url;

      titleBarText.textContent = `Netscape Navigator - [${url}]`;

      resultsFrame.onload = function () {
        stopLoading();
        setStatus("Document: Done");
      };

      setTimeout(function () {
        stopLoading();
      }, 5000);
    }

    // Update history
    history.entries = history.entries.slice(0, history.index + 1);
    history.entries.push(url);
    history.index = history.entries.length - 1;

    updateSecurity(url);
  }

  function showHomePage() {
    searchPage.style.display = "flex";
    resultsFrame.style.display = "none";
    resultsFrame.src = "about:blank";
    locationInput.value = "https://www.google.com/";
    titleBarText.textContent = "Netscape Navigator - [Netscape Search]";
    setStatus("Document: Done");
    updateSecurity("https://www.google.com/");
    searchInput.value = "";
    searchInput.focus();
  }

  // === LOADING / STATUS ===

  function startLoading(message) {
    throbber.classList.add("active");
    setStatus(message || "Transferring data...");
    animateProgress();
  }

  function stopLoading() {
    throbber.classList.remove("active");
    progressBar.style.width = "100%";
    setTimeout(function () {
      progressBar.style.width = "0%";
    }, 300);
  }

  function setStatus(message) {
    statusText.textContent = message;
  }

  function animateProgress() {
    progressBar.style.width = "0%";
    let width = 0;
    const interval = setInterval(function () {
      if (!throbber.classList.contains("active")) {
        clearInterval(interval);
        return;
      }
      width += Math.random() * 15;
      if (width > 90) width = 90;
      progressBar.style.width = width + "%";
    }, 200);
  }

  function updateSecurity(url) {
    if (url && url.startsWith("https://")) {
      securityIcon.classList.add("secure");
      securityIcon.title = "Secure Connection (SSL)";
    } else {
      securityIcon.classList.remove("secure");
      securityIcon.title = "Not Secure";
    }
  }

  // === EVENT HANDLERS ===

  // Search form submission
  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    performSearch(searchInput.value);
  });

  // Go button / location bar
  goBtn.addEventListener("click", function () {
    navigateToUrl(locationInput.value);
  });

  locationInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateToUrl(locationInput.value);
    }
  });

  // Toolbar buttons
  document.getElementById("btn-back").addEventListener("click", function () {
    if (history.index > 0) {
      history.index--;
      const url = history.entries[history.index];
      if (url === "https://www.google.com/" || url === "https://www.google.com") {
        showHomePage();
      } else {
        locationInput.value = url;
        navigateToUrl(url);
      }
    }
  });

  document.getElementById("btn-forward").addEventListener("click", function () {
    if (history.index < history.entries.length - 1) {
      history.index++;
      const url = history.entries[history.index];
      locationInput.value = url;
      navigateToUrl(url);
    }
  });

  document.getElementById("btn-reload").addEventListener("click", function () {
    const url = locationInput.value;
    if (resultsFrame.style.display !== "none") {
      startLoading("Reloading...");
      resultsFrame.src = resultsFrame.src;
      setTimeout(stopLoading, 3000);
    }
  });

  document.getElementById("btn-home").addEventListener("click", function () {
    showHomePage();
  });

  document.getElementById("btn-search").addEventListener("click", function () {
    showHomePage();
    setTimeout(function () {
      searchInput.focus();
    }, 100);
  });

  document.getElementById("btn-stop").addEventListener("click", function () {
    stopLoading();
    setStatus("Transfer interrupted!");
  });

  document.getElementById("btn-print").addEventListener("click", function () {
    window.print();
  });

  // Throbber click -> go home
  throbber.addEventListener("click", function () {
    showHomePage();
  });

  // Quick links
  document.querySelectorAll(".quick-link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const query = this.getAttribute("data-search");
      searchInput.value = query;
      performSearch(query);
    });
  });

  // Bookmark links
  document.querySelectorAll(".bookmark-link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const url = this.getAttribute("data-url");
      if (url.includes("google.com")) {
        showHomePage();
      } else {
        navigateToUrl(url);
      }
    });
  });

  // Location bar - select all on focus
  locationInput.addEventListener("focus", function () {
    this.select();
  });

  // Status bar hover effects for links
  document.querySelectorAll("a, .quick-link, .bookmark-link").forEach(function (el) {
    el.addEventListener("mouseenter", function () {
      const url = this.getAttribute("data-url") || this.href || "";
      if (url) {
        setStatus(url);
      }
    });
    el.addEventListener("mouseleave", function () {
      setStatus("Document: Done");
    });
  });

  // === INIT ===
  searchInput.focus();
  setStatus("Document: Done");
  updateSecurity("https://www.google.com/");
})();
