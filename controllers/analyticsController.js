const { db, getISTTimestamp } = require("../config/database");

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
  return String(role || "").toLowerCase().trim() === "admin";
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
       ORDER BY "Status"`
    );
    const statuses = statusResult.rows.map((r) => r.Status);

    const whResult = await db.query(
      `SELECT wh_id AS "WhID", warehouse_name AS "WarehouseName"
       FROM repair_app."Warehouse_Master"
       WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`
    );

    const courierResult = await db.query(
      `SELECT courier_id AS "CourierID", courier_name AS "CourierName"
       FROM repair_app."Courier_Master"
       WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`
    );

    const vendorResult = await db.query(
      `SELECT vendor_id AS "VendorID", vendor_name AS "VendorName"
       FROM repair_app."Vendor_Master"
       WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`
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
        `("Job_Id" ILIKE $${paramIndex} OR "CustomerName" ILIKE $${paramIndex + 1} OR "CustomerNumber" ILIKE $${paramIndex + 2} OR "ITEM_ID" ILIKE $${paramIndex + 3} OR "Store_Id" ILIKE $${paramIndex + 4} OR "AWB" ILIKE $${paramIndex + 5} OR "WarehouseID" ILIKE $${paramIndex + 6})`
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
      params
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
              "admin_logs"
       FROM repair_app.job_data
       ${whereClause}
       ORDER BY id DESC`,
      params
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
    "CustomerNumber",
    "CustomerName",
    "Store_Id",
    "ITEM_ID",
    "ProductUnder90Days",
    "DeliveryDate",
    "Status",
    "Ticket_Closing_Date",
    "Closing_Ticket_Remarks",
    "WarehouseID",
    "WarehouseName",
    "CourierName",
    "AWB",
    "DispatchDate",
    "WarehouseRemarks",
    "Warehouse_Receive_Date",
    "Warehouse_Sent_Date",
    "Vendor_Name",
    "Vendor_Awb",
    "Gate_Pass_No",
    "Vendor_Sent_Date",
    "Vendor_Decision",
    "Vendor_Decision_Date",
    "Store_Sent_Date",
    "Store_Received_Date",
  ]);

  const keys = Object.keys(updates).filter((k) => allowed.has(k));
  if (!keys.length) {
    return res.json({ success: false, message: "No editable fields provided" });
  }

  try {
    const result = await db.query(
      `SELECT * FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId]
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

      if (
        k === "DeliveryDate" ||
        k === "DispatchDate" ||
        k === "Vendor_Sent_Date" ||
        k === "Vendor_Decision_Date"
      ) {
        if (newV && !isISODate(newV)) {
          return res.json({
            success: false,
            message: `${k} must be YYYY-MM-DD`,
          });
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
      values
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
       ORDER BY "Status"`
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
      [jobId]
    );
    const row = result.rows[0];

    if (!row || !row.Attachment) {
      return res.status(404).json({ success: false, message: "No attachment" });
    }

    let att;
    try {
      att = JSON.parse(row.Attachment);
    } catch (_) {
      return res
        .status(500)
        .json({ success: false, message: "Invalid attachment" });
    }

    if (!att || !att.buffer) {
      return res
        .status(404)
        .json({ success: false, message: "No attachment data" });
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
      `SELECT "WarehouseAttachment"
       FROM repair_app.job_data
       WHERE "Job_Id" = $1`,
      [jobId]
    );
    const row = result.rows[0];

    if (!row || !row.WarehouseAttachment) {
      return res.status(404).json({ success: false, message: "No attachment" });
    }

    let att;
    try {
      att = JSON.parse(row.WarehouseAttachment);
    } catch (_) {
      return res
        .status(500)
        .json({ success: false, message: "Invalid attachment" });
    }

    if (!att || !att.buffer) {
      return res
        .status(404)
        .json({ success: false, message: "No attachment data" });
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
      `UPDATE repair_app.job_data
       SET "DeliveryDate" = $1
       WHERE "Job_Id" = $2`,
      [deliveryDate, jobId]
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
  const { jobId, verified_otp, closing_remarks } = req.body;

  if (!jobId) return res.json({ success: false, message: "Missing Job ID" });
  if (!verified_otp) {
    return res.json({ success: false, message: "OTP verification required" });
  }
  if (!closing_remarks || !closing_remarks.trim()) {
    return res.json({
      success: false,
      message: "Closing remarks are required",
    });
  }

  try {
    const jobResult = await db.query(
      `SELECT "Status", "CustomerNumber"
       FROM repair_app.job_data
       WHERE "Job_Id" = $1`,
      [jobId]
    );
    const row = jobResult.rows[0];

    if (!row) return res.json({ success: false, message: "Job not found" });
    if ((row.Status || "").toLowerCase() === "closed") {
      return res.json({ success: false, message: "Ticket already closed" });
    }

    const phone = (row.CustomerNumber || "").trim();
    if (!phone) {
      return res.json({
        success: false,
        message: "No customer phone on this job",
      });
    }

    const istNow = getISTTimestamp();

    const otpResult = await db.query(
      `SELECT otp, job_id
       FROM repair_app.otp_store
       WHERE phone = $1 AND job_id = $2 AND expires_at > $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, jobId, istNow]
    );
    const otpRow = otpResult.rows[0];

    if (!otpRow) {
      return res.json({
        success: false,
        message: "OTP expired or not found. Please resend.",
      });
    }

    if (otpRow.otp !== verified_otp.trim()) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Status" = 'Closed',
           "Ticket_Closing_Date" = $1,
           "Closing_Ticket_Remarks" = $2
       WHERE "Job_Id" = $3`,
      [istNow, closing_remarks.trim(), jobId]
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    await db.query(
      `DELETE FROM repair_app.otp_store WHERE phone = $1 AND job_id = $2`,
      [phone, jobId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("closeTicket error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const saveWarehouseDraft = async (req, res) => {
  const {
    jobId,
    warehouse_id,
    warehouse_name,
    courier_name,
    awb,
    dispatch_date,
    warehouse_remarks,
  } = req.body;

  const whFile = req.file || null;

  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!warehouse_id) {
    return res.json({ success: false, message: "Please select a warehouse" });
  }

  try {
    const result = await db.query(
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId]
    );
    const row = result.rows[0];

    if (!row) return res.json({ success: false, message: "Job not found" });

    if ((row.Status || "").toLowerCase() === "closed") {
      return res.json({
        success: false,
        message: "Ticket is closed. Draft not allowed.",
      });
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
      `"WarehouseID" = NULL`,
      `"WarehouseName" = $1`,
      `"CourierName" = $2`,
      `"AWB" = $3`,
      `"DispatchDate" = $4`,
      `"WarehouseRemarks" = $5`,
    ];

    const vals = [
      (warehouse_name || "").trim(),
      (courier_name || "").trim(),
      (awb || "").trim(),
      dispatch_date || "",
      (warehouse_remarks || "").trim(),
    ];

    let paramIndex = 6;

    if (whFile) {
      setClauses.push(`"WarehouseAttachment" = $${paramIndex++}`);
      vals.push(whAttJson);
    }

    vals.push(jobId);

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET ${setClauses.join(", ")}
       WHERE "Job_Id" = $${paramIndex}`,
      vals
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("saveWarehouseDraft error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const transferToWarehouse = async (req, res) => {
  const {
    jobId,
    warehouse_id,
    warehouse_name,
    courier_name,
    awb,
    dispatch_date,
    warehouse_remarks,
  } = req.body;

  const whFile = req.file || null;

  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!warehouse_id) {
    return res.json({ success: false, message: "Please select a warehouse" });
  }

  try {
    const result = await db.query(
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId]
    );
    const row = result.rows[0];
    if (!row) return res.json({ success: false, message: "Job not found" });

    const istNow = getISTTimestamp();
    const whIdClean = (warehouse_id || "").split(" - ")[0].trim();

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
      `"WarehouseID" = $1`,
      `"WarehouseName" = $2`,
      `"CourierName" = $3`,
      `"AWB" = $4`,
      `"DispatchDate" = $5`,
      `"WarehouseRemarks" = $6`,
      `"Status" = 'Sent to Warehouse'`,
      `"Warehouse_Sent_Date" = $7`,
    ];

    const vals = [
      whIdClean,
      (warehouse_name || "").trim(),
      (courier_name || "").trim(),
      (awb || "").trim(),
      dispatch_date || "",
      (warehouse_remarks || "").trim(),
      istNow,
    ];

    let paramIndex = 8;

    if (whFile) {
      setClauses.push(`"WarehouseAttachment" = $${paramIndex++}`);
      vals.push(whAttJson);
    }

    vals.push(jobId);

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET ${setClauses.join(", ")}
       WHERE "Job_Id" = $${paramIndex}`,
      vals
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

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
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId]
    );

    if (!result.rows[0]) {
      return res.json({ success: false, message: "Job not found" });
    }

    const istNow = getISTTimestamp();

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Status" = 'Warehouse Received',
           "Warehouse_Receive_Date" = $1
       WHERE "Job_Id" = $2`,
      [istNow, jobId]
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("warehouseAcknowledge error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const saveVendorDraft = async (req, res) => {
  const { jobId, vendor_name, gate_pass_no, vendor_sent_date, vendor_awb } =
    req.body;

  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!vendor_name) {
    return res.json({ success: false, message: "Please select a vendor" });
  }

  const draftDate = (vendor_sent_date || "").trim();

  try {
    const result = await db.query(
      `SELECT "Status", "Warehouse_Receive_Date", "DeliveryDate"
       FROM repair_app.job_data
       WHERE "Job_Id" = $1`,
      [jobId]
    );
    const row = result.rows[0];

    if (!row) return res.json({ success: false, message: "Job not found" });

    const st = (row.Status || "").toLowerCase().trim();
    if (st === "closed") {
      return res.json({ success: false, message: "Ticket is closed." });
    }

    const recvISO = toISODateOnly(row.Warehouse_Receive_Date);
    const delISO = toISODateOnly(row.DeliveryDate);

    if (draftDate) {
      if (!isISODate(draftDate)) {
        return res.json({
          success: false,
          message: "Invalid date format (expected YYYY-MM-DD)",
        });
      }
      if (recvISO && draftDate < recvISO) {
        return res.json({
          success: false,
          message: `Date must be on/after Warehouse Receive Date (${recvISO}).`,
        });
      }
      if (delISO && draftDate > delISO) {
        return res.json({
          success: false,
          message: `Date must be on/before Delivery Date (${delISO}).`,
        });
      }
    }

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Vendor_Name" = $1,
           "Gate_Pass_No" = $2,
           "Vendor_Sent_Date" = $3,
           "Vendor_Awb" = $4
       WHERE "Job_Id" = $5`,
      [
        (vendor_name || "").trim(),
        (gate_pass_no || "").trim(),
        draftDate || "",
        (vendor_awb || "").trim(),
        jobId,
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("saveVendorDraft error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const sendToVendor = async (req, res) => {
  const { jobId, vendor_name, gate_pass_no, vendor_sent_date, vendor_awb } =
    req.body;

  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!vendor_name) {
    return res.json({ success: false, message: "Please select a vendor" });
  }
  if (!vendor_sent_date || !String(vendor_sent_date).trim()) {
    return res.json({ success: false, message: "Please select a date" });
  }

  const sentDate = String(vendor_sent_date).trim();

  if (!isISODate(sentDate)) {
    return res.json({
      success: false,
      message: "Invalid date format (expected YYYY-MM-DD)",
    });
  }

  try {
    const result = await db.query(
      `SELECT "Status", "Warehouse_Receive_Date", "DeliveryDate"
       FROM repair_app.job_data
       WHERE "Job_Id" = $1`,
      [jobId]
    );
    const row = result.rows[0];

    if (!row) return res.json({ success: false, message: "Job not found" });

    const recvISO = toISODateOnly(row.Warehouse_Receive_Date);
    const delISO = toISODateOnly(row.DeliveryDate);

    if (!recvISO) {
      return res.json({
        success: false,
        message:
          "Warehouse Receive Date is missing. Please Acknowledge & Receive first.",
      });
    }

    if (!delISO) {
      return res.json({
        success: false,
        message:
          "Delivery Date is missing. Please ask Store to update Delivery Date first.",
      });
    }

    if (sentDate < recvISO) {
      return res.json({
        success: false,
        message: `Date must be on/after Warehouse Receive Date (${recvISO}).`,
      });
    }

    if (sentDate > delISO) {
      return res.json({
        success: false,
        message: `Date must be on/before Delivery Date (${delISO}).`,
      });
    }

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Status" = 'Sent to Vendor',
           "Vendor_Name" = $1,
           "Gate_Pass_No" = $2,
           "Vendor_Sent_Date" = $3,
           "Vendor_Awb" = $4
       WHERE "Job_Id" = $5`,
      [
        (vendor_name || "").trim(),
        (gate_pass_no || "").trim(),
        sentDate,
        (vendor_awb || "").trim(),
        jobId,
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("sendToVendor error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const vendorDecision = async (req, res) => {
  const { jobId, vendor_decision, vendor_decision_date } = req.body;

  if (!jobId) return res.json({ success: false, message: "Job ID required" });
  if (!vendor_decision) {
    return res.json({ success: false, message: "Please select a decision" });
  }
  if (!["Repaired", "Replaced"].includes(vendor_decision)) {
    return res.json({ success: false, message: "Invalid decision value" });
  }
  if (!vendor_decision_date || !String(vendor_decision_date).trim()) {
    return res.json({ success: false, message: "Please select a date" });
  }

  const decisionDate = String(vendor_decision_date).trim();

  if (!isISODate(decisionDate)) {
    return res.json({
      success: false,
      message: "Invalid date format (expected YYYY-MM-DD)",
    });
  }

  const newStatus = `Vendor: ${vendor_decision}`;

  try {
    const result = await db.query(
      `SELECT "Status", "Vendor_Sent_Date", "DeliveryDate"
       FROM repair_app.job_data
       WHERE "Job_Id" = $1`,
      [jobId]
    );
    const row = result.rows[0];

    if (!row) return res.json({ success: false, message: "Job not found" });

    const sentISO = toISODateOnly(row.Vendor_Sent_Date);
    const delISO = toISODateOnly(row.DeliveryDate);

    if (!sentISO) {
      return res.json({
        success: false,
        message:
          "Vendor Sent Date is missing. Please use 'Send to Vendor' first.",
      });
    }

    if (!delISO) {
      return res.json({
        success: false,
        message:
          "Delivery Date is missing. Please ask Store to update Delivery Date first.",
      });
    }

    if (decisionDate < sentISO) {
      return res.json({
        success: false,
        message: `Decision date must be on/after Vendor Sent Date (${sentISO}).`,
      });
    }

    if (decisionDate > delISO) {
      return res.json({
        success: false,
        message: `Decision date must be on/before Delivery Date (${delISO}).`,
      });
    }

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Status" = $1,
           "Vendor_Decision" = $2,
           "Vendor_Decision_Date" = $3
       WHERE "Job_Id" = $4`,
      [newStatus, vendor_decision, decisionDate, jobId]
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("vendorDecision error:", err);
    return res.json({ success: false, message: err.message });
  }
};

const returnToStore = async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.json({ success: false, message: "Job ID required" });

  try {
    const result = await db.query(
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId]
    );

    if (!result.rows[0]) {
      return res.json({ success: false, message: "Job not found" });
    }

    const istNow = getISTTimestamp();

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Status" = 'Sent to Store',
           "Store_Sent_Date" = $1
       WHERE "Job_Id" = $2`,
      [istNow, jobId]
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

const storeAcknowledge = async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.json({ success: false, message: "Job ID required" });

  try {
    const result = await db.query(
      `SELECT "Status" FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId]
    );

    if (!result.rows[0]) {
      return res.json({ success: false, message: "Job not found" });
    }

    const istNow = getISTTimestamp();

    const updateResult = await db.query(
      `UPDATE repair_app.job_data
       SET "Status" = 'Store Received',
           "Store_Received_Date" = $1
       WHERE "Job_Id" = $2`,
      [istNow, jobId]
    );

    if (updateResult.rowCount === 0) {
      return res.json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("storeAcknowledge error:", err);
    return res.json({ success: false, message: err.message });
  }
};

module.exports = {
  renderAnalytics,
  getJobs,
  getStatuses,
  getAttachment,
  getWhAttachment,
  updateDeliveryDate,
  closeTicket,
  saveWarehouseDraft,
  transferToWarehouse,
  warehouseAcknowledge,
  saveVendorDraft,
  sendToVendor,
  vendorDecision,
  returnToStore,
  storeAcknowledge,
  adminUpdateJob,
};