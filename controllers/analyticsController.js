const { db, getISTTimestamp } = require("../config/database");
const https = require("https");
const http = require("http");
const { URL } = require("url");

// ── SMS config (same as jobController) ──
const SMS_URL = (process.env.SMS_URL || "").trim();
const SMS_AUTHTOKEN = (process.env.SMS_AUTHTOKEN || "").trim();
const SMS_SENDERID = (process.env.SMS_SENDERID || "").trim();
const SMS_PE_ID = (process.env.SMS_PE_ID || "").trim();
const SMS_TEMPLATE_ID_READY = (process.env.SMS_TEMPLATE_ID_READY || "").trim();

const normalizeMobile = (mobile) => {
  const m = mobile.replace(/\D/g, "");
  if (m.length === 10) return "91" + m;
  if (m.length === 12 && m.startsWith("91")) return m;
  return null;
};

const sendSMS = (mobile, message, templateId) => {
  return new Promise((resolve, reject) => {
    if (!SMS_URL || !SMS_AUTHTOKEN) {
      console.warn("SMS not configured. Skipping SMS send.");
      return resolve("SMS_NOT_CONFIGURED");
    }
    try {
      const url = new URL(SMS_URL);
      url.searchParams.set("authtoken", SMS_AUTHTOKEN);
      url.searchParams.set("to", mobile);
      url.searchParams.set("from", SMS_SENDERID);
      url.searchParams.set("text", message);
      url.searchParams.set("peid", SMS_PE_ID);
      url.searchParams.set("templateid", templateId);

      console.log("\n====== SMS DEBUG (Product Ready) ======");
      console.log("TO:", mobile);
      console.log("templateid:", templateId);
      console.log("MESSAGE:", message);
      console.log("========================================\n");

      const protocol = url.protocol === "https:" ? https : http;
      protocol.get(url.toString(), (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          console.log("SMS API Response:", data);
          resolve(data);
        });
      }).on("error", (err) => {
        console.error("SMS send error:", err.message);
        reject(err);
      });
    } catch (err) {
      console.error("SMS URL parse error:", err.message);
      reject(err);
    }
  });
};

const buildProductReadySMS = (jobId) => {
  return (
    `Your product with Job ID ${jobId} is ready for pickup. ` +
    `Please collect it from store. ` +
    `Thanks for choosing Inc.5`
  );
};

// ─────────────────────────────────────────────

const extractWhIdFromRole = (role) => {
  if (!role) return null;
  const full = role.trim();
  const idx = full.indexOf(" - ");
  if (idx !== -1) return full.substring(idx + 3).trim();
  return null;
};

