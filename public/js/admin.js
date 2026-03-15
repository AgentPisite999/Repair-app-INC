// public/js/admin.js

(function () {
  const CONFIG = window.TABLE_CONFIG;
  let currentTab = "dashboard";
  let currentPage = 1;
  let searchTimeout = null;
  let parsedUploadRows = [];

  // ── DOM refs ──
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");
  const pageTitle = document.getElementById("pageTitle");
  const navItems = document.querySelectorAll(".nav-item");
  const viewDashboard = document.getElementById("view-dashboard");
  const viewTable = document.getElementById("view-table");
  const kpiGrid = document.getElementById("kpiGrid");
  const searchInput = document.getElementById("searchInput");
  const tableHead = document.getElementById("tableHead");
  const tableBody = document.getElementById("tableBody");
  const pagination = document.getElementById("pagination");

  // Modals
  const crudModal = document.getElementById("crudModal");
  const crudModalTitle = document.getElementById("crudModalTitle");
  const crudModalBody = document.getElementById("crudModalBody");
  const uploadModal = document.getElementById("uploadModal");
  const uploadModalTitle = document.getElementById("uploadModalTitle");
  const deleteModal = document.getElementById("deleteModal");

  // Upload refs
  const uploadZone = document.getElementById("uploadZone");
  const fileInput = document.getElementById("fileInput");
  const uploadProgressContainer = document.getElementById(
    "uploadProgressContainer",
  );
  const uploadProgressBar = document.getElementById("uploadProgressBar");
  const uploadStep1 = document.getElementById("uploadStep1");
  const uploadStep2 = document.getElementById("uploadStep2");
  const uploadStep3 = document.getElementById("uploadStep3");
  const uploadSummary = document.getElementById("uploadSummary");
  const insertDataBtn = document.getElementById("insertDataBtn");
  const insertProgressContainer = document.getElementById(
    "insertProgressContainer",
  );
  const insertProgressBar = document.getElementById("insertProgressBar");
  const uploadResult = document.getElementById("uploadResult");
  const uploadDoneBtn = document.getElementById("uploadDoneBtn");

  let editingId = null;
  let deleteId = null;

  // ── Toast ──
  function showToast(msg, type) {
    type = type || "info";
    var container = document.getElementById("toastContainer");
    var t = document.createElement("div");
    t.className = "toast " + type;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(function () {
      t.remove();
    }, 4000);
  }

  // ── Navigation ──
  navItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      var tab = item.dataset.tab;
      navItems.forEach(function (n) {
        n.classList.remove("active");
      });
      item.classList.add("active");
      currentTab = tab;
      currentPage = 1;
      searchInput.value = "";
      if (window.innerWidth < 768) sidebar.classList.remove("open");
      if (tab === "dashboard") {
        pageTitle.textContent = "Dashboard";
        viewDashboard.classList.add("active");
        viewDashboard.style.display = "block";
        viewTable.classList.remove("active");
        viewTable.style.display = "none";
        loadDashboard();
      } else {
        var cfg = CONFIG[tab];
        pageTitle.textContent = cfg ? cfg.displayName : tab;
        viewDashboard.classList.remove("active");
        viewDashboard.style.display = "none";
        viewTable.classList.add("active");
        viewTable.style.display = "block";
        // Update search placeholder based on table-specific search columns
        searchInput.placeholder = cfg.searchPlaceholder || "Search records...";
        loadTableData();
      }
    });
  });

  menuToggle.addEventListener("click", function () {
    sidebar.classList.toggle("open");
  });

  // ── Dashboard ──
  async function loadDashboard() {
    kpiGrid.innerHTML =
      '<div class="kpi-loading"><i class="fas fa-spinner fa-spin"></i> Loading KPIs...</div>';
    try {
      var resp = await fetch("/api/admin/dashboard");
      var data = await resp.json();
      if (!data.success) throw new Error(data.message);

      var icons = [
        "fa-box",
        "fa-store",
        "fa-exclamation-triangle",
        "fa-warehouse",
        "fa-truck",
        "fa-shipping-fast",
        "fa-users",
      ];
      kpiGrid.innerHTML = data.kpis
        .map(function (kpi, i) {
          return (
            '<div class="kpi-card" data-tab="' +
            kpi.table +
            '">' +
            '<div class="kpi-icon kpi-colors-' +
            (i % 7) +
            '">' +
            '<i class="fas ' +
            icons[i % icons.length] +
            '"></i>' +
            "</div>" +
            '<div class="kpi-count">' +
            kpi.count.toLocaleString() +
            "</div>" +
            '<div class="kpi-label">' +
            kpi.displayName +
            "</div>" +
            "</div>"
          );
        })
        .join("");

      // Click KPI to navigate
      document.querySelectorAll(".kpi-card[data-tab]").forEach(function (card) {
        card.addEventListener("click", function () {
          var tab = card.dataset.tab;
          var navItem = document.querySelector(
            '.nav-item[data-tab="' + tab + '"]',
          );
          if (navItem) navItem.click();
        });
      });
    } catch (err) {
      kpiGrid.innerHTML =
        '<div class="kpi-loading" style="color:#ff4c4c;">Error loading KPIs: ' +
        err.message +
        "</div>";
    }
  }

  // ── Table Data ──
  async function loadTableData() {
    var cfg = CONFIG[currentTab];
    if (!cfg) return;

    var search = searchInput.value.trim();

    // Show ALL columns from cfg.columns (same as template)
    var allCols = cfg.columns;

    // Build header with all columns
    var headHtml = "<tr>";
    for (var h = 0; h < allCols.length; h++) {
      headHtml += "<th>" + allCols[h].label + "</th>";
    }
    headHtml += '<th style="width:100px;">Actions</th></tr>';
    tableHead.innerHTML = headHtml;

    tableBody.innerHTML =
      '<tr><td colspan="100" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
      var resp = await fetch(
        "/api/admin/table/" +
          currentTab +
          "?page=" +
          currentPage +
          "&limit=20&search=" +
          encodeURIComponent(search),
      );
      var data = await resp.json();
      if (!data.success) throw new Error(data.message);

      if (data.data.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="100" style="text-align:center;padding:40px;color:#999;">No records found</td></tr>';
        pagination.innerHTML = "";
        return;
      }

      var bodyHtml = "";
      for (var r = 0; r < data.data.length; r++) {
        var row = data.data[r];
        bodyHtml += "<tr>";
        for (var c = 0; c < allCols.length; c++) {
          var colDb = allCols[c].db;
          var val = row[colDb] || "—";
          bodyHtml +=
            '<td title="' + escHtml(val) + '">' + escHtml(val) + "</td>";
        }
        bodyHtml +=
          "<td>" +
          '<div class="action-btns">' +
          '<button class="edit-btn" onclick="window.adminEditRecord(' +
          row.id +
          ')"><i class="fas fa-pen"></i></button>' +
          '<button class="delete-btn" onclick="window.adminDeleteRecord(' +
          row.id +
          ')"><i class="fas fa-trash"></i></button>' +
          "</div>" +
          "</td>";
        bodyHtml += "</tr>";
      }
      tableBody.innerHTML = bodyHtml;

      renderPagination(data.page, data.totalPages);
    } catch (err) {
      tableBody.innerHTML =
        '<tr><td colspan="100" style="text-align:center;padding:40px;color:#ff4c4c;">Error: ' +
        err.message +
        "</td></tr>";
    }
  }

  function renderPagination(page, totalPages) {
    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }
    var html =
      "<button " +
      (page === 1 ? "disabled" : "") +
      ' onclick="window.adminGoPage(' +
      (page - 1) +
      ')">&laquo; Prev</button>';
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);
    for (var i = start; i <= end; i++) {
      html +=
        '<button class="' +
        (i === page ? "active" : "") +
        '" onclick="window.adminGoPage(' +
        i +
        ')">' +
        i +
        "</button>";
    }
    html +=
      "<button " +
      (page === totalPages ? "disabled" : "") +
      ' onclick="window.adminGoPage(' +
      (page + 1) +
      ')">Next &raquo;</button>';
    pagination.innerHTML = html;
  }

  window.adminGoPage = function (p) {
    currentPage = p;
    loadTableData();
  };

  // ── Search ──
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function () {
      currentPage = 1;
      loadTableData();
    }, 400);
  });

  // ── Add Record ──
  document
    .getElementById("addRecordBtn")
    .addEventListener("click", function () {
      editingId = null;
      var cfg = CONFIG[currentTab];
      if (!cfg) return;
      crudModalTitle.textContent = "Add " + cfg.displayName;
      renderCrudForm(cfg, {});
      crudModal.classList.add("show");
    });

  // ── Edit Record ──
  window.adminEditRecord = async function (id) {
    var cfg = CONFIG[currentTab];
    if (!cfg) return;
    try {
      var allResp = await fetch(
        "/api/admin/table/" + currentTab + "?page=1&limit=9999",
      );
      var allData = await allResp.json();
      var row = null;
      for (var i = 0; i < allData.data.length; i++) {
        if (allData.data[i].id === id) {
          row = allData.data[i];
          break;
        }
      }
      if (!row) {
        showToast("Record not found", "error");
        return;
      }
      editingId = id;
      crudModalTitle.textContent = "Edit " + cfg.displayName;
      renderCrudForm(cfg, row);
      crudModal.classList.add("show");
    } catch (err) {
      showToast("Error loading record", "error");
    }
  };

  function renderCrudForm(cfg, data) {
    var html = '<div class="form-grid">';
    for (var i = 0; i < cfg.columns.length; i++) {
      var col = cfg.columns[i];
      html +=
        '<div class="form-group">' +
        "<label>" +
        col.label +
        (col.required ? ' <span style="color:#ff4c4c;">*</span>' : "") +
        "</label>" +
        '<input type="text" id="field_' +
        col.db +
        '" value="' +
        escHtml(data[col.db] || "") +
        '" ' +
        (col.required ? "required" : "") +
        " />" +
        "</div>";
    }
    html += "</div>";
    crudModalBody.innerHTML = html;
  }

  // ── Save Record ──
  document
    .getElementById("crudSaveBtn")
    .addEventListener("click", async function () {
      var cfg = CONFIG[currentTab];
      if (!cfg) return;

      var body = {};
      for (var i = 0; i < cfg.columns.length; i++) {
        var col = cfg.columns[i];
        body[col.db] = document.getElementById("field_" + col.db).value.trim();
      }

      // Validate required
      for (var j = 0; j < cfg.columns.length; j++) {
        var col2 = cfg.columns[j];
        if (col2.required && !body[col2.db]) {
          showToast(col2.label + " is required", "warning");
          return;
        }
      }

      try {
        var resp;
        if (editingId) {
          resp = await fetch(
            "/api/admin/table/" + currentTab + "/" + editingId,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
          );
        } else {
          resp = await fetch("/api/admin/table/" + currentTab, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
        var data = await resp.json();
        if (!data.success) {
          showToast(data.message, "error");
          return;
        }
        showToast(editingId ? "Record updated" : "Record created", "success");
        crudModal.classList.remove("show");
        loadTableData();
      } catch (err) {
        showToast("Error saving record", "error");
      }
    });

  // ── Delete Record ──
  window.adminDeleteRecord = function (id) {
    deleteId = id;
    deleteModal.classList.add("show");
  };

  document
    .getElementById("deleteConfirmBtn")
    .addEventListener("click", async function () {
      if (!deleteId) return;
      try {
        var resp = await fetch(
          "/api/admin/table/" + currentTab + "/" + deleteId,
          { method: "DELETE" },
        );
        var data = await resp.json();
        if (!data.success) {
          showToast(data.message, "error");
          return;
        }
        showToast("Record deleted", "success");
        deleteModal.classList.remove("show");
        deleteId = null;
        loadTableData();
      } catch (err) {
        showToast("Error deleting record", "error");
      }
    });

  // ── Download Template ──
  document
    .getElementById("downloadTemplateBtn")
    .addEventListener("click", function () {
      window.location.href = "/api/admin/template/" + currentTab;
    });

  // ── Upload Modal ──
  document.getElementById("uploadBtn").addEventListener("click", function () {
    var cfg = CONFIG[currentTab];
    if (!cfg) return;
    uploadModalTitle.textContent = "Upload " + cfg.displayName;
    resetUploadModal();
    uploadModal.classList.add("show");
  });

  function resetUploadModal() {
    uploadStep1.style.display = "block";
    uploadStep2.style.display = "none";
    uploadStep3.style.display = "none";
    uploadProgressContainer.style.display = "none";
    insertProgressContainer.style.display = "none";
    insertDataBtn.style.display = "none";
    uploadDoneBtn.style.display = "none";
    uploadProgressBar.style.width = "0%";
    uploadProgressBar.textContent = "0%";
    insertProgressBar.style.width = "0%";
    insertProgressBar.textContent = "0%";
    fileInput.value = "";
    parsedUploadRows = [];
  }

  uploadZone.addEventListener("click", function () {
    fileInput.click();
  });
  uploadZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    uploadZone.style.borderColor = "#6c63ff";
  });
  uploadZone.addEventListener("dragleave", function () {
    uploadZone.style.borderColor = "#ccc";
  });
  uploadZone.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadZone.style.borderColor = "#ccc";
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener("change", function () {
    if (fileInput.files.length) handleFileUpload(fileInput.files[0]);
  });

  function handleFileUpload(file) {
    if (file.size > 10 * 1024 * 1024) {
      showToast("File size exceeds 10MB limit", "error");
      return;
    }
    var ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      showToast("Only .xlsx, .xls, .csv files allowed", "error");
      return;
    }

    uploadProgressContainer.style.display = "block";
    var formData = new FormData();
    formData.append("file", file);

    var xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", function (e) {
      if (e.lengthComputable) {
        var pct = Math.round((e.loaded / e.total) * 100);
        uploadProgressBar.style.width = pct + "%";
        uploadProgressBar.textContent = pct + "%";
      }
    });

    xhr.addEventListener("load", function () {
      try {
        var data = JSON.parse(xhr.responseText);
        if (!data.success) {
          showToast(data.message || "Upload failed", "error");
          resetUploadModal();
          return;
        }
        parsedUploadRows = data.rows;
        uploadProgressBar.style.width = "100%";
        uploadProgressBar.textContent = "100%";

        setTimeout(function () {
          uploadStep1.style.display = "none";
          uploadStep2.style.display = "block";
          uploadSummary.innerHTML =
            '<div class="big-num">' +
            data.totalRows +
            "</div>" +
            '<div class="sub-text">rows parsed from <strong>' +
            escHtml(file.name) +
            "</strong></div>";
          insertDataBtn.style.display = "inline-flex";
        }, 500);
      } catch (err) {
        showToast("Error parsing response", "error");
        resetUploadModal();
      }
    });

    xhr.addEventListener("error", function () {
      showToast("Upload failed", "error");
      resetUploadModal();
    });

    xhr.open("POST", "/api/admin/upload/" + currentTab);
    xhr.send(formData);
  }

  // ── Insert Data ──
  insertDataBtn.addEventListener("click", async function () {
    if (parsedUploadRows.length === 0) return;
    insertDataBtn.style.display = "none";
    insertProgressContainer.style.display = "block";

    // Simulate progress
    var progress = 0;
    var interval = setInterval(function () {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      insertProgressBar.style.width = Math.round(progress) + "%";
      insertProgressBar.textContent = Math.round(progress) + "%";
    }, 300);

    try {
      var resp = await fetch("/api/admin/insert/" + currentTab, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedUploadRows }),
      });
      var data = await resp.json();

      clearInterval(interval);
      insertProgressBar.style.width = "100%";
      insertProgressBar.textContent = "100%";

      setTimeout(function () {
        uploadStep2.style.display = "none";
        uploadStep3.style.display = "block";

        if (data.success) {
          var html = "";
          if (data.skipped > 0) {
            html =
              '<div class="result-icon warning"><i class="fas fa-exclamation-circle"></i></div>' +
              '<div class="result-stats">' +
              "<strong>" +
              data.inserted +
              "</strong> records inserted<br/>" +
              "<strong>" +
              data.skipped +
              "</strong> records skipped (already exist)<br/>";
            if (data.duplicates && data.duplicates.length > 0) {
              html +=
                "<br/><small>Duplicate keys: " +
                data.duplicates.slice(0, 10).join(", ") +
                (data.duplicates.length > 10 ? "..." : "") +
                "</small>";
            }
            html += "</div>";
          } else {
            html =
              '<div class="result-icon success"><i class="fas fa-check-circle"></i></div>' +
              '<div class="result-stats">' +
              "All <strong>" +
              data.inserted +
              "</strong> records inserted successfully!" +
              "</div>";
          }
          uploadResult.innerHTML = html;
        } else {
          uploadResult.innerHTML =
            '<div class="result-icon" style="color:#ff4c4c;"><i class="fas fa-times-circle"></i></div>' +
            '<div class="result-stats">' +
            data.message +
            "</div>";
        }
        uploadDoneBtn.style.display = "inline-flex";
      }, 500);
    } catch (err) {
      clearInterval(interval);
      showToast("Insert failed: " + err.message, "error");
      insertDataBtn.style.display = "inline-flex";
      insertProgressContainer.style.display = "none";
    }
  });

  uploadDoneBtn.addEventListener("click", function () {
    uploadModal.classList.remove("show");
    loadTableData();
  });

  // ── Modal Close Handlers ──
  var closeMap = [
    ["crudModalClose", "crudModal"],
    ["crudCancelBtn", "crudModal"],
    ["uploadModalClose", "uploadModal"],
    ["uploadCancelBtn", "uploadModal"],
    ["deleteModalClose", "deleteModal"],
    ["deleteCancelBtn", "deleteModal"],
  ];
  for (var cm = 0; cm < closeMap.length; cm++) {
    (function (btnId, modalId) {
      document.getElementById(btnId).addEventListener("click", function () {
        document.getElementById(modalId).classList.remove("show");
      });
    })(closeMap[cm][0], closeMap[cm][1]);
  }

  // Close modal on overlay click
  var allModals = [crudModal, uploadModal, deleteModal];
  for (var m = 0; m < allModals.length; m++) {
    (function (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) modal.classList.remove("show");
      });
    })(allModals[m]);
  }

  // ── Logout ──
  document
    .getElementById("logoutBtn")
    .addEventListener("click", async function () {
      try {
        var resp = await fetch("/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        var data = await resp.json();
        if (data.success) window.location.href = data.redirectUrl || "/login";
      } catch (err) {
        window.location.href = "/login";
      }
    });

  // ── Helpers ──
  function escHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Init ──
  loadDashboard();
})();
