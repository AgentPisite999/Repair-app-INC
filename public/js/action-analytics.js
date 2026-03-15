document.addEventListener("DOMContentLoaded", () => {
  const pageLoader = document.getElementById("pageLoader");
  setTimeout(() => pageLoader.classList.add("hidden"), 400);

  const userRole = ((window.USER_ROLE || "") + "").toLowerCase().trim();
  const isStore = userRole === "store";
  const isWarehouse = userRole.startsWith("warehouse");
  const isAdmin = userRole === "admin";

  const totalCols = 12 + (isStore ? 1 : 0) + (isAdmin ? 1 : 0);

  const yearSelect = document.getElementById("yearFilter");
  const curYear = new Date().getFullYear();
  for (let y = curYear - 3; y <= curYear + 3; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === curYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  const monthSelect = document.getElementById("monthFilter");
  monthSelect.value = String(new Date().getMonth() + 1);

  const statusFilter = document.getElementById("statusFilter");
  const searchInput = document.getElementById("searchInput");
  const refreshBtn = document.getElementById("refreshBtn");
  const jobTableBody = document.getElementById("jobTableBody");
  const kpiTotal = document.getElementById("kpiTotal");
  const kpiClosed = document.getElementById("kpiClosed");
  const kpiPending = document.getElementById("kpiPending");
  const kpiMeta = document.getElementById("kpiMeta");

  const adminEditModal = document.getElementById("adminEditModal");
  const adminEditJobId = document.getElementById("adminEditJobId");
  const closeAdminEditModal = document.getElementById("closeAdminEditModal");
  const cancelAdminEditBtn = document.getElementById("cancelAdminEditBtn");
  const saveAdminEditBtn = document.getElementById("saveAdminEditBtn");
  const adminEditError = document.getElementById("adminEditError");

  const ae = (id) => document.getElementById(id);
  const AE = {
    CustomerNumber: ae("ae_CustomerNumber"),
    CustomerName: ae("ae_CustomerName"),
    Store_Id: ae("ae_Store_Id"),
    ITEM_ID: ae("ae_ITEM_ID"),
    ProductUnder90Days: ae("ae_ProductUnder90Days"),
    DeliveryDate: ae("ae_DeliveryDate"),
    Status: ae("ae_Status"),
    Ticket_Closing_Date: ae("ae_Ticket_Closing_Date"),
    WarehouseID: ae("ae_WarehouseID"),
    WarehouseName: ae("ae_WarehouseName"),
    CourierName: ae("ae_CourierName"),
    AWB: ae("ae_AWB"),
    DispatchDate: ae("ae_DispatchDate"),
    Warehouse_Receive_Date: ae("ae_Warehouse_Receive_Date"),
    WarehouseRemarks: ae("ae_WarehouseRemarks"),
    Warehouse_Sent_Date: ae("ae_Warehouse_Sent_Date"),
    Vendor_Name: ae("ae_Vendor_Name"),
    Vendor_Awb: ae("ae_Vendor_Awb"),
    Gate_Pass_No: ae("ae_Gate_Pass_No"),
    Vendor_Sent_Date: ae("ae_Vendor_Sent_Date"),
    Vendor_Decision: ae("ae_Vendor_Decision"),
    Vendor_Decision_Date: ae("ae_Vendor_Decision_Date"),
    Store_Sent_Date: ae("ae_Store_Sent_Date"),
    Store_Received_Date: ae("ae_Store_Received_Date"),
    Closing_Ticket_Remarks: ae("ae_Closing_Ticket_Remarks"),
    Merchandise_Decision: ae("ae_Merchandise_Decision"),
    Merchandise_Action: ae("ae_Merchandise_Action"),
    Return_Store_AWB: ae("ae_Return_Store_AWB"),
    Return_Store_Remarks: ae("ae_Return_Store_Remarks"),
    AdminNote: ae("ae_AdminNote"),
  };

  const whTransferModal = document.getElementById("whTransferModal");
  const whTransferForm = document.getElementById("whTransferForm");
  const whTransferJobIdEl = document.getElementById("whTransferJobId");
  const whWarehouseIdSel = document.getElementById("wh_warehouse_id");
  const whWarehouseNameHid = document.getElementById("wh_warehouse_name");
  const whCourierSel = document.getElementById("wh_courier_name");
  const whAwbInput = document.getElementById("wh_awb");
  const whDispatchInput = document.getElementById("wh_dispatch_date");
  const whRemarksInput = document.getElementById("wh_remarks");
  const whAttachFileInput = document.getElementById("wh_attach_file_transfer");
  const whTransferPreviewWrap = document.getElementById("whTransferPreviewWrap");
  const whTransferPreviewImg = document.getElementById("whTransferPreviewImg");
  const whTransferFileLabel = document.getElementById("whTransferFileLabel");
  const clearWhTransferAttach = document.getElementById("clearWhTransferAttach");
  const whExistingAttach = document.getElementById("whExistingAttach");
  const whExistingLabel = document.getElementById("whExistingLabel");
  const whViewExistingBtn = document.getElementById("whViewExistingBtn");
  const whTransferError = document.getElementById("whTransferError");
  const sendToWarehouseBtn = document.getElementById("sendToWarehouseBtn");
  const closeWhTransferModal = document.getElementById("closeWhTransferModal");
  const cancelWhTransferBtn = document.getElementById("cancelWhTransferBtn");
  const saveWhDraftBtn = document.getElementById("saveWhDraftBtn");

  const storeAckModal = document.getElementById("storeAckModal");
  const storeAckJobId = document.getElementById("storeAckJobId");
  const confirmStoreAckBtn = document.getElementById("confirmStoreAckBtn");
  const cancelStoreAckBtn = document.getElementById("cancelStoreAckBtn");
  const closeStoreAckModal = document.getElementById("closeStoreAckModal");

  const whAckModal = document.getElementById("whAckModal");
  const whAckJobId = document.getElementById("whAckJobId");
  const confirmWhAckBtn = document.getElementById("confirmWhAckBtn");
  const cancelWhAckBtn = document.getElementById("cancelWhAckBtn");
  const closeWhAckModal = document.getElementById("closeWhAckModal");

  const sendVendorModal = document.getElementById("sendVendorModal");
  const sendVendorJobId = document.getElementById("sendVendorJobId");
  const vendorSelect = document.getElementById("vendor_select");
  const vendorGatePass = document.getElementById("vendor_gate_pass");
  const vendorSentDate = document.getElementById("vendor_sent_date");
  const vendorAwb = document.getElementById("vendor_awb");
  const sendVendorError = document.getElementById("sendVendorError");
  const confirmSendVendorBtn = document.getElementById("confirmSendVendorBtn");
  const saveVendorDraftBtn = document.getElementById("saveVendorDraftBtn");
  const cancelSendVendorBtn = document.getElementById("cancelSendVendorBtn");
  const closeSendVendorModal = document.getElementById("closeSendVendorModal");

  const vendorDecisionModal = document.getElementById("vendorDecisionModal");
  const vendorDecisionJobId = document.getElementById("vendorDecisionJobId");
  const vendorDecisionSelect = document.getElementById("vendor_decision_select");
  const vendorDecisionDate = document.getElementById("vendor_decision_date");
  const vendorDecisionError = document.getElementById("vendorDecisionError");
  const confirmVendorDecisionBtn = document.getElementById("confirmVendorDecisionBtn");
  const cancelVendorDecisionBtn = document.getElementById("cancelVendorDecisionBtn");
  const closeVendorDecisionModal = document.getElementById("closeVendorDecisionModal");

  const returnStoreModal = document.getElementById("returnStoreModal");
  const returnStoreJobId = document.getElementById("returnStoreJobId");
  const returnStoreAwbInput = document.getElementById("return_store_awb");
  const returnStoreRemarksInput = document.getElementById("return_store_remarks");
  const returnStoreError = document.getElementById("returnStoreError");
  const confirmReturnStoreBtn = document.getElementById("confirmReturnStoreBtn");
  const cancelReturnStoreBtn = document.getElementById("cancelReturnStoreBtn");
  const closeReturnStoreModal = document.getElementById("closeReturnStoreModal");

  const deliveryModal = document.getElementById("deliveryModal");
  const deliveryJobIdEl = document.getElementById("deliveryJobId");
  const newDeliveryDate = document.getElementById("newDeliveryDate");
  const saveDeliveryBtn = document.getElementById("saveDeliveryBtn");
  const closeDeliveryModal = document.getElementById("closeDeliveryModal");
  const cancelDeliveryBtn = document.getElementById("cancelDeliveryBtn");

  const merchDecisionModal = document.getElementById("merchDecisionModal");
  const merchDecisionJobId = document.getElementById("merchDecisionJobId");
  const merchDecisionSelect = document.getElementById("merchDecisionSelect");
  const merchActionSelect = document.getElementById("merchActionSelect");
  const merchDecisionError = document.getElementById("merchDecisionError");
  const merchProceedOtpBtn = document.getElementById("merchProceedOtpBtn");
  const closeMerchDecisionModal = document.getElementById("closeMerchDecisionModal");
  const cancelMerchDecisionBtn = document.getElementById("cancelMerchDecisionBtn");

  const closeTicketModal = document.getElementById("closeTicketModal");
  const closeJobIdEl = document.getElementById("closeJobId");
  const closeRemarks = document.getElementById("closeRemarks");
  const closeTicketError = document.getElementById("closeTicketError");
  const confirmCloseBtn = document.getElementById("confirmCloseBtn");
  const closeTicketModalBtn = document.getElementById("closeTicketModalBtn");
  const cancelCloseBtn = document.getElementById("cancelCloseBtn");

  let activeJobId = null;
  let activeJobForWh = null;
  let activeJobForAdmin = null;
  const jobMap = {};

  let pendingMerchDecision = "";
  let pendingMerchAction = "";

  // ══════════════════════════════════════════════════════════
  // SCANNER-ONLY AWB FIELDS
  // Prevents manual keyboard typing; accepts only barcode/QR
  // scanner input (which fires chars very rapidly, < 80ms apart)
  // ══════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════
  // SMART AWB SCAN FIELDS
  // — Prefers scanner input (fast chars < 80ms apart)
  // — If user types manually (slow), still allowed BUT value
  //   gets " - Typed" suffix appended on blur/submit so DB
  //   and receipt always show e.g. "ABC123 - Typed"
  // — Gate Pass fields are intentionally NOT in this list
  //   (they remain normal free-text inputs)
  // ══════════════════════════════════════════════════════════
  const AWB_SCAN_IDS = [
    "wh_awb",
    "vendor_awb",
    "return_store_awb",
    "ae_AWB",
    "ae_Vendor_Awb",
    "ae_Return_Store_AWB",
  ];

  const SCAN_SPEED_MS  = 80;   // scanner chars arrive < 80ms apart
  const TYPED_SUFFIX   = " - Typed";
  const _scanBuf       = {};
  const _scanTmr       = {};
  const _lastKey       = {};
  const _isScanned     = {}; // true = value came from scanner
  const _scanInited    = new Set();

  // Commit a scanner-originated value (no suffix)
  function commitScan(el, value) {
    _isScanned[el.id] = true;
    // Strip any existing " - Typed" suffix if user previously typed
    const clean = value.replace(/ - Typed$/i, "").trim();
    el.value = clean;
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    // Green flash
    el.style.borderColor = "#16a34a";
    el.style.background  = "#f0fdf4";
    el.style.color       = "#15803d";
    setTimeout(() => {
      el.style.borderColor = "";
      el.style.background  = "";
      el.style.color       = "";
    }, 1400);
  }

  // Append " - Typed" suffix when user manually types and leaves field
  function applyTypedSuffix(el) {
    const raw = el.value.trim();
    if (!raw) return; // empty — leave alone
    if (_isScanned[el.id]) return; // came from scanner — no suffix
    // Already has suffix — don't double-add
    if (raw.endsWith(" - Typed")) return;
    el.value = raw + " - Typed";
  }

  // Strip suffix so user can edit without seeing it while typing
  function stripTypedSuffix(el) {
    el.value = el.value.replace(/ - Typed$/i, "");
    // Once user starts editing, mark as typed (not scanned)
    _isScanned[el.id] = false;
  }

  function initScanField(id) {
    const el = document.getElementById(id);
    if (!el || _scanInited.has(id)) return;
    _scanInited.add(id);

    _scanBuf[id]  = "";
    _scanTmr[id]  = null;
    _lastKey[id]  = 0;
    _isScanned[id] = false;

    el.setAttribute("autocomplete", "off");

    // On focus: strip suffix so editing is clean; reset scan flag
    el.addEventListener("focus", () => {
      stripTypedSuffix(el);
    });

    // On blur: if not scanned, add " - Typed" suffix
    el.addEventListener("blur", () => {
      applyTypedSuffix(el);
    });

    el.addEventListener("keydown", (e) => {
      const now = Date.now();
      const gap = now - (_lastKey[id] || 0);
      _lastKey[id] = now;

      // ENTER → scanner finished → commit clean value
      if (e.key === "Enter") {
        e.preventDefault();
        const val = _scanBuf[id].trim();
        if (val) {
          commitScan(el, val);
        }
        _scanBuf[id] = "";
        clearTimeout(_scanTmr[id]);
        return;
      }

      // Backspace / Delete — always allow
      if (e.key === "Backspace" || e.key === "Delete") {
        _isScanned[id] = false;
        return;
      }

      // Detect scanner: chars arrive faster than SCAN_SPEED_MS
      if (e.key.length === 1) {
        if (gap < SCAN_SPEED_MS) {
          // Fast → scanner input accumulation
          _scanBuf[id] += e.key;
          // Auto-commit if scanner sends no Enter after 150ms silence
          clearTimeout(_scanTmr[id]);
          _scanTmr[id] = setTimeout(() => {
            const val = _scanBuf[id].trim();
            if (val) commitScan(el, val);
            _scanBuf[id] = "";
          }, 150);
        } else {
          // Slow → manual typing — clear any stale scan buffer
          _scanBuf[id] = "";
          _isScanned[id] = false;
          // Let the keypress through normally (user can type freely)
        }
      }
    });
  }

  // Init all AWB scan fields immediately
  AWB_SCAN_IDS.forEach(initScanField);

  // Re-init after each modal opens
  function reinitScanFields() {
    AWB_SCAN_IDS.forEach(initScanField);
  }
  // ══════════════════════════════════════════════════════════
  // END SCANNER LOGIC
  // ══════════════════════════════════════════════════════════

  function bindClose(modal, closeFn) {
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeFn();
    });
  }

  function escAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  function toISODateOnly(v) {
    if (!v) return "";
    const s = String(v).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }

  function setVendorSentDateLimits(job) {
    if (!vendorSentDate) return;
    vendorSentDate.min = "";
    vendorSentDate.max = "";
    const recvISO = toISODateOnly(job?.Warehouse_Receive_Date);
    const delISO = toISODateOnly(job?.DeliveryDate);
    if (recvISO) vendorSentDate.min = recvISO;
    if (delISO) vendorSentDate.max = delISO;
    const cur = (vendorSentDate.value || "").trim();
    if (
      cur &&
      ((vendorSentDate.min && cur < vendorSentDate.min) ||
        (vendorSentDate.max && cur > vendorSentDate.max))
    )
      vendorSentDate.value = "";
  }

  function setVendorDecisionDateLimits(job) {
    if (!vendorDecisionDate) return;
    vendorDecisionDate.min = "";
    vendorDecisionDate.max = "";
    const sentISO = toISODateOnly(job?.Vendor_Sent_Date);
    const delISO = toISODateOnly(job?.DeliveryDate);
    if (sentISO) vendorDecisionDate.min = sentISO;
    if (delISO) vendorDecisionDate.max = delISO;
    const cur = (vendorDecisionDate.value || "").trim();
    if (
      cur &&
      ((vendorDecisionDate.min && cur < vendorDecisionDate.min) ||
        (vendorDecisionDate.max && cur > vendorDecisionDate.max))
    )
      vendorDecisionDate.value = "";
  }

  if (whWarehouseIdSel) {
    whWarehouseIdSel.addEventListener("change", () => {
      const opt = whWarehouseIdSel.options[whWarehouseIdSel.selectedIndex];
      whWarehouseNameHid.value = opt ? opt.getAttribute("data-name") || "" : "";
    });
  }

  if (whAttachFileInput) {
    whAttachFileInput.addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      whTransferFileLabel.textContent = file.name;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          whTransferPreviewImg.src = ev.target.result;
          whTransferPreviewImg.style.display = "";
          whTransferPreviewWrap.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
      } else {
        whTransferPreviewImg.style.display = "none";
        whTransferPreviewWrap.classList.remove("hidden");
      }
    });
  }
  if (clearWhTransferAttach) {
    clearWhTransferAttach.addEventListener("click", () => {
      whAttachFileInput.value = "";
      whTransferPreviewImg.src = "";
      whTransferPreviewImg.style.display = "";
      whTransferPreviewWrap.classList.add("hidden");
      whTransferFileLabel.textContent = "No file chosen";
    });
  }

  function statusBadge(s) {
    const sl = (s || "").toLowerCase();
    let cls = "badge-default";
    if (sl === "open") cls = "badge-open";
    else if (sl === "closed") cls = "badge-closed";
    else if (sl === "pending") cls = "badge-pending";
    else if (sl.includes("warehouse")) cls = "badge-warehouse";
    else if (sl.includes("vendor")) cls = "badge-vendor";
    else if (sl.includes("store")) cls = "badge-store";
    return `<span class="badge ${cls}">${s || "—"}</span>`;
  }

  function attachCell(jobId, hasAttachment) {
    if (!hasAttachment) return `<span class="no-attach">—</span>`;
    return `<a class="btn-view-attach" href="/api/analytics/attachment/${encodeURIComponent(jobId)}" target="_blank" rel="noopener noreferrer"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>View</a>`;
  }

  function receiptCell(job) {
    if (!isStore) return "";
    const status = (job.Status || "").toLowerCase().trim();
    if (status === "closed") return `<span class="no-attach">—</span>`;
    if (!job.WarehouseID) return `<span class="no-attach">—</span>`;
    return `<a class="btn-receipt-download" href="/api/analytics/receipt/${encodeURIComponent(job.Job_Id)}" target="_blank" rel="noopener noreferrer" title="Download Receipt"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>Receipt</a>`;
  }

  function timelineCell(job) {
    const status = (job.Status || "").toLowerCase().trim();
    const isClosed = status === "closed";

    const showWhDetails =
      isClosed ||
      status === "sent to warehouse" ||
      status === "warehouse received" ||
      status === "sent to vendor" ||
      status.startsWith("vendor:") ||
      status === "sent to store" ||
      status === "store received";
    const showWhReceived =
      isClosed ||
      status === "warehouse received" ||
      status === "sent to vendor" ||
      status.startsWith("vendor:") ||
      status === "sent to store" ||
      status === "store received";
    const showVendorDetails =
      isClosed ||
      status === "sent to vendor" ||
      status.startsWith("vendor:") ||
      status === "sent to store" ||
      status === "store received";
    const showVendorDecision =
      isClosed ||
      status.startsWith("vendor:") ||
      status === "sent to store" ||
      status === "store received";
    const showStoreSent =
      isClosed || status === "sent to store" || status === "store received";
    const showStoreReceived = isClosed || status === "store received";

    const lines = [];
    if (showWhDetails && job.WarehouseID)
      lines.push(
        `<div class="tl-entry tl-wh"><span class="tl-dot"></span><div class="tl-content"><div class="tl-label">WH: ${job.WarehouseID}${job.WarehouseName ? " – " + job.WarehouseName : ""}</div>${job.CourierName ? `<div class="tl-detail">Courier: ${job.CourierName}</div>` : ""}${job.DispatchDate ? `<div class="tl-detail">WH Dispatch: ${job.DispatchDate}</div>` : ""}</div></div>`,
      );
    if (showWhReceived && job.Warehouse_Receive_Date)
      lines.push(
        `<div class="tl-entry tl-wh-recv"><span class="tl-dot"></span><div class="tl-content"><div class="tl-label">WH Received</div><div class="tl-detail">${job.Warehouse_Receive_Date}</div></div></div>`,
      );
    if (showVendorDetails && job.Vendor_Name)
      lines.push(
        `<div class="tl-entry tl-vendor"><span class="tl-dot"></span><div class="tl-content"><div class="tl-label">Vendor: ${job.Vendor_Name}</div>${job.Gate_Pass_No ? `<div class="tl-detail">Gate Pass: ${job.Gate_Pass_No}</div>` : ""}${job.Vendor_Awb ? `<div class="tl-detail">AWB: ${job.Vendor_Awb}</div>` : ""}${job.Vendor_Sent_Date ? `<div class="tl-detail">Sent: ${job.Vendor_Sent_Date}</div>` : ""}</div></div>`,
      );
    if (showVendorDecision && job.Vendor_Decision)
      lines.push(
        `<div class="tl-entry tl-decision"><span class="tl-dot"></span><div class="tl-content"><div class="tl-label">Vendor Decision: ${job.Vendor_Decision}</div>${job.Vendor_Decision_Date ? `<div class="tl-detail">${job.Vendor_Decision_Date}</div>` : ""}</div></div>`,
      );
    if (showStoreSent && job.Store_Sent_Date)
      lines.push(
        `<div class="tl-entry tl-store"><span class="tl-dot"></span><div class="tl-content"><div class="tl-label">WH → Store</div><div class="tl-detail">${job.Store_Sent_Date}</div>${job.Return_Store_AWB ? `<div class="tl-detail">AWB: ${job.Return_Store_AWB}</div>` : ""}${job.Return_Store_Remarks ? `<div class="tl-detail">Remarks: ${job.Return_Store_Remarks}</div>` : ""}</div></div>`,
      );
    if (showStoreReceived && job.Store_Received_Date)
      lines.push(
        `<div class="tl-entry tl-store-recv"><span class="tl-dot"></span><div class="tl-content"><div class="tl-label">Store Received</div><div class="tl-detail">${job.Store_Received_Date}</div></div></div>`,
      );
    if (!lines.length) return `<span class="tl-empty">—</span>`;
    return `<div class="tl-wrap">${lines.join("")}</div>`;
  }

  function actionCell(job) {
    const status = (job.Status || "").toLowerCase().trim();
    if (status === "closed")
      return `<span class="action-locked">🔒 Closed</span>`;
    let options = `<option value="">— Select Action —</option>`;
    if (isStore) {
      if (status === "sent to store")
        options += `<option value="store-acknowledge">📦 Acknowledge & Receive</option>`;
      if (status === "store received") {
        options += `<option value="update-delivery">📅 Update Delivery Date</option>`;
        options += `<option value="close-ticket">🔒 Close Ticket</option>`;
      }
      if (status === "open" || status === "pending") {
        options += `<option value="update-delivery">📅 Update Delivery Date</option>`;
        options += `<option value="close-ticket">🔒 Close Ticket</option>`;
        options += `<option value="transfer-warehouse">🏭 Transfer to Warehouse</option>`;
      }
      if (
        status !== "open" &&
        status !== "pending" &&
        status !== "sent to store" &&
        status !== "store received" &&
        !status.includes("warehouse") &&
        !status.includes("vendor") &&
        !status.includes("sent to")
      ) {
        options += `<option value="update-delivery">📅 Update Delivery Date</option>`;
        options += `<option value="close-ticket">🔒 Close Ticket</option>`;
      }
    }
    if (isWarehouse) {
      if (status === "sent to warehouse")
        options += `<option value="wh-acknowledge">📦 Acknowledge & Receive</option>`;
      if (status === "warehouse received")
        options += `<option value="send-to-vendor">🔧 Send to Vendor</option>`;
      if (status === "sent to vendor")
        options += `<option value="vendor-decision">🔍 Vendor Decision</option>`;
      if (status === "vendor: repaired" || status === "vendor: replaced")
        options += `<option value="return-to-store">🏪 Return to Store</option>`;
      if (status === "sent to store" || status === "store received")
        return `<span class="action-locked">✅ Returned to Store</span>`;
    }
    if (options === `<option value="">— Select Action —</option>`)
      return `<span class="action-locked">—</span>`;
    return `<select class="action-select" data-jobid="${escAttr(job.Job_Id)}" data-delivery="${escAttr(job.DeliveryDate || "")}" data-status="${escAttr(job.Status || "")}">${options}</select>`;
  }

  function adminActionsCell(job) {
    if (!isAdmin) return "";
    return `<button class="admin-edit-btn" type="button" title="Edit ticket" data-jobid="${escAttr(job.Job_Id)}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg></button>`;
  }

  function adminLogsCell(job) {
    if (!isAdmin) return "";
    const logs = (job.admin_logs || "").trim();
    if (!logs) return `<span class="no-attach">—</span>`;
    return `<div class="admin-logs-cell">${logs}</div>`;
  }

  async function loadJobs() {
    jobTableBody.innerHTML = `<tr><td colspan="${totalCols}" class="table-loading">Loading…</td></tr>`;
    const params = new URLSearchParams({
      status: statusFilter.value,
      month: monthSelect.value,
      year: yearSelect.value,
      search: searchInput.value.trim(),
    });
    try {
      const res = await fetch(`/api/analytics/jobs?${params}`);
      const data = await res.json();
      if (!data.success) {
        jobTableBody.innerHTML = `<tr><td colspan="${totalCols}" class="table-loading">Error loading data.</td></tr>`;
        return;
      }
      kpiTotal.textContent = data.kpi.total;
      kpiClosed.textContent = data.kpi.closed;
      kpiPending.textContent = data.kpi.pending;
      const mo = monthSelect.options[monthSelect.selectedIndex].text;
      const yr = yearSelect.value === "all" ? "All Years" : yearSelect.value;
      kpiMeta.textContent = `KPI based on CreatedDate (${yr}${monthSelect.value !== "all" ? " - " + mo : ""})`;
      if (!data.jobs.length) {
        jobTableBody.innerHTML = `<tr><td colspan="${totalCols}" class="table-loading">No records found.</td></tr>`;
        return;
      }
      Object.keys(jobMap).forEach((k) => delete jobMap[k]);
      data.jobs.forEach((j) => (jobMap[j.Job_Id] = j));
      jobTableBody.innerHTML = data.jobs
        .map((job) => {
          let row = `<tr data-jobid="${escAttr(job.Job_Id)}">`;
          row += `<td><strong>${job.Job_Id || "—"}</strong></td>`;
          row += `<td>${job.CustomerNumber || "—"}</td>`;
          row += `<td>${job.CustomerName || "—"}</td>`;
          row += `<td>${job.Store_Id || "—"}</td>`;
          row += `<td>${job.ITEM_ID || "—"}</td>`;
          row += `<td>${job.ProductUnder90Days || "—"}</td>`;
          row += `<td>${job.DeliveryDate || "—"}</td>`;
          row += `<td>${statusBadge(job.Status)}</td>`;
          row += `<td>${job.Ticket_Closing_Date || "—"}</td>`;
          row += `<td>${attachCell(job.Job_Id, !!job.Attachment)}</td>`;
          row += `<td>${timelineCell(job)}</td>`;
          row += `<td>${actionCell(job)}</td>`;
          if (isStore) {
            row += `<td>${receiptCell(job)}</td>`;
          }
          if (isAdmin) {
            row += `<td>${adminActionsCell(job)}</td><td>${adminLogsCell(job)}</td>`;
          }
          row += `</tr>`;
          return row;
        })
        .join("");
    } catch (e) {
      jobTableBody.innerHTML = `<tr><td colspan="${totalCols}" class="table-loading">Failed to load. Try again.</td></tr>`;
    }
  }

  // ── ADMIN EDIT ──
  function openAdminEdit(jobId) {
    if (!isAdmin) return;
    const job = jobMap[jobId] || null;
    if (!job) return;
    activeJobForAdmin = job;
    if (adminEditError) {
      adminEditError.classList.add("hidden");
      adminEditError.textContent = "";
    }
    if (adminEditJobId) adminEditJobId.textContent = `Job: ${jobId}`;
    if (AE.CustomerNumber) AE.CustomerNumber.value = job.CustomerNumber || "";
    if (AE.CustomerName) AE.CustomerName.value = job.CustomerName || "";
    if (AE.Store_Id) AE.Store_Id.value = job.Store_Id || "";
    if (AE.ITEM_ID) AE.ITEM_ID.value = job.ITEM_ID || "";
    if (AE.ProductUnder90Days)
      AE.ProductUnder90Days.value = job.ProductUnder90Days || "";
    if (AE.DeliveryDate)
      AE.DeliveryDate.value = toISODateOnly(job.DeliveryDate) || "";
    if (AE.Status) AE.Status.value = job.Status || "";
    if (AE.Ticket_Closing_Date)
      AE.Ticket_Closing_Date.value = job.Ticket_Closing_Date || "";
    if (AE.WarehouseID) AE.WarehouseID.value = job.WarehouseID || "";
    if (AE.WarehouseName) AE.WarehouseName.value = job.WarehouseName || "";
    if (AE.CourierName) AE.CourierName.value = job.CourierName || "";
    if (AE.AWB) AE.AWB.value = job.AWB || "";
    if (AE.DispatchDate)
      AE.DispatchDate.value = toISODateOnly(job.DispatchDate) || "";
    if (AE.Warehouse_Receive_Date)
      AE.Warehouse_Receive_Date.value = job.Warehouse_Receive_Date || "";
    if (AE.WarehouseRemarks)
      AE.WarehouseRemarks.value = job.WarehouseRemarks || "";
    if (AE.Warehouse_Sent_Date)
      AE.Warehouse_Sent_Date.value = job.Warehouse_Sent_Date || "";
    if (AE.Vendor_Name) AE.Vendor_Name.value = job.Vendor_Name || "";
    if (AE.Vendor_Awb) AE.Vendor_Awb.value = job.Vendor_Awb || "";
    if (AE.Gate_Pass_No) AE.Gate_Pass_No.value = job.Gate_Pass_No || "";
    if (AE.Vendor_Sent_Date)
      AE.Vendor_Sent_Date.value = toISODateOnly(job.Vendor_Sent_Date) || "";
    if (AE.Vendor_Decision)
      AE.Vendor_Decision.value = job.Vendor_Decision || "";
    if (AE.Vendor_Decision_Date)
      AE.Vendor_Decision_Date.value =
        toISODateOnly(job.Vendor_Decision_Date) || "";
    if (AE.Store_Sent_Date)
      AE.Store_Sent_Date.value = job.Store_Sent_Date || "";
    if (AE.Store_Received_Date)
      AE.Store_Received_Date.value = job.Store_Received_Date || "";
    if (AE.Return_Store_AWB)
      AE.Return_Store_AWB.value = job.Return_Store_AWB || "";
    if (AE.Return_Store_Remarks)
      AE.Return_Store_Remarks.value = job.Return_Store_Remarks || "";
    if (AE.Merchandise_Decision)
      AE.Merchandise_Decision.value = job.Merchandise_Decision || "";
    if (AE.Merchandise_Action)
      AE.Merchandise_Action.value = job.Merchandise_Action || "";
    if (AE.Closing_Ticket_Remarks)
      AE.Closing_Ticket_Remarks.value = job.Closing_Ticket_Remarks || "";
    if (AE.AdminNote) AE.AdminNote.value = "";
    if (adminEditModal) adminEditModal.classList.remove("hidden");
    // Re-init scan fields inside admin modal after it opens
    setTimeout(reinitScanFields, 100);
  }
  function closeAdminEdit() {
    if (!adminEditModal) return;
    adminEditModal.classList.add("hidden");
    activeJobForAdmin = null;
  }
  if (isAdmin && closeAdminEditModal)
    closeAdminEditModal.addEventListener("click", closeAdminEdit);
  if (isAdmin && cancelAdminEditBtn)
    cancelAdminEditBtn.addEventListener("click", closeAdminEdit);
  if (isAdmin) bindClose(adminEditModal, closeAdminEdit);

  async function saveAdminEdit() {
    if (!isAdmin || !activeJobForAdmin) return;
    const note = (AE.AdminNote?.value || "").trim();
    if (!note) {
      adminEditError.textContent = "Admin note is required.";
      adminEditError.classList.remove("hidden");
      return;
    }
    const updates = {
      CustomerNumber: AE.CustomerNumber?.value || "",
      CustomerName: AE.CustomerName?.value || "",
      Store_Id: AE.Store_Id?.value || "",
      ITEM_ID: AE.ITEM_ID?.value || "",
      ProductUnder90Days: AE.ProductUnder90Days?.value || "",
      DeliveryDate: AE.DeliveryDate?.value || "",
      Status: AE.Status?.value || "",
      Ticket_Closing_Date: AE.Ticket_Closing_Date?.value || "",
      WarehouseID: AE.WarehouseID?.value || "",
      WarehouseName: AE.WarehouseName?.value || "",
      CourierName: AE.CourierName?.value || "",
      AWB: AE.AWB?.value || "",
      DispatchDate: AE.DispatchDate?.value || "",
      Warehouse_Receive_Date: AE.Warehouse_Receive_Date?.value || "",
      WarehouseRemarks: AE.WarehouseRemarks?.value || "",
      Warehouse_Sent_Date: AE.Warehouse_Sent_Date?.value || "",
      Vendor_Name: AE.Vendor_Name?.value || "",
      Vendor_Awb: AE.Vendor_Awb?.value || "",
      Gate_Pass_No: AE.Gate_Pass_No?.value || "",
      Vendor_Sent_Date: AE.Vendor_Sent_Date?.value || "",
      Vendor_Decision: AE.Vendor_Decision?.value || "",
      Vendor_Decision_Date: AE.Vendor_Decision_Date?.value || "",
      Store_Sent_Date: AE.Store_Sent_Date?.value || "",
      Store_Received_Date: AE.Store_Received_Date?.value || "",
      Return_Store_AWB: AE.Return_Store_AWB?.value || "",
      Return_Store_Remarks: AE.Return_Store_Remarks?.value || "",
      Merchandise_Decision: AE.Merchandise_Decision?.value || "",
      Merchandise_Action: AE.Merchandise_Action?.value || "",
      Closing_Ticket_Remarks: AE.Closing_Ticket_Remarks?.value || "",
    };
    adminEditError.classList.add("hidden");
    saveAdminEditBtn.disabled = true;
    saveAdminEditBtn.textContent = "Saving…";
    try {
      const res = await fetch("/api/analytics/admin-update-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: activeJobForAdmin.Job_Id,
          updates,
          note,
        }),
      });
      const data = await res.json();
      if (data.success) {
        closeAdminEdit();
        await loadJobs();
      } else {
        adminEditError.textContent = data.message || "Failed.";
        adminEditError.classList.remove("hidden");
      }
    } catch (e) {
      adminEditError.textContent = "Error. Try again.";
      adminEditError.classList.remove("hidden");
    } finally {
      saveAdminEditBtn.disabled = false;
      saveAdminEditBtn.textContent = "Save Changes";
    }
  }
  if (isAdmin && saveAdminEditBtn)
    saveAdminEditBtn.addEventListener("click", saveAdminEdit);

  // ── WH TRANSFER ──
  function openWhTransfer(jobId) {
    activeJobForWh = jobMap[jobId] || null;
    whTransferJobIdEl.textContent = `Job: ${jobId}`;
    whTransferError.classList.add("hidden");
    whTransferForm.reset();
    whTransferPreviewWrap.classList.add("hidden");
    whTransferPreviewImg.src = "";
    whTransferFileLabel.textContent = "No file chosen";
    whExistingAttach.classList.add("hidden");
    if (activeJobForWh) {
      const j = activeJobForWh;
      if ((j.WarehouseID || j.WarehouseName) && whWarehouseIdSel) {
        let matched = false;
        if (j.WarehouseID) {
          for (let i = 0; i < whWarehouseIdSel.options.length; i++) {
            const opt = whWarehouseIdSel.options[i];
            if (
              (opt.getAttribute("data-whid") || "").trim() ===
              j.WarehouseID.trim()
            ) {
              whWarehouseIdSel.selectedIndex = i;
              whWarehouseNameHid.value = opt.getAttribute("data-name") || "";
              matched = true;
              break;
            }
          }
        }
        if (!matched && j.WarehouseName) {
          for (let i = 0; i < whWarehouseIdSel.options.length; i++) {
            const opt = whWarehouseIdSel.options[i];
            if (
              (opt.getAttribute("data-name") || "").trim().toLowerCase() ===
              j.WarehouseName.trim().toLowerCase()
            ) {
              whWarehouseIdSel.selectedIndex = i;
              whWarehouseNameHid.value = opt.getAttribute("data-name") || "";
              break;
            }
          }
        }
      }
      if (j.CourierName && whCourierSel) {
        for (let i = 0; i < whCourierSel.options.length; i++) {
          if (whCourierSel.options[i].value === j.CourierName) {
            whCourierSel.selectedIndex = i;
            break;
          }
        }
      }
      if (j.AWB) whAwbInput.value = j.AWB;
      if (j.DispatchDate) whDispatchInput.value = j.DispatchDate;
      if (j.WarehouseRemarks) whRemarksInput.value = j.WarehouseRemarks;
      if (j.WarehouseAttachment) {
        whExistingLabel.textContent = "Existing WH attachment on file";
        whViewExistingBtn.dataset.jobid = jobId;
        whExistingAttach.classList.remove("hidden");
      }
    }
    whTransferModal.classList.remove("hidden");
    // Re-init scan fields inside WH modal after it opens
    setTimeout(reinitScanFields, 100);
  }
  const closeWhTransfer = () => {
    whTransferModal.classList.add("hidden");
    activeJobForWh = null;
  };
  if (closeWhTransferModal)
    closeWhTransferModal.addEventListener("click", closeWhTransfer);
  if (cancelWhTransferBtn)
    cancelWhTransferBtn.addEventListener("click", closeWhTransfer);
  bindClose(whTransferModal, closeWhTransfer);
  if (whViewExistingBtn)
    whViewExistingBtn.addEventListener("click", () => {
      const jid = whViewExistingBtn.dataset.jobid;
      if (jid)
        window.open(
          `/api/analytics/wh-attachment/${encodeURIComponent(jid)}`,
          "_blank",
          "noopener,noreferrer",
        );
    });

  async function saveWarehouseDraft() {
    if (!activeJobForWh) {
      whTransferError.textContent = "No job selected.";
      whTransferError.classList.remove("hidden");
      return;
    }
    if (!whWarehouseIdSel.value) {
      whTransferError.textContent = "Please select a warehouse.";
      whTransferError.classList.remove("hidden");
      return;
    }
    whTransferError.classList.add("hidden");
    saveWhDraftBtn.disabled = true;
    saveWhDraftBtn.textContent = "Saving…";
    try {
      const fd = new FormData(whTransferForm);
      fd.set("jobId", activeJobForWh.Job_Id);
      fd.set(
        "warehouse_id",
        (whWarehouseIdSel.value + "").split(" - ")[0].trim(),
      );
      fd.set("warehouse_name", whWarehouseNameHid.value);
      const res = await fetch("/api/analytics/warehouse-draft", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        whTransferError.textContent = "✅ Draft saved.";
        whTransferError.classList.remove("hidden");
        await loadJobs();
      } else {
        whTransferError.textContent = data.message || "Failed.";
        whTransferError.classList.remove("hidden");
      }
    } catch (e) {
      whTransferError.textContent = "Error. Try again.";
      whTransferError.classList.remove("hidden");
    } finally {
      saveWhDraftBtn.disabled = false;
      saveWhDraftBtn.textContent = "💾 Save Draft";
    }
  }
  if (saveWhDraftBtn)
    saveWhDraftBtn.addEventListener("click", saveWarehouseDraft);

  if (whTransferForm) {
    whTransferForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      whTransferError.classList.add("hidden");
      if (!activeJobForWh) {
        whTransferError.textContent = "No job selected.";
        whTransferError.classList.remove("hidden");
        return;
      }
      if (!whWarehouseIdSel.value) {
        whTransferError.textContent = "Please select a warehouse.";
        whTransferError.classList.remove("hidden");
        return;
      }
      sendToWarehouseBtn.disabled = true;
      sendToWarehouseBtn.textContent = "Sending…";
      try {
        const formData = new FormData(whTransferForm);
        formData.set("jobId", activeJobForWh.Job_Id);
        formData.set(
          "warehouse_id",
          (whWarehouseIdSel.value + "").split(" - ")[0].trim(),
        );
        formData.set("warehouse_name", whWarehouseNameHid.value);
        const res = await fetch("/api/analytics/transfer-warehouse", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          closeWhTransfer();
          loadJobs();
        } else {
          whTransferError.textContent = data.message || "Failed.";
          whTransferError.classList.remove("hidden");
        }
      } catch {
        whTransferError.textContent = "Error. Try again.";
        whTransferError.classList.remove("hidden");
      } finally {
        sendToWarehouseBtn.disabled = false;
        sendToWarehouseBtn.textContent = "🏭 Send to Warehouse";
      }
    });
  }

  const closeWhAck = () => {
    if (whAckModal) whAckModal.classList.add("hidden");
    activeJobId = null;
  };
  if (closeWhAckModal) closeWhAckModal.addEventListener("click", closeWhAck);
  if (cancelWhAckBtn) cancelWhAckBtn.addEventListener("click", closeWhAck);
  bindClose(whAckModal, closeWhAck);
  if (confirmWhAckBtn) {
    confirmWhAckBtn.addEventListener("click", async () => {
      confirmWhAckBtn.disabled = true;
      confirmWhAckBtn.textContent = "Saving…";
      try {
        const res = await fetch("/api/analytics/warehouse-acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: activeJobId }),
        });
        const data = await res.json();
        if (data.success) {
          closeWhAck();
          loadJobs();
        } else alert(data.message || "Failed.");
      } catch {
        alert("Error.");
      } finally {
        confirmWhAckBtn.disabled = false;
        confirmWhAckBtn.textContent = "✅ Yes, Acknowledge";
      }
    });
  }

  const closeSendVendor = () => {
    if (sendVendorModal) sendVendorModal.classList.add("hidden");
    if (sendVendorError) sendVendorError.classList.add("hidden");
    activeJobId = null;
  };
  if (closeSendVendorModal)
    closeSendVendorModal.addEventListener("click", closeSendVendor);
  if (cancelSendVendorBtn)
    cancelSendVendorBtn.addEventListener("click", closeSendVendor);
  bindClose(sendVendorModal, closeSendVendor);

  async function saveVendorDraft() {
    if (!activeJobId) {
      sendVendorError.textContent = "No job selected.";
      sendVendorError.classList.remove("hidden");
      return;
    }
    if (!vendorSelect.value) {
      sendVendorError.textContent = "Please select a vendor.";
      sendVendorError.classList.remove("hidden");
      return;
    }
    sendVendorError.classList.add("hidden");
    if (!saveVendorDraftBtn) return;
    saveVendorDraftBtn.disabled = true;
    saveVendorDraftBtn.textContent = "Saving…";
    try {
      const res = await fetch("/api/analytics/vendor-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: activeJobId,
          vendor_name: vendorSelect.value,
          gate_pass_no: vendorGatePass.value.trim(),
          vendor_sent_date: (vendorSentDate.value || "").trim(),
          vendor_awb: vendorAwb.value.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        sendVendorError.textContent = "✅ Draft saved.";
        sendVendorError.classList.remove("hidden");
        await loadJobs();
      } else {
        sendVendorError.textContent = data.message || "Failed.";
        sendVendorError.classList.remove("hidden");
      }
    } catch (e) {
      sendVendorError.textContent = "Error. Try again.";
      sendVendorError.classList.remove("hidden");
    } finally {
      saveVendorDraftBtn.disabled = false;
      saveVendorDraftBtn.textContent = "💾 Save Draft";
    }
  }
  if (saveVendorDraftBtn)
    saveVendorDraftBtn.addEventListener("click", saveVendorDraft);

  if (confirmSendVendorBtn) {
    confirmSendVendorBtn.addEventListener("click", async () => {
      sendVendorError.classList.add("hidden");
      const job = jobMap[activeJobId] || null;
      const recvISO = toISODateOnly(job?.Warehouse_Receive_Date);
      const delISO = toISODateOnly(job?.DeliveryDate);
      const picked = (vendorSentDate.value || "").trim();
      if (!vendorSelect.value) {
        sendVendorError.textContent = "Please select a vendor.";
        sendVendorError.classList.remove("hidden");
        return;
      }
      if (!picked) {
        sendVendorError.textContent = "Please select a date.";
        sendVendorError.classList.remove("hidden");
        return;
      }
      if (!recvISO) {
        sendVendorError.textContent = "Warehouse Receive Date missing.";
        sendVendorError.classList.remove("hidden");
        return;
      }
      if (!delISO) {
        sendVendorError.textContent = "Delivery Date missing.";
        sendVendorError.classList.remove("hidden");
        return;
      }
      if (picked < recvISO) {
        sendVendorError.textContent = `Date must be on/after ${recvISO}.`;
        sendVendorError.classList.remove("hidden");
        return;
      }
      if (picked > delISO) {
        sendVendorError.textContent = `Date must be on/before ${delISO}.`;
        sendVendorError.classList.remove("hidden");
        return;
      }
      confirmSendVendorBtn.disabled = true;
      confirmSendVendorBtn.textContent = "Sending…";
      try {
        const res = await fetch("/api/analytics/send-to-vendor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: activeJobId,
            vendor_name: vendorSelect.value,
            gate_pass_no: vendorGatePass.value.trim(),
            vendor_sent_date: picked,
            vendor_awb: vendorAwb.value.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          closeSendVendor();
          loadJobs();
        } else {
          sendVendorError.textContent = data.message || "Failed.";
          sendVendorError.classList.remove("hidden");
        }
      } catch {
        sendVendorError.textContent = "Error.";
        sendVendorError.classList.remove("hidden");
      } finally {
        confirmSendVendorBtn.disabled = false;
        confirmSendVendorBtn.textContent = "🔧 Send to Vendor";
      }
    });
  }

  const closeVendorDecision = () => {
    if (vendorDecisionModal) vendorDecisionModal.classList.add("hidden");
    if (vendorDecisionError) vendorDecisionError.classList.add("hidden");
    activeJobId = null;
  };
  if (closeVendorDecisionModal)
    closeVendorDecisionModal.addEventListener("click", closeVendorDecision);
  if (cancelVendorDecisionBtn)
    cancelVendorDecisionBtn.addEventListener("click", closeVendorDecision);
  bindClose(vendorDecisionModal, closeVendorDecision);

  if (confirmVendorDecisionBtn) {
    confirmVendorDecisionBtn.addEventListener("click", async () => {
      vendorDecisionError.classList.add("hidden");
      const job = jobMap[activeJobId] || null;
      const sentISO = toISODateOnly(job?.Vendor_Sent_Date);
      const delISO = toISODateOnly(job?.DeliveryDate);
      const picked = (vendorDecisionDate.value || "").trim();
      if (!vendorDecisionSelect.value) {
        vendorDecisionError.textContent = "Please select a decision.";
        vendorDecisionError.classList.remove("hidden");
        return;
      }
      if (!picked) {
        vendorDecisionError.textContent = "Please select a date.";
        vendorDecisionError.classList.remove("hidden");
        return;
      }
      if (!sentISO) {
        vendorDecisionError.textContent = "Vendor Sent Date missing.";
        vendorDecisionError.classList.remove("hidden");
        return;
      }
      if (!delISO) {
        vendorDecisionError.textContent = "Delivery Date missing.";
        vendorDecisionError.classList.remove("hidden");
        return;
      }
      if (picked < sentISO) {
        vendorDecisionError.textContent = `Date must be on/after ${sentISO}.`;
        vendorDecisionError.classList.remove("hidden");
        return;
      }
      if (picked > delISO) {
        vendorDecisionError.textContent = `Date must be on/before ${delISO}.`;
        vendorDecisionError.classList.remove("hidden");
        return;
      }
      confirmVendorDecisionBtn.disabled = true;
      confirmVendorDecisionBtn.textContent = "Saving…";
      try {
        const res = await fetch("/api/analytics/vendor-decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: activeJobId,
            vendor_decision: vendorDecisionSelect.value,
            vendor_decision_date: picked,
          }),
        });
        const data = await res.json();
        if (data.success) {
          closeVendorDecision();
          loadJobs();
        } else {
          vendorDecisionError.textContent = data.message || "Failed.";
          vendorDecisionError.classList.remove("hidden");
        }
      } catch {
        vendorDecisionError.textContent = "Error.";
        vendorDecisionError.classList.remove("hidden");
      } finally {
        confirmVendorDecisionBtn.disabled = false;
        confirmVendorDecisionBtn.textContent = "✅ Confirm Decision";
      }
    });
  }

  // ── RETURN TO STORE ──
  const closeReturnStore = () => {
    if (returnStoreModal) returnStoreModal.classList.add("hidden");
    if (returnStoreError) returnStoreError.classList.add("hidden");
    if (returnStoreAwbInput) returnStoreAwbInput.value = "";
    if (returnStoreRemarksInput) returnStoreRemarksInput.value = "";
    activeJobId = null;
  };
  if (closeReturnStoreModal)
    closeReturnStoreModal.addEventListener("click", closeReturnStore);
  if (cancelReturnStoreBtn)
    cancelReturnStoreBtn.addEventListener("click", closeReturnStore);
  bindClose(returnStoreModal, closeReturnStore);

  if (confirmReturnStoreBtn) {
    confirmReturnStoreBtn.addEventListener("click", async () => {
      if (returnStoreError) returnStoreError.classList.add("hidden");
      const awbVal = (
        returnStoreAwbInput ? returnStoreAwbInput.value : ""
      ).trim();
      const remarksVal = (
        returnStoreRemarksInput ? returnStoreRemarksInput.value : ""
      ).trim();
      // AWB is optional — no mandatory block
      confirmReturnStoreBtn.disabled = true;
      confirmReturnStoreBtn.textContent = "Saving…";
      try {
        const res = await fetch("/api/analytics/return-to-store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: activeJobId,
            return_awb: awbVal,
            return_remarks: remarksVal,
          }),
        });
        const data = await res.json();
        if (data.success) {
          closeReturnStore();
          loadJobs();
        } else {
          if (returnStoreError) {
            returnStoreError.textContent = data.message || "Failed.";
            returnStoreError.classList.remove("hidden");
          }
        }
      } catch {
        if (returnStoreError) {
          returnStoreError.textContent = "Error. Try again.";
          returnStoreError.classList.remove("hidden");
        }
      } finally {
        confirmReturnStoreBtn.disabled = false;
        confirmReturnStoreBtn.textContent = "✓ Return to Store";
      }
    });
  }

  const closeStoreAck = () => {
    if (storeAckModal) storeAckModal.classList.add("hidden");
    activeJobId = null;
  };
  if (closeStoreAckModal)
    closeStoreAckModal.addEventListener("click", closeStoreAck);
  if (cancelStoreAckBtn)
    cancelStoreAckBtn.addEventListener("click", closeStoreAck);
  bindClose(storeAckModal, closeStoreAck);
  if (confirmStoreAckBtn) {
    confirmStoreAckBtn.addEventListener("click", async () => {
      confirmStoreAckBtn.disabled = true;
      confirmStoreAckBtn.textContent = "Saving…";
      try {
        const res = await fetch("/api/analytics/store-acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: activeJobId }),
        });
        const data = await res.json();
        if (data.success) {
          closeStoreAck();
          loadJobs();
        } else alert(data.message || "Failed.");
      } catch {
        alert("Error.");
      } finally {
        confirmStoreAckBtn.disabled = false;
        confirmStoreAckBtn.textContent = "✅ Yes, Received";
      }
    });
  }

  // ── TABLE DELEGATION ──
  jobTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".admin-edit-btn");
    if (btn && isAdmin) {
      const jobId = btn.dataset.jobid;
      if (jobId) openAdminEdit(jobId);
      return;
    }
  });

  jobTableBody.addEventListener("change", (e) => {
    if (!e.target.classList.contains("action-select")) return;
    const sel = e.target;
    const action = sel.value;
    const jobId = sel.dataset.jobid;
    const delivery = sel.dataset.delivery;
    sel.value = "";
    if (!action) return;
    activeJobId = jobId;

    if (action === "transfer-warehouse") {
      openWhTransfer(jobId);
      return;
    }
    if (action === "store-acknowledge") {
      storeAckJobId.textContent = `Job: ${jobId}`;
      storeAckModal.classList.remove("hidden");
      return;
    }
    if (action === "wh-acknowledge") {
      whAckJobId.textContent = `Job: ${jobId}`;
      whAckModal.classList.remove("hidden");
      return;
    }
    if (action === "send-to-vendor") {
      const job = jobMap[jobId] || null;
      sendVendorJobId.textContent = `Job: ${jobId}`;
      vendorSelect.value = "";
      vendorGatePass.value = "";
      vendorSentDate.value = "";
      vendorAwb.value = "";
      sendVendorError.classList.add("hidden");
      if (!job) {
        sendVendorError.textContent = "Job data not found.";
        sendVendorError.classList.remove("hidden");
      } else {
        if (job.Vendor_Name) vendorSelect.value = job.Vendor_Name;
        if (job.Gate_Pass_No) vendorGatePass.value = job.Gate_Pass_No;
        if (job.Vendor_Awb) vendorAwb.value = job.Vendor_Awb;
        const sentISO = toISODateOnly(job.Vendor_Sent_Date);
        if (sentISO) vendorSentDate.value = sentISO;
        setVendorSentDateLimits(job);
        const recvISO = toISODateOnly(job.Warehouse_Receive_Date);
        const delISO = toISODateOnly(job.DeliveryDate);
        if (!recvISO) {
          sendVendorError.textContent = "Warehouse Receive Date missing.";
          sendVendorError.classList.remove("hidden");
        } else if (!delISO) {
          sendVendorError.textContent = "Delivery Date missing.";
          sendVendorError.classList.remove("hidden");
        }
      }
      sendVendorModal.classList.remove("hidden");
      // Re-init scan fields inside vendor modal
      setTimeout(reinitScanFields, 100);
      return;
    }
    if (action === "vendor-decision") {
      const job = jobMap[jobId] || null;
      vendorDecisionJobId.textContent = `Job: ${jobId}`;
      vendorDecisionSelect.value = "";
      vendorDecisionDate.value = "";
      vendorDecisionError.classList.add("hidden");
      if (!job) {
        vendorDecisionError.textContent = "Job data not found.";
        vendorDecisionError.classList.remove("hidden");
      } else {
        setVendorDecisionDateLimits(job);
        const sentISO = toISODateOnly(job.Vendor_Sent_Date);
        const delISO = toISODateOnly(job.DeliveryDate);
        if (!sentISO) {
          vendorDecisionError.textContent = "Vendor Sent Date missing.";
          vendorDecisionError.classList.remove("hidden");
        } else if (!delISO) {
          vendorDecisionError.textContent = "Delivery Date missing.";
          vendorDecisionError.classList.remove("hidden");
        }
      }
      vendorDecisionModal.classList.remove("hidden");
      return;
    }
    if (action === "return-to-store") {
      returnStoreJobId.textContent = `Job: ${jobId}`;
      if (returnStoreAwbInput) returnStoreAwbInput.value = "";
      if (returnStoreRemarksInput) returnStoreRemarksInput.value = "";
      if (returnStoreError) returnStoreError.classList.add("hidden");
      returnStoreModal.classList.remove("hidden");
      // Re-init scan fields inside return-to-store modal
      setTimeout(reinitScanFields, 100);
      return;
    }
    if (action === "update-delivery") {
      deliveryJobIdEl.textContent = `Job: ${jobId}`;
      newDeliveryDate.value = delivery || "";
      deliveryModal.classList.remove("hidden");
      return;
    }
    if (action === "close-ticket") {
      openMerchDecision(jobId);
      return;
    }
  });

  // ── MERCHANDISE DECISION MODAL ──
  function openMerchDecision(jobId) {
    activeJobId = jobId;
    if (merchDecisionJobId) merchDecisionJobId.textContent = `Job: ${jobId}`;
    if (merchDecisionSelect) merchDecisionSelect.value = "";
    if (merchActionSelect) merchActionSelect.value = "";
    if (merchDecisionError) {
      merchDecisionError.classList.add("hidden");
      merchDecisionError.textContent = "";
    }
    pendingMerchDecision = "";
    pendingMerchAction = "";
    if (merchDecisionModal) merchDecisionModal.classList.remove("hidden");
  }
  const closeMerchDecision = () => {
    if (merchDecisionModal) merchDecisionModal.classList.add("hidden");
    if (merchDecisionError) merchDecisionError.classList.add("hidden");
  };
  if (closeMerchDecisionModal)
    closeMerchDecisionModal.addEventListener("click", closeMerchDecision);
  if (cancelMerchDecisionBtn)
    cancelMerchDecisionBtn.addEventListener("click", closeMerchDecision);
  bindClose(merchDecisionModal, closeMerchDecision);

  if (merchProceedOtpBtn) {
    merchProceedOtpBtn.addEventListener("click", () => {
      if (merchDecisionError) merchDecisionError.classList.add("hidden");
      const decision = (merchDecisionSelect?.value || "").trim();
      const action = (merchActionSelect?.value || "").trim();
      if (!decision) {
        merchDecisionError.textContent = "Please select Merchandise Decision.";
        merchDecisionError.classList.remove("hidden");
        return;
      }
      if (!action) {
        merchDecisionError.textContent = "Please select Action.";
        merchDecisionError.classList.remove("hidden");
        return;
      }
      pendingMerchDecision = decision;
      pendingMerchAction = action;
      closeMerchDecision();
      closeJobIdEl.textContent = `Job: ${activeJobId}`;
      closeRemarks.value = "";
      closeTicketError.classList.add("hidden");
      resetCloseOtpState();
      closeTicketModal.classList.remove("hidden");
    });
  }

  // ── DELIVERY MODAL ──
  const closeDelivModal = () => {
    deliveryModal.classList.add("hidden");
    activeJobId = null;
  };
  closeDeliveryModal.addEventListener("click", closeDelivModal);
  cancelDeliveryBtn.addEventListener("click", closeDelivModal);
  bindClose(deliveryModal, closeDelivModal);
  saveDeliveryBtn.addEventListener("click", async () => {
    const date = newDeliveryDate.value;
    if (!date) {
      alert("Please select a date.");
      return;
    }
    saveDeliveryBtn.disabled = true;
    saveDeliveryBtn.textContent = "Saving…";
    try {
      const res = await fetch("/api/analytics/update-delivery-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: activeJobId, deliveryDate: date }),
      });
      const data = await res.json();
      if (data.success) {
        closeDelivModal();
        loadJobs();
      } else alert(data.message || "Failed.");
    } catch {
      alert("Error.");
    } finally {
      saveDeliveryBtn.disabled = false;
      saveDeliveryBtn.textContent = "Save";
    }
  });

  // ── CLOSE TICKET MODAL + OTP FLOW ──
  let closeOtpSent = false;
  let closeOtpVerified = false;
  let closeVerifiedOtpValue = "";
  let closeOtpPhoneValue = "";
  let closeOtpTimerInterval = null;
  let closeOtpSeconds = 300;
  const closeOtpSection = document.getElementById("closeOtpSection");
  const closeOtpPhoneEl = document.getElementById("closeOtpPhone");
  const closeOtpTimerEl = document.getElementById("closeOtpTimer");
  const closeOtpInputEl = document.getElementById("closeOtpInput");
  const closeOtpStatusEl = document.getElementById("closeOtpStatus");
  const closeResendOtpBtn = document.getElementById("closeResendOtpBtn");

  function resetCloseOtpState() {
    closeOtpSent = false;
    closeOtpVerified = false;
    closeVerifiedOtpValue = "";
    closeOtpPhoneValue = "";
    if (closeOtpTimerInterval) {
      clearInterval(closeOtpTimerInterval);
      closeOtpTimerInterval = null;
    }
    if (closeOtpSection) closeOtpSection.classList.add("hidden");
    if (closeOtpInputEl) {
      closeOtpInputEl.value = "";
      closeOtpInputEl.readOnly = false;
    }
    if (closeOtpStatusEl) {
      closeOtpStatusEl.textContent = "";
      closeOtpStatusEl.style.color = "";
    }
    if (closeOtpTimerEl) {
      closeOtpTimerEl.textContent = "05:00";
      closeOtpTimerEl.style.color = "#667eea";
    }
    if (confirmCloseBtn) {
      confirmCloseBtn.disabled = false;
      confirmCloseBtn.textContent = "Send OTP & Close";
    }
  }

  const closeCloseModal = () => {
    closeTicketModal.classList.add("hidden");
    closeTicketError.classList.add("hidden");
    activeJobId = null;
    resetCloseOtpState();
    if (closeRemarks) closeRemarks.value = "";
    pendingMerchDecision = "";
    pendingMerchAction = "";
  };
  closeTicketModalBtn.addEventListener("click", closeCloseModal);
  cancelCloseBtn.addEventListener("click", closeCloseModal);
  bindClose(closeTicketModal, closeCloseModal);

  function startCloseOtpTimer() {
    closeOtpSeconds = 300;
    updateCloseTimerDisplay();
    closeOtpTimerInterval = setInterval(() => {
      closeOtpSeconds--;
      updateCloseTimerDisplay();
      if (closeOtpSeconds <= 0) {
        clearInterval(closeOtpTimerInterval);
        closeOtpTimerInterval = null;
        if (closeOtpTimerEl) {
          closeOtpTimerEl.textContent = "00:00";
          closeOtpTimerEl.style.color = "#e53e3e";
        }
        if (!closeOtpVerified && closeOtpStatusEl) {
          closeOtpStatusEl.textContent = "OTP expired. Please resend.";
          closeOtpStatusEl.style.color = "#e53e3e";
        }
      }
    }, 1000);
  }
  function updateCloseTimerDisplay() {
    if (!closeOtpTimerEl) return;
    const m = Math.floor(closeOtpSeconds / 60);
    const s = closeOtpSeconds % 60;
    closeOtpTimerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    closeOtpTimerEl.style.color = closeOtpSeconds <= 60 ? "#e53e3e" : "#667eea";
  }

  async function sendClosureOtpRequest(jobId) {
    try {
      const res = await fetch("/api/send-closure-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.success) {
        closeOtpSent = true;
        closeOtpPhoneValue = data.phone || "";
        if (closeOtpPhoneEl) closeOtpPhoneEl.textContent = closeOtpPhoneValue;
        if (closeOtpSection) closeOtpSection.classList.remove("hidden");
        if (closeOtpInputEl) {
          closeOtpInputEl.value = "";
          closeOtpInputEl.readOnly = false;
        }
        if (closeOtpStatusEl) {
          closeOtpStatusEl.textContent = "";
          closeOtpStatusEl.style.color = "";
        }
        closeOtpVerified = false;
        closeVerifiedOtpValue = "";
        if (closeOtpTimerInterval) clearInterval(closeOtpTimerInterval);
        startCloseOtpTimer();
        confirmCloseBtn.textContent = "Close Ticket";
        setTimeout(() => {
          if (closeOtpInputEl) closeOtpInputEl.focus();
        }, 200);
        return true;
      } else {
        closeTicketError.textContent = data.message || "Failed to send OTP";
        closeTicketError.classList.remove("hidden");
        return false;
      }
    } catch (err) {
      closeTicketError.textContent = "Error sending OTP.";
      closeTicketError.classList.remove("hidden");
      return false;
    }
  }

  if (closeOtpInputEl) {
    closeOtpInputEl.addEventListener("input", async () => {
      closeOtpInputEl.value = closeOtpInputEl.value.replace(/\D/g, "");
      if (closeOtpInputEl.value.length !== 6) {
        if (closeOtpStatusEl) {
          closeOtpStatusEl.textContent = "";
          closeOtpStatusEl.style.color = "";
        }
        closeOtpVerified = false;
        confirmCloseBtn.disabled = !closeOtpSent;
        return;
      }
      if (closeOtpStatusEl) {
        closeOtpStatusEl.textContent = "Verifying…";
        closeOtpStatusEl.style.color = "#b45309";
      }
      try {
        const res = await fetch("/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: closeOtpPhoneValue,
            otp: closeOtpInputEl.value.trim(),
            jobId: activeJobId,
          }),
        });
        const data = await res.json();
        if (data.success && data.valid) {
          closeOtpVerified = true;
          closeVerifiedOtpValue = closeOtpInputEl.value.trim();
          if (closeOtpStatusEl) {
            closeOtpStatusEl.textContent = "✓ OTP is correct";
            closeOtpStatusEl.style.color = "#16a34a";
          }
          closeOtpInputEl.readOnly = true;
          confirmCloseBtn.disabled = false;
        } else {
          closeOtpVerified = false;
          if (closeOtpStatusEl) {
            closeOtpStatusEl.textContent = data.message || "Invalid OTP";
            closeOtpStatusEl.style.color = "#e53e3e";
          }
        }
      } catch (err) {
        if (closeOtpStatusEl) {
          closeOtpStatusEl.textContent = "Verification failed.";
          closeOtpStatusEl.style.color = "#e53e3e";
        }
      }
    });
  }

  if (closeResendOtpBtn) {
    closeResendOtpBtn.addEventListener("click", async () => {
      closeResendOtpBtn.disabled = true;
      if (closeOtpInputEl) {
        closeOtpInputEl.value = "";
        closeOtpInputEl.readOnly = false;
      }
      if (closeOtpStatusEl) {
        closeOtpStatusEl.textContent = "Sending OTP…";
        closeOtpStatusEl.style.color = "#b45309";
      }
      closeOtpVerified = false;
      closeVerifiedOtpValue = "";
      if (closeOtpTimerInterval) clearInterval(closeOtpTimerInterval);
      const success = await sendClosureOtpRequest(activeJobId);
      closeResendOtpBtn.disabled = false;
      if (!success && closeOtpStatusEl) {
        closeOtpStatusEl.textContent = "Failed to resend.";
        closeOtpStatusEl.style.color = "#e53e3e";
      }
    });
  }

  confirmCloseBtn.addEventListener("click", async () => {
    closeTicketError.classList.add("hidden");
    const remarks = closeRemarks.value.trim();
    if (!remarks) {
      closeTicketError.textContent = "Closing remarks are required.";
      closeTicketError.classList.remove("hidden");
      return;
    }
    if (!closeOtpSent) {
      confirmCloseBtn.disabled = true;
      confirmCloseBtn.textContent = "Sending OTP…";
      const success = await sendClosureOtpRequest(activeJobId);
      confirmCloseBtn.disabled = false;
      if (!success) confirmCloseBtn.textContent = "Send OTP & Close";
      return;
    }
    if (!closeOtpVerified) {
      closeTicketError.textContent = "Please enter and verify the 6-digit OTP.";
      closeTicketError.classList.remove("hidden");
      return;
    }
    confirmCloseBtn.disabled = true;
    confirmCloseBtn.textContent = "Closing…";
    try {
      const res = await fetch("/api/analytics/close-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: activeJobId,
          verified_otp: closeVerifiedOtpValue,
          closing_remarks: remarks,
          merchandise_decision: pendingMerchDecision,
          merchandise_action: pendingMerchAction,
        }),
      });
      const data = await res.json();
      if (data.success) {
        closeCloseModal();
        loadJobs();
      } else {
        closeTicketError.textContent = data.message || "Failed.";
        closeTicketError.classList.remove("hidden");
      }
    } catch {
      closeTicketError.textContent = "Error.";
      closeTicketError.classList.remove("hidden");
    } finally {
      confirmCloseBtn.disabled = false;
      confirmCloseBtn.textContent = "Close Ticket";
    }
  });

  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadJobs, 400);
  });
  statusFilter.addEventListener("change", loadJobs);
  monthSelect.addEventListener("change", loadJobs);
  yearSelect.addEventListener("change", loadJobs);
  refreshBtn.addEventListener("click", loadJobs);

  loadJobs();
});