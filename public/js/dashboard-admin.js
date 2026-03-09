(function () {
  "use strict";

  // ── Filter elements ──
  const yearSel = document.getElementById("daYearFilter");
  const monthSel = document.getElementById("daMonthFilter");
  const storeHidden = document.getElementById("daStoreFilter");
  const warehouseHidden = document.getElementById("daWarehouseFilter");
  const refreshBtn = document.getElementById("daRefreshBtn");
  const lastUpdatedEl = document.getElementById("daLastUpdated");

  // ── Year dropdown ──
  const curYear = new Date().getFullYear();
  for (let y = curYear - 3; y <= curYear + 3; y++) {
    const o = document.createElement("option");
    o.value = y;
    o.textContent = y;
    if (y === curYear) o.selected = true;
    yearSel.appendChild(o);
  }
  monthSel.value = String(new Date().getMonth() + 1);

  // ── Chart instances ──
  let chartTrend = null;
  let chartStatus = null;
  let chartRepair = null;
  let chartTat = null;

  // ── Palette ──
  const COLORS = {
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

  const STATUS_COLOR_MAP = {
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

  // ── Chart.js global defaults ──
  Chart.defaults.font.family = "'Inter','Segoe UI',system-ui,sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = "#4a5568";

  // ────────────────────────────────────────────────
  // SEARCHABLE DROPDOWN WIDGET
  // ────────────────────────────────────────────────

  /**
   * Creates a searchable dropdown from scratch.
   *
   * @param {object} cfg
   * cfg.dropdownId   – wrapper div id  (e.g. "storeDropdown")
   * cfg.selectedId   – visible trigger div id
   * cfg.panelId      – panel div id
   * cfg.searchInputId– text input id inside panel
   * cfg.listId       – list container id inside panel
   * cfg.hiddenId     – hidden <input> id whose .value is used by loadDashboard
   * cfg.defaultLabel – label for the "All" option (e.g. "All Stores")
   * cfg.onChange     – callback fired when selection changes
   */
  function SearchableDropdown(cfg) {
    this.wrapper = document.getElementById(cfg.dropdownId);
    this.selected = document.getElementById(cfg.selectedId);
    this.panel = document.getElementById(cfg.panelId);
    this.searchInput = document.getElementById(cfg.searchInputId);
    this.list = document.getElementById(cfg.listId);
    this.hidden = document.getElementById(cfg.hiddenId);
    this.defaultLabel = cfg.defaultLabel;
    this.onChange = cfg.onChange || function () {};
    this._allItems = []; // [{id, name}]
    this._open = false;

    // Toggle open/close on trigger click
    this.selected.addEventListener("click", (e) => {
      e.stopPropagation();
      this._open ? this._close() : this._openPanel();
    });

    // Filter list on search input
    this.searchInput.addEventListener("input", () => {
      this._filterList(this.searchInput.value.trim().toLowerCase());
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.wrapper.contains(e.target)) this._close();
    });
  }

  SearchableDropdown.prototype._openPanel = function () {
    this._open = true;
    this.panel.classList.add("da-ss-panel-open");
    this.wrapper.classList.add("da-ss-open");
    this.searchInput.value = "";
    this._filterList("");
    // Focus search after short delay (panel fade-in)
    setTimeout(() => this.searchInput.focus(), 60);
  };

  SearchableDropdown.prototype._close = function () {
    this._open = false;
    this.panel.classList.remove("da-ss-panel-open");
    this.wrapper.classList.remove("da-ss-open");
  };

  SearchableDropdown.prototype._filterList = function (query) {
    const items = this._allItems.filter(
      (it) => !query || it.name.toLowerCase().includes(query),
    );
    this._renderList(items);
  };

  SearchableDropdown.prototype._renderList = function (items) {
    const currentVal = this.hidden.value;
    let html = `<div class="da-ss-option${currentVal === "all" ? " da-ss-option-selected" : ""}" data-value="all">${this.defaultLabel}</div>`;
    items.forEach((it) => {
      const sel = it.id === currentVal ? " da-ss-option-selected" : "";
      html += `<div class="da-ss-option${sel}" data-value="${it.id}">${it.name}</div>`;
    });
    this.list.innerHTML = html;

    // Bind click on each option
    this.list.querySelectorAll(".da-ss-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        const label = opt.textContent;
        this.hidden.value = val;
        this.selected.querySelector(".da-ss-text").textContent = label;
        this._close();
        this.onChange();
      });
    });
  };

  /**
   * Populate the dropdown with items from the API.
   * items = [{id, name}, …]
   */
  SearchableDropdown.prototype.populate = function (items) {
    this._allItems = items;
    const currentVal = this.hidden.value;
    // If current selection no longer exists, reset to "all"
    if (currentVal !== "all" && !items.find((it) => it.id === currentVal)) {
      this.hidden.value = "all";
      this.selected.querySelector(".da-ss-text").textContent =
        this.defaultLabel;
    }
    this._renderList(items);
  };

  // ── Instantiate dropdowns ──
  const storeDrop = new SearchableDropdown({
    dropdownId: "storeDropdown",
    selectedId: "storeSelected",
    panelId: "storePanel",
    searchInputId: "storeSearchInput",
    listId: "storeList",
    hiddenId: "daStoreFilter",
    defaultLabel: "All Stores",
    onChange: () => loadDashboard(),
  });

  const warehouseDrop = new SearchableDropdown({
    dropdownId: "warehouseDropdown",
    selectedId: "warehouseSelected",
    panelId: "warehousePanel",
    searchInputId: "warehouseSearchInput",
    listId: "warehouseList",
    hiddenId: "daWarehouseFilter",
    defaultLabel: "All Warehouses",
    onChange: () => loadDashboard(),
  });

  // Track whether dropdowns have been populated (only do it once)
  let dropdownsReady = false;

  // ────────────────────────────────────────────────
  // LOAD DATA
  // ────────────────────────────────────────────────
  async function loadDashboard() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Loading…";

    const params = new URLSearchParams({
      month: monthSel.value,
      year: yearSel.value,
      store_id: storeHidden.value,
      warehouse_id: warehouseHidden.value,
    });

    try {
      const res = await fetch(`/api/dashboard/stats?${params}`);
      const data = await res.json();
      if (!data.success) {
        console.error("[DA]", data.message);
        return;
      }

      // Populate custom dropdowns only on first load
      if (!dropdownsReady) {
        if (data.stores) storeDrop.populate(data.stores);
        if (data.warehouses) warehouseDrop.populate(data.warehouses);
        dropdownsReady = true;
      }

      renderKPIs(data.kpi);
      renderTrendChart(data.jobsByDate);
      renderStatusDonut(data.statusDist);
      renderRepairPie(data.repairVsReplace);
      renderTatTrend(data.tatByDate);

      const now = new Date();
      lastUpdatedEl.textContent = "Updated " + now.toLocaleTimeString();
    } catch (e) {
      console.error("[DA] fetch error:", e);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg> Refresh`;
    }
  }

  // ────────────────────────────────────────────────
  // KPIs
  // ────────────────────────────────────────────────
  function renderKPIs(kpi) {
    animateCount("kpiActive", kpi.active || 0);
    animateCount("kpiClosed", kpi.closed || 0);
    animateCount("kpiRepaired", kpi.repaired || 0);
    animateCount("kpiReplaced", kpi.replaced || 0);
    animateCount("kpiTotal", kpi.total || 0);
    document.getElementById("kpiTat").textContent = (kpi.avgTat || 0).toFixed(
      1,
    );
  }

  function animateCount(id, target) {
    const el = document.getElementById(id);
    const dur = 700;
    const fps = 30;
    const steps = Math.round(dur / (1000 / fps));
    let step = 0;
    const timer = setInterval(() => {
      step++;
      el.textContent = Math.round(target * (step / steps));
      if (step >= steps) {
        el.textContent = target;
        clearInterval(timer);
      }
    }, 1000 / fps);
  }

  // ────────────────────────────────────────────────
  // CHART 1 — Jobs Over Time (Bar)
  // ────────────────────────────────────────────────
  function renderTrendChart(jobsByDate) {
    const labels = jobsByDate.map((d) => d.date);
    const values = jobsByDate.map((d) => d.count);
    if (chartTrend) chartTrend.destroy();
    chartTrend = new Chart(document.getElementById("chartJobsTrend"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Jobs Created",
            data: values,
            backgroundColor: "rgba(102,126,234,0.75)",
            borderColor: "#667eea",
            borderWidth: 1.5,
            borderRadius: 5,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a202c",
            titleColor: "#e2e8f0",
            bodyColor: "#cbd5e0",
            padding: 10,
            callbacks: {
              title: (items) => items[0].label,
              label: (item) => ` ${item.raw} job${item.raw !== 1 ? "s" : ""}`,
            },
          },
        },
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
      },
    });
  }

  // ────────────────────────────────────────────────
  // CHART 2 — Status Donut
  // ────────────────────────────────────────────────
  function renderStatusDonut(statusDist) {
    const labels = statusDist.map((d) => d.status);
    const values = statusDist.map((d) => d.count);
    const colors = labels.map(statusColor);
    if (chartStatus) chartStatus.destroy();
    chartStatus = new Chart(document.getElementById("chartStatusDonut"), {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: "#fff",
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a202c",
            titleColor: "#e2e8f0",
            bodyColor: "#cbd5e0",
            padding: 10,
            callbacks: { label: (item) => ` ${item.label}: ${item.raw}` },
          },
        },
      },
    });
    renderLegend("legendStatus", labels, values, colors);
  }

  // ────────────────────────────────────────────────
  // CHART 3 — Repair vs Replacement Pie
  // ────────────────────────────────────────────────
  function renderRepairPie(repairData) {
    const labels = ["Repaired", "Replaced"];
    const values = [repairData.repaired || 0, repairData.replaced || 0];
    const colors = [COLORS.teal, COLORS.red];
    if (chartRepair) chartRepair.destroy();
    chartRepair = new Chart(document.getElementById("chartRepairPie"), {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: "#fff",
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a202c",
            titleColor: "#e2e8f0",
            bodyColor: "#cbd5e0",
            padding: 10,
            callbacks: { label: (item) => ` ${item.label}: ${item.raw}` },
          },
        },
      },
    });
    renderLegend("legendRepair", labels, values, colors);
  }

  // ────────────────────────────────────────────────
  // CHART 4 — Avg TAT Trend (Area Line)
  // ────────────────────────────────────────────────
  function renderTatTrend(tatByDate) {
    const labels = tatByDate.map((d) => d.date);
    const values = tatByDate.map((d) => parseFloat(d.avgTat.toFixed(2)));
    if (chartTat) chartTat.destroy();
    chartTat = new Chart(document.getElementById("chartTatTrend"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Avg TAT (Days)",
            data: values,
            borderColor: "#ed8936",
            borderWidth: 2.5,
            pointBackgroundColor: "#ed8936",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            backgroundColor: (ctx) => {
              const canvas = ctx.chart.canvas;
              const gradient = canvas
                .getContext("2d")
                .createLinearGradient(0, 0, 0, canvas.height);
              gradient.addColorStop(0, "rgba(237,137,54,0.25)");
              gradient.addColorStop(1, "rgba(237,137,54,0.02)");
              return gradient;
            },
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1a202c",
            titleColor: "#e2e8f0",
            bodyColor: "#cbd5e0",
            padding: 10,
            callbacks: {
              label: (item) => ` ${item.raw} day${item.raw !== 1 ? "s" : ""}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#f0f2f7" },
            ticks: { font: { size: 10 } },
          },
        },
      },
    });
  }

  // ────────────────────────────────────────────────
  // CUSTOM LEGEND
  // ────────────────────────────────────────────────
  function renderLegend(containerId, labels, values, colors) {
    const total = values.reduce((a, b) => a + b, 0);
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = labels
      .map((label, i) => {
        const pct = total ? Math.round((values[i] / total) * 100) : 0;
        return `
        <div class="da-legend-item">
          <span class="da-legend-dot"   style="background:${colors[i]}"></span>
          <span class="da-legend-label">${label}</span>
          <span class="da-legend-value">${values[i]}</span>
          <span class="da-legend-pct">${pct}%</span>
        </div>`;
      })
      .join("");
  }

  // ── Events ──
  monthSel.addEventListener("change", loadDashboard);
  yearSel.addEventListener("change", loadDashboard);
  refreshBtn.addEventListener("click", loadDashboard);

  // Auto-refresh every 2 minutes
  setInterval(loadDashboard, 120_000);

  loadDashboard();
})();
