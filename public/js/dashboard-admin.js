(function () {
  "use strict";
  var daRole = (window.DA_ROLE || "").toLowerCase().trim();
  var isRM = daRole === "rm";
  var yearSel = document.getElementById("daYearFilter");
  var monthSel = document.getElementById("daMonthFilter");
  var storeHidden = document.getElementById("daStoreFilter");
  var warehouseHidden = document.getElementById("daWarehouseFilter");
  var refreshBtn = document.getElementById("daRefreshBtn");
  var lastUpdatedEl = document.getElementById("daLastUpdated");
  var warehouseFilterGroup = document.getElementById("warehouseFilterGroup");
  if (isRM && warehouseFilterGroup) warehouseFilterGroup.style.display = "none";

  var curYear = new Date().getFullYear();
  for (var y = curYear - 3; y <= curYear + 3; y++) {
    var o = document.createElement("option");
    o.value = y;
    o.textContent = y;
    if (y === curYear) o.selected = true;
    yearSel.appendChild(o);
  }
  monthSel.value = String(new Date().getMonth() + 1);

  var chartTrend = null,
    chartStatus = null,
    chartRepair = null,
    chartTat = null,
    chartBarcode = null,
    chartItemId = null;
  var COLORS = {
    purple: "#667eea",
    indigo: "#764ba2",
    green: "#38a169",
    teal: "#38b2ac",
    orange: "#ed8936",
    red: "#e53e3e",
    blue: "#3182ce",
    pink: "#d53f8c",
    yellow: "#d69e2e",
    gray: "#a0aec0",
  };
  var STATUS_COLOR_MAP = {
    open: COLORS.blue,
    closed: COLORS.green,
    pending: COLORS.orange,
    "sent to warehouse": COLORS.purple,
    "warehouse received": COLORS.indigo,
    "sent to vendor": COLORS.orange,
    "vendor: repaired": COLORS.teal,
    "vendor: replaced": COLORS.red,
    "sent to store": COLORS.pink,
    "store received": COLORS.yellow,
  };
  function statusColor(s) {
    return STATUS_COLOR_MAP[(s || "").toLowerCase().trim()] || COLORS.gray;
  }
  Chart.defaults.font.family = "'Inter','Segoe UI',system-ui,sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = "#4a5568";

  // ── MultiSelectDropdown ──
  function MultiSelectDropdown(cfg) {
    var self = this;
    self.wrapper = document.getElementById(cfg.dropdownId);
    self.selected = document.getElementById(cfg.selectedId);
    self.panel = document.getElementById(cfg.panelId);
    self.searchInput = document.getElementById(cfg.searchInputId);
    self.list = document.getElementById(cfg.listId);
    self.hidden = document.getElementById(cfg.hiddenId);
    self.defaultLabel = cfg.defaultLabel;
    self.onChange = cfg.onChange || function () {};
    self._allItems = [];
    self._selectedIds = new Set();
    self._open = false;
    self.selected.addEventListener("click", function (e) {
      e.stopPropagation();
      self._open ? self._close() : self._openPanel();
    });
    self.searchInput.addEventListener("input", function () {
      self._filterList(self.searchInput.value.trim().toLowerCase());
    });
    document.addEventListener("click", function (e) {
      if (!self.wrapper.contains(e.target)) self._close();
    });
  }
  MultiSelectDropdown.prototype._openPanel = function () {
    this._open = true;
    this.panel.classList.add("da-ss-panel-open");
    this.wrapper.classList.add("da-ss-open");
    this.searchInput.value = "";
    this._filterList("");
    var i = this.searchInput;
    setTimeout(function () {
      i.focus();
    }, 60);
  };
  MultiSelectDropdown.prototype._close = function () {
    this._open = false;
    this.panel.classList.remove("da-ss-panel-open");
    this.wrapper.classList.remove("da-ss-open");
  };
  MultiSelectDropdown.prototype._filterList = function (q) {
    var items = this._allItems.filter(function (it) {
      return !q || it.name.toLowerCase().indexOf(q) !== -1;
    });
    this._renderList(items);
  };
  MultiSelectDropdown.prototype._renderList = function (items) {
    var self = this;
    var isAll = self._selectedIds.size === 0;
    var html =
      '<label class="da-ss-option da-ss-option-all' +
      (isAll ? " da-ss-option-checked" : "") +
      '"><input type="checkbox" class="da-ss-checkbox" data-value="all"' +
      (isAll ? " checked" : "") +
      '><span class="da-ss-checkmark"></span><span>' +
      self.defaultLabel +
      "</span></label>";
    items.forEach(function (it) {
      var c = self._selectedIds.has(it.id);
      html +=
        '<label class="da-ss-option' +
        (c ? " da-ss-option-checked" : "") +
        '"><input type="checkbox" class="da-ss-checkbox" data-value="' +
        it.id +
        '"' +
        (c ? " checked" : "") +
        '><span class="da-ss-checkmark"></span><span>' +
        it.name +
        "</span></label>";
    });
    self.list.innerHTML = html;
    self.list.querySelectorAll(".da-ss-checkbox").forEach(function (cb) {
      cb.addEventListener("change", function (e) {
        e.stopPropagation();
        var v = cb.dataset.value;
        if (v === "all") {
          self._selectedIds.clear();
        } else {
          if (cb.checked) self._selectedIds.add(v);
          else self._selectedIds.delete(v);
        }
        self._updateHidden();
        self._updateLabel();
        self._filterList(self.searchInput.value.trim().toLowerCase());
        self.onChange();
      });
    });
  };
  MultiSelectDropdown.prototype._updateHidden = function () {
    this.hidden.value =
      this._selectedIds.size === 0
        ? "all"
        : Array.from(this._selectedIds).join(",");
  };
  MultiSelectDropdown.prototype._updateLabel = function () {
    var t = this.selected.querySelector(".da-ss-text");
    if (this._selectedIds.size === 0) t.textContent = this.defaultLabel;
    else if (this._selectedIds.size === 1) {
      var id = Array.from(this._selectedIds)[0];
      var it = this._allItems.find(function (x) {
        return x.id === id;
      });
      t.textContent = it ? it.name : id;
    } else t.textContent = this._selectedIds.size + " selected";
  };
  MultiSelectDropdown.prototype.populate = function (items) {
    this._allItems = items;
    var v = new Set(
      items.map(function (i) {
        return i.id;
      }),
    );
    var r = [];
    this._selectedIds.forEach(function (id) {
      if (!v.has(id)) r.push(id);
    });
    r.forEach(
      function (id) {
        this._selectedIds.delete(id);
      }.bind(this),
    );
    this._updateHidden();
    this._updateLabel();
    this._renderList(items);
  };

  var storeDrop = new MultiSelectDropdown({
    dropdownId: "storeDropdown",
    selectedId: "storeSelected",
    panelId: "storePanel",
    searchInputId: "storeSearchInput",
    listId: "storeList",
    hiddenId: "daStoreFilter",
    defaultLabel: isRM ? "All My Stores" : "All Stores",
    onChange: function () {
      loadDashboard();
    },
  });
  var warehouseDrop = null;
  if (!isRM)
    warehouseDrop = new MultiSelectDropdown({
      dropdownId: "warehouseDropdown",
      selectedId: "warehouseSelected",
      panelId: "warehousePanel",
      searchInputId: "warehouseSearchInput",
      listId: "warehouseList",
      hiddenId: "daWarehouseFilter",
      defaultLabel: "All Warehouses",
      onChange: function () {
        loadDashboard();
      },
    });
  var dropdownsReady = false;

  function getFilterParams() {
    return new URLSearchParams({
      month: monthSel.value,
      year: yearSel.value,
      store_id: storeHidden.value,
      warehouse_id: isRM ? "all" : warehouseHidden.value,
    });
  }

  // ── Load Dashboard ──
  async function loadDashboard() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Loading...";
    try {
      var res = await fetch("/api/dashboard/stats?" + getFilterParams());
      var data = await res.json();
      if (!data.success) {
        console.error("[DA]", data.message);
        return;
      }
      if (!dropdownsReady) {
        if (data.stores) storeDrop.populate(data.stores);
        if (!isRM && warehouseDrop && data.warehouses)
          warehouseDrop.populate(data.warehouses);
        dropdownsReady = true;
      }
      renderKPIs(data.kpi);
      renderTrendChart(data.jobsByDate);
      renderStatusDonut(data.statusDist);
      renderRepairPie(data.repairVsReplace);
      renderTatTrend(data.tatByDate);
      renderBarcodeChart(data.topBarcodes);
      renderItemIdChart(data.topItemIds);
      lastUpdatedEl.textContent = "Updated " + new Date().toLocaleTimeString();
    } catch (e) {
      console.error("[DA] fetch error:", e);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> Refresh';
    }
  }

  // ── KPIs ──
  function renderKPIs(k) {
    animateCount("kpiActive", k.active || 0);
    animateCount("kpiClosed", k.closed || 0);
    animateCount("kpiRepaired", k.repaired || 0);
    animateCount("kpiReplaced", k.replaced || 0);
    animateCount("kpiTotal", k.total || 0);
    document.getElementById("kpiTat").textContent = (k.avgTat || 0).toFixed(1);
  }
  function animateCount(id, t) {
    var el = document.getElementById(id);
    var s = 0;
    var st = Math.round(700 / (1000 / 30));
    var tm = setInterval(function () {
      s++;
      el.textContent = Math.round(t * (s / st));
      if (s >= st) {
        el.textContent = t;
        clearInterval(tm);
      }
    }, 1000 / 30);
  }

  var chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a202c",
        titleColor: "#e2e8f0",
        bodyColor: "#cbd5e0",
        padding: 10,
      },
    },
  };

  // ── Charts ──
  function renderTrendChart(d) {
    var l = d.map(function (x) {
        return x.date;
      }),
      v = d.map(function (x) {
        return x.count;
      });
    if (chartTrend) chartTrend.destroy();
    chartTrend = new Chart(document.getElementById("chartJobsTrend"), {
      type: "bar",
      data: {
        labels: l,
        datasets: [
          {
            label: "Jobs",
            data: v,
            backgroundColor: "rgba(102,126,234,0.75)",
            borderColor: "#667eea",
            borderWidth: 1.5,
            borderRadius: 5,
            borderSkipped: false,
          },
        ],
      },
      options: Object.assign({}, chartOpts, {
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#f0f2f7" },
            ticks: { stepSize: 1, precision: 0 },
          },
        },
      }),
    });
  }

  function renderStatusDonut(d) {
    var l = d.map(function (x) {
        return x.status;
      }),
      v = d.map(function (x) {
        return x.count;
      }),
      c = l.map(statusColor);
    if (chartStatus) chartStatus.destroy();
    chartStatus = new Chart(document.getElementById("chartStatusDonut"), {
      type: "doughnut",
      data: {
        labels: l,
        datasets: [
          {
            data: v,
            backgroundColor: c,
            borderColor: "#fff",
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: Object.assign({}, chartOpts, { cutout: "62%" }),
    });
    renderLegend("legendStatus", l, v, c);
  }

  function renderRepairPie(d) {
    var l = ["Repaired", "Replaced"],
      v = [d.repaired || 0, d.replaced || 0],
      c = [COLORS.teal, COLORS.red];
    if (chartRepair) chartRepair.destroy();
    chartRepair = new Chart(document.getElementById("chartRepairPie"), {
      type: "pie",
      data: {
        labels: l,
        datasets: [
          {
            data: v,
            backgroundColor: c,
            borderColor: "#fff",
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: chartOpts,
    });
    renderLegend("legendRepair", l, v, c);
  }

  function renderTatTrend(d) {
    var l = d.map(function (x) {
        return x.date;
      }),
      v = d.map(function (x) {
        return parseFloat(x.avgTat.toFixed(2));
      });
    if (chartTat) chartTat.destroy();
    chartTat = new Chart(document.getElementById("chartTatTrend"), {
      type: "line",
      data: {
        labels: l,
        datasets: [
          {
            label: "Avg TAT",
            data: v,
            borderColor: "#ed8936",
            borderWidth: 2.5,
            pointBackgroundColor: "#ed8936",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
            fill: true,
            backgroundColor: "rgba(237,137,54,0.15)",
            tension: 0.4,
          },
        ],
      },
      options: Object.assign({}, chartOpts, {
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, font: { size: 10 } },
          },
          y: { beginAtZero: true, grid: { color: "#f0f2f7" } },
        },
      }),
    });
  }

  function renderBarcodeChart(d) {
    var l = d.map(function (x) {
        return x.barcode;
      }),
      v = d.map(function (x) {
        return parseInt(x.count);
      });
    if (chartBarcode) chartBarcode.destroy();
    chartBarcode = new Chart(document.getElementById("chartBarcode"), {
      type: "line",
      data: {
        labels: l,
        datasets: [
          {
            label: "Count",
            data: v,
            borderColor: COLORS.purple,
            borderWidth: 2.5,
            pointBackgroundColor: COLORS.purple,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
            fill: true,
            backgroundColor: "rgba(102,126,234,0.15)",
            tension: 0.4,
          },
        ],
      },
      options: Object.assign({}, chartOpts, {
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 60, font: { size: 9 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#f0f2f7" },
            ticks: { stepSize: 1, precision: 0 },
          },
        },
      }),
    });
  }

  function renderItemIdChart(d) {
    var l = d.map(function (x) {
        return x.item_id;
      }),
      v = d.map(function (x) {
        return parseInt(x.count);
      });
    if (chartItemId) chartItemId.destroy();
    chartItemId = new Chart(document.getElementById("chartItemId"), {
      type: "bar",
      data: {
        labels: l,
        datasets: [
          {
            label: "Count",
            data: v,
            backgroundColor: "rgba(56,178,172,0.75)",
            borderColor: COLORS.teal,
            borderWidth: 1.5,
            borderRadius: 5,
            borderSkipped: false,
          },
        ],
      },
      options: Object.assign({}, chartOpts, {
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 60, font: { size: 9 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#f0f2f7" },
            ticks: { stepSize: 1, precision: 0 },
          },
        },
      }),
    });
  }

  function renderLegend(id, labels, values, colors) {
    var total = values.reduce(function (a, b) {
      return a + b;
    }, 0);
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = labels
      .map(function (l, i) {
        var p = total ? Math.round((values[i] / total) * 100) : 0;
        return (
          '<div class="da-legend-item"><span class="da-legend-dot" style="background:' +
          colors[i] +
          '"></span><span class="da-legend-label">' +
          l +
          '</span><span class="da-legend-value">' +
          values[i] +
          '</span><span class="da-legend-pct">' +
          p +
          "%</span></div>"
        );
      })
      .join("");
  }

  // ── Fullscreen ──
  var fsModal = document.getElementById("fsModal"),
    fsBody = document.getElementById("fsModalBody"),
    fsTitle = document.getElementById("fsModalTitle"),
    fsClose = document.getElementById("fsModalClose");

  document.querySelectorAll(".da-chart-fs-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cardId = btn.dataset.card;
      var card = document.getElementById(cardId);
      if (!card) return;
      var titleEl = card.querySelector(".da-chart-title");
      fsTitle.textContent = titleEl ? titleEl.textContent : "Chart";

      // Clone the entire chart card content into fullscreen
      var chartBody = card.querySelector(".da-chart-body");
      var legendEl = card.querySelector(".da-legend");
      if (!chartBody) return;

      // Use html2canvas to capture the card at high resolution
      var captureEl = document.createElement("div");
      captureEl.style.cssText =
        "position:absolute;left:-9999px;top:0;width:" +
        card.offsetWidth +
        "px;";
      captureEl.appendChild(chartBody.cloneNode(true));
      if (legendEl) captureEl.appendChild(legendEl.cloneNode(true));
      document.body.appendChild(captureEl);

      html2canvas(card, { scale: 3, backgroundColor: "#ffffff", useCORS: true })
        .then(function (canvas) {
          document.body.removeChild(captureEl);
          var imgData = canvas.toDataURL("image/png");
          fsBody.innerHTML =
            '<img src="' +
            imgData +
            '" style="width:100%;height:100%;object-fit:contain;display:block;">';
          fsModal.classList.remove("hidden");
        })
        .catch(function () {
          document.body.removeChild(captureEl);
          // Fallback: use canvas directly
          var cv = card.querySelector("canvas");
          if (cv) {
            var img = cv.toDataURL("image/png", 1.0);
            var legendHTML = legendEl ? legendEl.outerHTML : "";
            fsBody.innerHTML =
              '<div style="display:flex;flex-direction:column;height:100%;align-items:center;justify-content:center;"><img src="' +
              img +
              '" style="max-width:95%;max-height:' +
              (legendHTML ? "80" : "95") +
              '%;object-fit:contain;">' +
              (legendHTML
                ? '<div style="padding:16px 30px;width:100%;">' +
                  legendHTML +
                  "</div>"
                : "") +
              "</div>";
          }
          fsModal.classList.remove("hidden");
        });
    });
  });
  fsClose.addEventListener("click", function () {
    fsModal.classList.add("hidden");
    fsBody.innerHTML = "";
  });
  fsModal.addEventListener("click", function (e) {
    if (e.target === fsModal) {
      fsModal.classList.add("hidden");
      fsBody.innerHTML = "";
    }
  });

  // ── Download single chart PDF ──
  document.querySelectorAll(".da-chart-dl-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var canvasId = btn.dataset.chart;
      var card = btn.closest(".da-chart-card");
      if (!card) return;
      var titleEl = card.querySelector(".da-chart-title");
      var title = titleEl ? titleEl.textContent : "Chart";
      btn.textContent = "...";
      btn.disabled = true;

      html2canvas(card, { scale: 3, backgroundColor: "#ffffff", useCORS: true })
        .then(function (canvas) {
          var imgData = canvas.toDataURL("image/png");
          var jsPDF = window.jspdf.jsPDF;
          var pdf = new jsPDF("l", "mm", "a4");
          var pageW = pdf.internal.pageSize.getWidth();
          var pageH = pdf.internal.pageSize.getHeight();
          var imgW = pageW - 20;
          var imgH = (canvas.height / canvas.width) * imgW;
          if (imgH > pageH - 20) {
            imgH = pageH - 20;
            imgW = (canvas.width / canvas.height) * imgH;
          }
          var x = (pageW - imgW) / 2;
          var y = (pageH - imgH) / 2;
          pdf.addImage(imgData, "PNG", x, y, imgW, imgH);
          pdf.save(title.replace(/\s+/g, "_") + ".pdf");
        })
        .catch(function (err) {
          console.error("PDF error:", err);
        })
        .finally(function () {
          btn.textContent = "\u2B07";
          btn.disabled = false;
        });
    });
  });

  // ── Download ALL graphs as single-page PDF ──
  document
    .getElementById("downloadAllGraphsBtn")
    .addEventListener("click", function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = "Generating...";

      // Capture entire charts grid
      var chartsGrid = document.getElementById("chartsGrid");
      if (!chartsGrid) {
        btn.disabled = false;
        return;
      }

      html2canvas(chartsGrid, {
        scale: 2,
        backgroundColor: "#ede8e1",
        useCORS: true,
        scrollY: -window.scrollY,
      })
        .then(function (canvas) {
          var imgData = canvas.toDataURL("image/png");
          var jsPDF = window.jspdf.jsPDF;

          // Use landscape, fit the entire grid on one page
          var imgW = canvas.width;
          var imgH = canvas.height;
          var ratio = imgW / imgH;

          // Custom page size to match aspect ratio
          var pageW = 297; // A4 landscape width in mm
          var pageH = pageW / ratio;
          if (pageH < 150) pageH = 150;

          var pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [pageW, pageH],
          });
          pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
          pdf.save("Dashboard_All_Graphs.pdf");
        })
        .catch(function (err) {
          console.error("All PDF error:", err);
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Graphs PDF';
        });
    });

  // ── Download Raw Data XLSX ──
  document
    .getElementById("downloadRawDataBtn")
    .addEventListener("click", async function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = "Downloading...";
      try {
        var res = await fetch("/api/dashboard/raw-data?" + getFilterParams());
        var data = await res.json();
        if (!data.success || !data.rows || !data.rows.length) {
          alert("No data found for selected filters.");
          return;
        }

        var headers = Object.keys(data.rows[0]);
        var aoa = [headers];
        data.rows.forEach(function (row) {
          aoa.push(
            headers.map(function (h) {
              return row[h] != null ? row[h] : "";
            }),
          );
        });

        var ws = XLSX.utils.aoa_to_sheet(aoa);

        // Column widths
        var colWidths = headers.map(function (h, i) {
          var maxLen = h.length;
          data.rows.forEach(function (row) {
            var val = String(row[h] || "");
            if (val.length > maxLen) maxLen = val.length;
          });
          return { wch: Math.min(maxLen + 3, 45) };
        });
        ws["!cols"] = colWidths;

        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Job Data");
        XLSX.writeFile(
          wb,
          "Raw_Data_" + new Date().toISOString().slice(0, 10) + ".xlsx",
        );
      } catch (e) {
        console.error("XLSX error:", e);
        alert("Error downloading data.");
      } finally {
        btn.disabled = false;
        btn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> Raw Data';
      }
    });

  monthSel.addEventListener("change", loadDashboard);
  yearSel.addEventListener("change", loadDashboard);
  refreshBtn.addEventListener("click", loadDashboard);
  setInterval(loadDashboard, 120000);
  loadDashboard();
})();