function toISODateOnly(v) {
  if (!v) return "";
  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function isISODate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

function isAdminRole(role) {
  return (
    String(role || "")
      .toLowerCase()
      .trim() === "admin"
  );
}

function norm(v) {
  return String(v ?? "").trim();
}

const renderAnalytics = async (req, res) => {
  try {
    const statusResult = await db.query(
      `SELECT DISTINCT "Status"
       FROM repair_app.job_data
       WHERE "Status" IS NOT NULL AND "Status" != ''
       ORDER BY "Status"`,
    );
    const statuses = statusResult.rows.map((r) => r.Status);

    const whResult = await db.query(
      `SELECT wh_id AS "WhID", warehouse_name AS "WarehouseName"
       FROM repair_app."Warehouse_Master"
       WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`,
    );

    const courierResult = await db.query(
      `SELECT courier_id AS "CourierID", courier_name AS "CourierName"
       FROM repair_app."Courier_Master"
       WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`,
    );

    const vendorResult = await db.query(
      `SELECT vendor_id AS "VendorID", vendor_name AS "VendorName"
       FROM repair_app."Vendor_Master"
       WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`,
    );

    res.render("action-analytics", {
      userId: req.session.userIdDisplay,
      role: req.session.role || "user",
      statuses,
      warehouses: whResult.rows || [],
      couriers: courierResult.rows || [],
      vendors: vendorResult.rows || [],
    });
  } catch (err) {
    console.error("renderAnalytics error:", err);
    res.status(500).send("Server error");
  }
};

const getJobs = async (req, res) => {
  try {
    const { status, month, year, search } = req.query;

    const role = (req.session.role || "").trim();
    const normalRole = role.toLowerCase();
    const isWarehouse = normalRole.startsWith("warehouse");
    const isStore = normalRole === "store";
    const isAdmin = isAdminRole(role);
    const whId = isWarehouse ? extractWhIdFromRole(role) : null;

    const where = [];
    const params = [];
    let paramIndex = 1;

    if (!isAdmin) {
      if (isWarehouse && whId) {
        where.push(`"WarehouseID" = $${paramIndex++}`);
        params.push(whId);
      } else if (isStore) {
        where.push(`"Store_Id" = $${paramIndex++}`);
        params.push(req.session.storeId || "");
      }
    }

    if (status && status !== "all") {
      where.push(`"Status" = $${paramIndex++}`);
      params.push(status);
    }

    if (year && year !== "all") {
      where.push(`TO_CHAR("CreatedAt"::timestamp, 'YYYY') = $${paramIndex++}`);
      params.push(String(year));
    }

    if (month && month !== "all") {
      where.push(`TO_CHAR("CreatedAt"::timestamp, 'MM') = $${paramIndex++}`);
      params.push(String(month).padStart(2, "0"));
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      where.push(
        `("Job_Id" ILIKE $${paramIndex} OR "CustomerName" ILIKE $${paramIndex + 1} OR "CustomerNumber" ILIKE $${paramIndex + 2} OR "ITEM_ID" ILIKE $${paramIndex + 3} OR "Store_Id" ILIKE $${paramIndex + 4} OR "AWB" ILIKE $${paramIndex + 5} OR "WarehouseID" ILIKE $${paramIndex + 6})`,
      );
      params.push(s, s, s, s, s, s, s);
      paramIndex += 7;
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const kpiResult = await db.query(
      `SELECT "Status", COUNT(*) as cnt
       FROM repair_app.job_data
       ${whereClause}
       GROUP BY "Status"`,
      params,
    );

    let total = 0;
    let closed = 0;
    let pending = 0;

    (kpiResult.rows || []).forEach((r) => {
      total += parseInt(r.cnt, 10);
      if ((r.Status || "").toLowerCase() === "closed") {
        closed += parseInt(r.cnt, 10);
      } else {
        pending += parseInt(r.cnt, 10);
      }
    });

    const jobsResult = await db.query(
      `SELECT "Job_Id", "CustomerNumber", "CustomerName", "Store_Id", "ITEM_ID",
              "ProductUnder90Days", "DeliveryDate", "Status", "Ticket_Closing_Date",
              "Attachment", "CreatedAt",
              "WarehouseID", "WarehouseName", "CourierName", "AWB", "DispatchDate",
              "WarehouseRemarks", "WarehouseAttachment",
              "Warehouse_Sent_Date",
              "Warehouse_Receive_Date",
              "Vendor_Name", "Vendor_Awb", "Gate_Pass_No",
              "Vendor_Sent_Date", "Vendor_Decision", "Vendor_Decision_Date",
              "Store_Sent_Date", "Store_Received_Date",
              "Closing_Ticket_Remarks",
              "Merchandise_Decision", "Merchandise_Action",
              "admin_logs",
              "BARCODE", "DamageReason",
              "Return_Store_AWB", "Return_Store_Remarks"
       FROM repair_app.job_data
       ${whereClause}
       ORDER BY id DESC`,
      params,
    );

    return res.json({
      success: true,
      kpi: { total, closed, pending },
      jobs: jobsResult.rows || [],
    });
  } catch (err) {
    console.error("getJobs error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const adminUpdateJob = async (req, res) => {
  const role = req.session.role || "";
  if (!isAdminRole(role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const adminUser = (
    req.session.userIdDisplay ||
    req.session.userId ||
    "admin"
  ).toString();

  const { jobId, updates, note } = req.body || {};

  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!updates || typeof updates !== "object") {
    return res.json({ success: false, message: "Updates object required" });
  }
  if (!note || !String(note).trim()) {
    return res.json({ success: false, message: "Admin note is required" });
  }

  const allowed = new Set([
    "CustomerNumber", "CustomerName", "Store_Id", "ITEM_ID",
    "ProductUnder90Days", "DeliveryDate", "Status", "Ticket_Closing_Date",
    "Closing_Ticket_Remarks", "WarehouseID", "WarehouseName", "CourierName",
    "AWB", "DispatchDate", "WarehouseRemarks", "Warehouse_Receive_Date",
    "Warehouse_Sent_Date", "Vendor_Name", "Vendor_Awb", "Gate_Pass_No",
    "Vendor_Sent_Date", "Vendor_Decision", "Vendor_Decision_Date",
    "Store_Sent_Date", "Store_Received_Date", "Merchandise_Decision",
    "Merchandise_Action", "Return_Store_AWB", "Return_Store_Remarks",
  ]);

  const keys = Object.keys(updates).filter((k) => allowed.has(k));
  if (!keys.length) {
    return res.json({ success: false, message: "No editable fields provided" });
  }

  try {
    const result = await db.query(
      `SELECT * FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row) return res.json({ success: false, message: "Job not found" });

    const changes = [];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const k of keys) {
      const oldV = norm(row[k]);
      const newV = norm(updates[k]);
      if (oldV === newV) continue;

      if (["DeliveryDate", "DispatchDate", "Vendor_Sent_Date", "Vendor_Decision_Date"].includes(k)) {
        if (newV && !isISODate(newV)) {
          return res.json({ success: false, message: `${k} must be YYYY-MM-DD` });
        }
      }

      setClauses.push(`"${k}" = $${paramIndex++}`);
      values.push(newV);
      changes.push({ field: k, from: oldV || "", to: newV || "" });
    }

    if (!setClauses.length) {
      return res.json({ success: true, message: "No changes detected" });
    }

    const istNow = getISTTimestamp();
    const prevLogs = norm(row.admin_logs);
    const logLine =
      `[${istNow}] ${adminUser} | NOTE: ${String(note).trim()} | CHANGES: ` +
      JSON.stringify(changes);
    const nextLogs = prevLogs ? `${prevLogs}\n${logLine}` : logLine;

    setClauses.push(`"admin_logs" = $${paramIndex++}`);
    values.push(nextLogs);
    values.push(jobId);

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET ${setClauses.join(", ")}
       WHERE "Job_Id" = $${paramIndex}`,
      values,
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("adminUpdateJob error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const getStatuses = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT "Status"
       FROM repair_app.job_data
       WHERE "Status" IS NOT NULL AND "Status" != ''
       ORDER BY "Status"`,
    );
    res.json({ success: true, statuses: result.rows.map((r) => r.Status) });
  } catch (err) {
    console.error("getStatuses error:", err);
    res.json({ success: false, message: err.message });
  }
};

const getAttachment = async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) {
    return res.status(400).json({ success: false, message: "Job ID required" });
  }
  try {
    const result = await db.query(
      `SELECT "Attachment" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row || !row.Attachment) {
      return res.status(404).json({ success: false, message: "No attachment" });
    }
    let att;
    try { att = JSON.parse(row.Attachment); } catch (_) {
      return res.status(500).json({ success: false, message: "Invalid attachment" });
    }
    if (!att || !att.buffer) {
      return res.status(404).json({ success: false, message: "No attachment data" });
    }
    const buf = Buffer.from(att.buffer, "base64");
    res.set({
      "Content-Type": att.mimetype || "application/octet-stream",
      "Content-Disposition": `inline; filename="${att.originalname || "attachment"}"`,
      "Content-Length": buf.length,
    });
    res.send(buf);
  } catch (err) {
    console.error("getAttachment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getWhAttachment = async (req, res) => {
  const { jobId } = req.params;
  try {
    const result = await db.query(
      `SELECT "WarehouseAttachment" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row || !row.WarehouseAttachment) {
      return res.status(404).json({ success: false, message: "No attachment" });
    }
    let att;
    try { att = JSON.parse(row.WarehouseAttachment); } catch (_) {
      return res.status(500).json({ success: false, message: "Invalid attachment" });
    }
    if (!att || !att.buffer) {
      return res.status(404).json({ success: false, message: "No attachment data" });
    }
    const buf = Buffer.from(att.buffer, "base64");
    res.set({
      "Content-Type": att.mimetype || "application/octet-stream",
      "Content-Disposition": `inline; filename="${att.originalname || "wh-attachment"}"`,
      "Content-Length": buf.length,
    });
    res.send(buf);
  } catch (err) {
    console.error("getWhAttachment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateDeliveryDate = async (req, res) => {
  const { jobId, deliveryDate } = req.body;
  if (!jobId || !deliveryDate) {
    return res.json({ success: false, message: "Missing fields" });
  }
  try {
    const result = await db.query(
      `UPDATE repair_app.job_data SET "DeliveryDate" = $1 WHERE "Job_Id" = $2`,
      [deliveryDate, jobId],
    );
    if (result.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("updateDeliveryDate error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const closeTicket = async (req, res) => {
  const { jobId, verified_otp, closing_remarks, merchandise_decision, merchandise_action } = req.body;

  if (!jobId) return res.json({ success: false, message: "Missing Job ID" });
  if (!verified_otp) return res.json({ success: false, message: "OTP verification required" });
  if (!closing_remarks || !closing_remarks.trim()) {
    return res.json({ success: false, message: "Closing remarks are required" });
  }
  if (!merchandise_decision || !merchandise_decision.trim()) {
    return res.json({ success: false, message: "Merchandise Decision is required" });
  }
  if (!merchandise_action || !merchandise_action.trim()) {
    return res.json({ success: false, message: "Merchandise Action is required" });
  }

  try {
    const jobResult = await db.query(
      `SELECT "Status", "CustomerNumber" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = jobResult.rows[0];
    if (!row) return res.json({ success: false, message: "Job not found" });
    if ((row.Status || "").toLowerCase() === "closed") {
      return res.json({ success: false, message: "Ticket already closed" });
    }

    const phone = (row.CustomerNumber || "").trim();
    if (!phone) {
      return res.json({ success: false, message: "No customer phone on this job" });
    }

    const istNow = getISTTimestamp();
    const otpResult = await db.query(
      `SELECT otp, job_id FROM repair_app.otp_store
       WHERE phone = $1 AND job_id = $2 AND expires_at > $3
       ORDER BY created_at DESC LIMIT 1`,
      [phone, jobId, istNow],
    );
    const otpRow = otpResult.rows[0];
    if (!otpRow) {
      return res.json({ success: false, message: "OTP expired or not found. Please resend." });
    }
    if (otpRow.otp !== verified_otp.trim()) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Status" = 'Closed',
           "Ticket_Closing_Date" = $1,
           "Closing_Ticket_Remarks" = $2,
           "Merchandise_Decision" = $3,
           "Merchandise_Action" = $4
       WHERE "Job_Id" = $5`,
      [istNow, closing_remarks.trim(), merchandise_decision.trim(), merchandise_action.trim(), jobId],
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    await db.query(
      `DELETE FROM repair_app.otp_store WHERE phone = $1 AND job_id = $2`,
      [phone, jobId],
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("closeTicket error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const saveWarehouseDraft = async (req, res) => {
  const { jobId, warehouse_id, warehouse_name, courier_name, awb, dispatch_date, warehouse_remarks } = req.body;
  const whFile = req.file || null;

  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!warehouse_id) return res.json({ success: false, message: "Please select a warehouse" });

  try {
    const result = await db.query(
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row) return res.json({ success: false, message: "Job not found" });
    if ((row.Status || "").toLowerCase() === "closed") {
      return res.json({ success: false, message: "Ticket is closed. Draft not allowed." });
    }

    let whAttJson = null;
    if (whFile) {
      whAttJson = JSON.stringify({
        originalname: whFile.originalname,
        mimetype: whFile.mimetype,
        size: whFile.size,
        buffer: whFile.buffer ? whFile.buffer.toString("base64") : null,
      });
    }

    const setClauses = [
      `"WarehouseID" = NULL`, `"WarehouseName" = $1`, `"CourierName" = $2`,
      `"AWB" = $3`, `"DispatchDate" = $4`, `"WarehouseRemarks" = $5`,
    ];
    const vals = [
      (warehouse_name || "").trim(), (courier_name || "").trim(),
      (awb || "").trim(), dispatch_date || "", (warehouse_remarks || "").trim(),
    ];
    let paramIndex = 6;
    if (whFile) { setClauses.push(`"WarehouseAttachment" = $${paramIndex++}`); vals.push(whAttJson); }
    vals.push(jobId);

    const updateResult = await db.query(
      `UPDATE repair_app.job_data SET ${setClauses.join(", ")} WHERE "Job_Id" = $${paramIndex}`,
      vals,
    );
    if (updateResult.rowCount === 0) return res.json({ success: false, message: "Job not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("saveWarehouseDraft error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const transferToWarehouse = async (req, res) => {
  const { jobId, warehouse_id, warehouse_name, courier_name, awb, dispatch_date, warehouse_remarks } = req.body;
  const whFile = req.file || null;

  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!warehouse_id) return res.json({ success: false, message: "Please select a warehouse" });

  try {
    const result = await db.query(
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row) return res.json({ success: false, message: "Job not found" });

    const istNow = getISTTimestamp();
    const whIdClean = (warehouse_id || "").split(" - ")[0].trim();

    let whAttJson = null;
    if (whFile) {
      whAttJson = JSON.stringify({
        originalname: whFile.originalname, mimetype: whFile.mimetype,
        size: whFile.size, buffer: whFile.buffer ? whFile.buffer.toString("base64") : null,
      });
    }

    const setClauses = [
      `"WarehouseID" = $1`, `"WarehouseName" = $2`, `"CourierName" = $3`,
      `"AWB" = $4`, `"DispatchDate" = $5`, `"WarehouseRemarks" = $6`,
      `"Status" = 'Sent to Warehouse'`, `"Warehouse_Sent_Date" = $7`,
    ];
    const vals = [
      whIdClean, (warehouse_name || "").trim(), (courier_name || "").trim(),
      (awb || "").trim(), dispatch_date || "", (warehouse_remarks || "").trim(), istNow,
    ];
    let paramIndex = 8;
    if (whFile) { setClauses.push(`"WarehouseAttachment" = $${paramIndex++}`); vals.push(whAttJson); }
    vals.push(jobId);

    const updateResult = await db.query(
      `UPDATE repair_app.job_data SET ${setClauses.join(", ")} WHERE "Job_Id" = $${paramIndex}`,
      vals,
    );
    if (updateResult.rowCount === 0) return res.json({ success: false, message: "Job not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("transferToWarehouse error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const warehouseAcknowledge = async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  try {
    const result = await db.query(
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`, [jobId],
    );
    if (!result.rows[0]) return res.json({ success: false, message: "Job not found" });
    const istNow = getISTTimestamp();
    const updateResult = await db.query(
      `UPDATE repair_app.job_data SET "Status" = 'Warehouse Received', "Warehouse_Receive_Date" = $1 WHERE "Job_Id" = $2`,
      [istNow, jobId],
    );
    if (updateResult.rowCount === 0) return res.json({ success: false, message: "Job not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("warehouseAcknowledge error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const saveVendorDraft = async (req, res) => {
  const { jobId, vendor_name, gate_pass_no, vendor_sent_date, vendor_awb } = req.body;
  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!vendor_name) return res.json({ success: false, message: "Please select a vendor" });
  const draftDate = (vendor_sent_date || "").trim();
  try {
    const result = await db.query(
      `SELECT "Status", "Warehouse_Receive_Date", "DeliveryDate" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row) return res.json({ success: false, message: "Job not found" });
    if ((row.Status || "").toLowerCase().trim() === "closed") {
      return res.json({ success: false, message: "Ticket is closed." });
    }
    const recvISO = toISODateOnly(row.Warehouse_Receive_Date);
    const delISO = toISODateOnly(row.DeliveryDate);
    if (draftDate) {
      if (!isISODate(draftDate)) return res.json({ success: false, message: "Invalid date format (expected YYYY-MM-DD)" });
      if (recvISO && draftDate < recvISO) return res.json({ success: false, message: `Date must be on/after Warehouse Receive Date (${recvISO}).` });
      if (delISO && draftDate > delISO) return res.json({ success: false, message: `Date must be on/before Delivery Date (${delISO}).` });
    }
    const updateResult = await db.query(
      `UPDATE repair_app.job_data SET "Vendor_Name" = $1, "Gate_Pass_No" = $2, "Vendor_Sent_Date" = $3, "Vendor_Awb" = $4 WHERE "Job_Id" = $5`,
      [(vendor_name || "").trim(), (gate_pass_no || "").trim(), draftDate || "", (vendor_awb || "").trim(), jobId],
    );
    if (updateResult.rowCount === 0) return res.json({ success: false, message: "Job not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("saveVendorDraft error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const sendToVendor = async (req, res) => {
  const { jobId, vendor_name, gate_pass_no, vendor_sent_date, vendor_awb } = req.body;
  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!vendor_name) return res.json({ success: false, message: "Please select a vendor" });
  if (!vendor_sent_date || !String(vendor_sent_date).trim()) {
    return res.json({ success: false, message: "Please select a date" });
  }
  const sentDate = String(vendor_sent_date).trim();
  if (!isISODate(sentDate)) return res.json({ success: false, message: "Invalid date format (expected YYYY-MM-DD)" });

  try {
    const result = await db.query(
      `SELECT "Status", "Warehouse_Receive_Date", "DeliveryDate" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row) return res.json({ success: false, message: "Job not found" });
    const recvISO = toISODateOnly(row.Warehouse_Receive_Date);
    const delISO = toISODateOnly(row.DeliveryDate);
    if (!recvISO) return res.json({ success: false, message: "Warehouse Receive Date is missing." });
    if (!delISO) return res.json({ success: false, message: "Delivery Date is missing." });
    if (sentDate < recvISO) return res.json({ success: false, message: `Date must be on/after Warehouse Receive Date (${recvISO}).` });
    if (sentDate > delISO) return res.json({ success: false, message: `Date must be on/before Delivery Date (${delISO}).` });

    const updateResult = await db.query(
      `UPDATE repair_app.job_data SET "Status" = 'Sent to Vendor', "Vendor_Name" = $1, "Gate_Pass_No" = $2, "Vendor_Sent_Date" = $3, "Vendor_Awb" = $4 WHERE "Job_Id" = $5`,
      [(vendor_name || "").trim(), (gate_pass_no || "").trim(), sentDate, (vendor_awb || "").trim(), jobId],
    );
    if (updateResult.rowCount === 0) return res.json({ success: false, message: "Job not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("sendToVendor error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const vendorDecision = async (req, res) => {
  const { jobId, vendor_decision, vendor_decision_date } = req.body;
  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!vendor_decision) return res.json({ success: false, message: "Please select a decision" });
  if (!["Repaired", "Replaced"].includes(vendor_decision)) return res.json({ success: false, message: "Invalid decision value" });
  if (!vendor_decision_date || !String(vendor_decision_date).trim()) return res.json({ success: false, message: "Please select a date" });
  const decisionDate = String(vendor_decision_date).trim();
  if (!isISODate(decisionDate)) return res.json({ success: false, message: "Invalid date format (expected YYYY-MM-DD)" });
  const newStatus = `Vendor: ${vendor_decision}`;

  try {
    const result = await db.query(
      `SELECT "Status", "Vendor_Sent_Date", "DeliveryDate" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row) return res.json({ success: false, message: "Job not found" });
    const sentISO = toISODateOnly(row.Vendor_Sent_Date);
    const delISO = toISODateOnly(row.DeliveryDate);
    if (!sentISO) return res.json({ success: false, message: "Vendor Sent Date is missing." });
    if (!delISO) return res.json({ success: false, message: "Delivery Date is missing." });
    if (decisionDate < sentISO) return res.json({ success: false, message: `Decision date must be on/after Vendor Sent Date (${sentISO}).` });
    if (decisionDate > delISO) return res.json({ success: false, message: `Decision date must be on/before Delivery Date (${delISO}).` });

    const updateResult = await db.query(
      `UPDATE repair_app.job_data SET "Status" = $1, "Vendor_Decision" = $2, "Vendor_Decision_Date" = $3 WHERE "Job_Id" = $4`,
      [newStatus, vendor_decision, decisionDate, jobId],
    );
    if (updateResult.rowCount === 0) return res.json({ success: false, message: "Job not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("vendorDecision error:", err);
    return res.json({ success: false, message: err.message });
  }
};

// ── RETURN TO STORE ──────────────────────────────────────────────────────────
const returnToStore = async (req, res) => {
  const { jobId, return_awb, return_remarks } = req.body;
  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!return_awb || !String(return_awb).trim()) {
    return res.json({ success: false, message: "AWB Number is required" });
  }

  try {
    const result = await db.query(
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    if (!result.rows[0]) return res.json({ success: false, message: "Job not found" });

    const istNow = getISTTimestamp();

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Status" = 'Sent to Store',
           "Store_Sent_Date" = $1,
           "Return_Store_AWB" = $2,
           "Return_Store_Remarks" = $3
       WHERE "Job_Id" = $4`,
      [istNow, String(return_awb).trim(), (return_remarks || "").trim(), jobId],
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("returnToStore error:", err);
    return res.json({ success: false, message: err.message });
  }
};

// ── STORE ACKNOWLEDGE — sends Product Ready SMS to customer ──────────────────
const storeAcknowledge = async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  try {
    const result = await db.query(
      `SELECT "Status", "CustomerNumber" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    if (!result.rows[0]) return res.json({ success: false, message: "Job not found" });

    const customerPhone = (result.rows[0].CustomerNumber || "").trim();
    const istNow = getISTTimestamp();

    const updateResult = await db.query(
      `UPDATE repair_app.job_data SET "Status" = 'Store Received', "Store_Received_Date" = $1 WHERE "Job_Id" = $2`,
      [istNow, jobId],
    );
    if (updateResult.rowCount === 0) return res.json({ success: false, message: "Job not found" });

    // ── Send Product Ready SMS to customer ──
    if (customerPhone && SMS_TEMPLATE_ID_READY) {
      const mobile = normalizeMobile(customerPhone);
      if (mobile) {
        const message = buildProductReadySMS(jobId);
        sendSMS(mobile, message, SMS_TEMPLATE_ID_READY)
          .then(() => console.log(`✓ Product Ready SMS sent to ${mobile} for Job ${jobId}`))
          .catch((err) => console.error("Product Ready SMS failed:", err.message));
      } else {
        console.warn(`Invalid phone for Product Ready SMS: ${customerPhone}`);
      }
    } else {
      console.warn("Product Ready SMS skipped — no phone or SMS_TEMPLATE_ID_READY not set");
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("storeAcknowledge error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const generateReceipt = async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) {
    return res.status(400).json({ success: false, message: "Job ID required" });
  }

  try {
    const jobResult = await db.query(
      `SELECT "Job_Id", "BARCODE", "ITEM_ID", "DamageReason", "WarehouseID",
              "WarehouseName", "CourierName", "AWB", "DispatchDate",
              "WarehouseRemarks", "Store_Id", "CustomerName", "CustomerNumber",
              "Warehouse_Sent_Date", "CreatedAt", "ProductUnder90Days",
              "Vendor_Name", "Vendor_Awb", "Gate_Pass_No", "Vendor_Sent_Date",
              "Vendor_Decision", "Return_Store_AWB", "Return_Store_Remarks",
              "Store_Sent_Date", "Store_Received_Date",
              "Merchandise_Decision", "Merchandise_Action",
              "Ticket_Closing_Date", "Closing_Ticket_Remarks", "Status"
       FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    const job = jobResult.rows[0];
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    let warehouseAddress = "";
    if (job.WarehouseID || job.WarehouseName) {
      const whResult = await db.query(
        `SELECT address, city, state FROM repair_app."Warehouse_Master" WHERE wh_id = $1 OR warehouse_name = $2 LIMIT 1`,
        [job.WarehouseID || "", job.WarehouseName || ""],
      );
      if (whResult.rows[0]) {
        const w = whResult.rows[0];
        warehouseAddress = [w.address, w.city, w.state].filter(Boolean).join(", ");
      }
    }

    let storeAddress = "";
    let storeName = "";
    if (job.Store_Id) {
      const storeResult = await db.query(
        `SELECT address, city, state, store_name FROM repair_app."Store_Master" WHERE store_id = $1 OR store_name = $1 LIMIT 1`,
        [job.Store_Id],
      );
      if (storeResult.rows[0]) {
        const s = storeResult.rows[0];
        storeName = s.store_name || "";
        storeAddress = [s.address, s.city, s.state].filter(Boolean).join(", ");
      }
    }

    const PDFDocument = require("pdfkit");
    const PAGE_W = 595.28;
    const ML = 40;
    const MR = 40;
    const CW = PAGE_W - ML - MR;
    const RED = "#c0392b";
    const NAVY = "#18130e";
    const GREY = "#5a4f45";
    const LGREY = "#9a8f85";
    const BDR = "#dfd6cc";

    const doc = new PDFDocument({ size: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Receipt-${jobId}.pdf"`);
    doc.pipe(res);

    doc.rect(0, 0, PAGE_W, 62).fill(NAVY);
    doc.rect(0, 59, PAGE_W, 3).fill(RED);
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("INC.5", ML, 14);
    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.4)");
    doc.text("FOOTWEAR REPAIR PORTAL", ML, 38);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(RED);
    doc.text("WAREHOUSE TRANSFER RECEIPT", ML, 14, { align: "right", width: CW });
    doc.fontSize(8).font("Helvetica").fillColor("rgba(255,255,255,0.4)");
    const genDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "numeric", year: "numeric" });
    doc.text(`Generated: ${genDate}`, ML, 36, { align: "right", width: CW });

    let y = 70;
    doc.fontSize(11).font("Helvetica-Bold").fillColor(NAVY);
    doc.text(`Receipt No: ${job.Job_Id}`, ML, y);
    doc.fontSize(8).font("Helvetica").fillColor(LGREY);
    const dispDate = job.Warehouse_Sent_Date || job.DispatchDate || "";
    doc.text(`Date: ${dispDate}`, ML, y + 14);
    y += 34;
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(BDR).lineWidth(0.5).stroke();
    y += 10;

    doc.fontSize(7).font("Helvetica-Bold").fillColor(RED);
    doc.text("FROM (STORE)", ML, y);
    doc.text("TO (WAREHOUSE)", ML + CW / 2 + 10, y);
    y += 13;
    doc.fontSize(10).font("Helvetica-Bold").fillColor(NAVY);
    doc.text(job.Store_Id || "—", ML, y, { width: CW / 2 - 5 });
    doc.text(job.WarehouseID ? `${job.WarehouseID}${job.WarehouseName ? " - " + job.WarehouseName : ""}` : "—", ML + CW / 2 + 10, y, { width: CW / 2 - 10 });
    y += 14;
    doc.fontSize(8).font("Helvetica").fillColor(GREY);
    const storeText = [storeName, storeAddress].filter(Boolean).join("\n") || "—";
    doc.text(storeText, ML, y, { width: CW / 2 - 5 });
    doc.text(warehouseAddress || "—", ML + CW / 2 + 10, y, { width: CW / 2 - 10 });
    y += 28;
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(BDR).lineWidth(0.5).stroke();
    y += 10;

    const row = (label, value, yy) => {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(LGREY);
      doc.text(label, ML, yy, { width: 130 });
      doc.fontSize(9).font("Helvetica").fillColor(NAVY);
      const raw = (value || "").toString().trim();
      const typedMatch = raw.match(/^(.+?)\s*-\s*Typed\s*$/i);
      if (typedMatch) {
        doc.text(typedMatch[1].trim() + " ", ML + 135, yy, { width: CW - 135, continued: true });
        doc.fontSize(6).font("Helvetica-Bold").fillColor("#b45309");
        doc.text("[Typed]", { continued: false });
      } else {
        doc.text(raw || "—", ML + 135, yy, { width: CW - 135 });
      }
      return yy + 16;
    };

    doc.fontSize(7).font("Helvetica-Bold").fillColor(RED);
    doc.text("ITEM DETAILS", ML, y);
    y += 13;
    y = row("Job ID", job.Job_Id, y);
    y = row("Barcode", job.BARCODE, y);
    y = row("Item ID", job.ITEM_ID, y);
    y = row("Warranty", job.ProductUnder90Days, y);
    if (job.DamageReason) y = row("Damage Reason", job.DamageReason, y);

    y += 4;
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(BDR).lineWidth(0.5).stroke();
    y += 10;
    doc.fontSize(7).font("Helvetica-Bold").fillColor(RED);
    doc.text("DISPATCH DETAILS", ML, y);
    y += 13;
    y = row("Warehouse ID", job.WarehouseID, y);
    y = row("Warehouse Name", job.WarehouseName, y);
    y = row("Courier", job.CourierName, y);
    y = row("AWB No.", job.AWB, y);
    y = row("Dispatch Date", job.DispatchDate, y);
    y = row("Store ID", job.Store_Id, y);
    if (job.WarehouseRemarks) y = row("Remarks", job.WarehouseRemarks, y);

    if (job.Vendor_Name) {
      y += 4;
      doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(BDR).lineWidth(0.5).stroke();
      y += 10;
      doc.fontSize(7).font("Helvetica-Bold").fillColor(RED);
      doc.text("VENDOR DETAILS", ML, y);
      y += 13;
      y = row("Vendor", job.Vendor_Name, y);
      y = row("Gate Pass No", job.Gate_Pass_No, y);
      y = row("AWB No.", job.Vendor_Awb, y);
      y = row("Sent Date", job.Vendor_Sent_Date, y);
      y = row("Decision", job.Vendor_Decision, y);
    }

    if (job.Return_Store_AWB || job.Store_Sent_Date) {
      y += 4;
      doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(BDR).lineWidth(0.5).stroke();
      y += 10;
      doc.fontSize(7).font("Helvetica-Bold").fillColor(RED);
      doc.text("RETURN TO STORE", ML, y);
      y += 13;
      y = row("Return AWB", job.Return_Store_AWB, y);
      y = row("Sent Date", job.Store_Sent_Date, y);
      y = row("Received Date", job.Store_Received_Date, y);
      if (job.Return_Store_Remarks) y = row("Remarks", job.Return_Store_Remarks, y);
    }

    const sigY = 740;
    const sigW = 160;
    doc.moveTo(ML, sigY).lineTo(ML + sigW, sigY).strokeColor(NAVY).lineWidth(0.5).stroke();
    doc.moveTo(ML + CW - sigW, sigY).lineTo(ML + CW, sigY).strokeColor(NAVY).lineWidth(0.5).stroke();
    doc.fontSize(7).font("Helvetica").fillColor(LGREY);
    doc.text("Store Signature / Stamp", ML, sigY + 5);
    doc.text("Warehouse Signature / Stamp", ML + CW - sigW, sigY + 5, { width: sigW });

    doc.rect(0, 800, PAGE_W, 41.89).fill(NAVY);
    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.45)");
    doc.text(
      "This is a system-generated receipt from Inc.5 Footwear Repair Portal. No signature required for digital copy.",
      ML, 815, { width: CW, align: "center" },
    );

    doc.end();
  } catch (err) {
    console.error("generateReceipt error:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate receipt" });
    }
  }
};

module.exports = {
  renderAnalytics, getJobs, getStatuses, getAttachment, getWhAttachment,
  updateDeliveryDate, closeTicket, saveWarehouseDraft, transferToWarehouse,
  warehouseAcknowledge, saveVendorDraft, sendToVendor, vendorDecision,
  returnToStore, storeAcknowledge, adminUpdateJob, generateReceipt,
};