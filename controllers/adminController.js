// controllers/adminController.js

const { db } = require("../config/database");
const XLSX = require("xlsx");
const bcrypt = require("bcrypt");

const MAX_USERS = 120;

const TABLE_CONFIG = {
  Item_Master: {
    dbName: '"Item_Master"',
    displayName: "Item Master",
    uniqueKey: "barcode",
    quotedCols: false,
    searchPlaceholder: "Search by Barcode or Item Code...",
    searchColumns: ["barcode", "item_code"],
    columns: [
      { db: "barcode", label: "Barcode", required: true },
      { db: "item_code", label: "Item Code" },
      { db: "division", label: "Division" },
      { db: "section", label: "Section" },
      { db: "department", label: "Department" },
      { db: "article_name", label: "Article Name" },
      { db: "item_wsp", label: "Item WSP" },
      { db: "created_on", label: "Created On" },
      { db: "category1", label: "Category 1" },
      { db: "category2", label: "Category 2" },
      { db: "category3", label: "Category 3" },
      { db: "category4", label: "Category 4" },
      { db: "category5", label: "Category 5" },
      { db: "mrp", label: "MRP" },
      { db: "rsp", label: "RSP" },
      { db: "wsp", label: "WSP" },
      { db: "standard_rate", label: "Standard Rate" },
      { db: "string_desc1", label: "String Desc 1" },
      { db: "string_desc2", label: "String Desc 2" },
      { db: "string_desc3", label: "String Desc 3" },
      { db: "string_desc4", label: "String Desc 4" },
      { db: "string_desc5", label: "String Desc 5" },
      { db: "string_desc6", label: "String Desc 6" },
      { db: "hsn_code", label: "HSN Code" },
      { db: "last_modify", label: "Last Modify" },
    ],
  },
  Store_Master: {
    dbName: '"Store_Master"',
    displayName: "Store Master",
    uniqueKey: "store_id",
    quotedCols: false,
    searchPlaceholder: "Search by Store ID or Store Name...",
    searchColumns: ["store_id", "store_name"],
    columns: [
      { db: "store_id", label: "Store ID", required: true },
      { db: "store_name", label: "Store Name" },
      { db: "address", label: "Address" },
      { db: "city", label: "City" },
      { db: "state", label: "State" },
      { db: "pincode", label: "Pincode" },
    ],
  },
  Damage_Reason_Master: {
    dbName: '"Damage_Reason_Master"',
    displayName: "Damage Reason Master",
    uniqueKey: "reason_id",
    quotedCols: false,
    searchPlaceholder: "Search by Reason ID or Reason Name...",
    searchColumns: ["reason_id", "reason_name"],
    columns: [
      { db: "reason_id", label: "Reason ID", required: true },
      { db: "reason_name", label: "Reason Name" },
    ],
  },
  Warehouse_Master: {
    dbName: '"Warehouse_Master"',
    displayName: "Warehouse Master",
    uniqueKey: "wh_id",
    quotedCols: false,
    searchPlaceholder: "Search by Warehouse ID or Warehouse Name...",
    searchColumns: ["wh_id", "warehouse_name"],
    columns: [
      { db: "wh_id", label: "Warehouse ID", required: true },
      { db: "warehouse_name", label: "Warehouse Name" },
      { db: "address", label: "Address" },
      { db: "city", label: "City" },
      { db: "state", label: "State" },
    ],
  },
  Vendor_Master: {
    dbName: '"Vendor_Master"',
    displayName: "Vendor Master",
    uniqueKey: "vendor_id",
    quotedCols: false,
    searchPlaceholder: "Search by Vendor ID or Vendor Name...",
    searchColumns: ["vendor_id", "vendor_name"],
    columns: [
      { db: "vendor_id", label: "Vendor ID", required: true },
      { db: "vendor_name", label: "Vendor Name" },
      { db: "specialization", label: "Specialization" },
      { db: "address", label: "Address" },
      { db: "city", label: "City" },
      { db: "state", label: "State" },
      { db: "email", label: "Email" },
    ],
  },
  Courier_Master: {
    dbName: '"Courier_Master"',
    displayName: "Courier Master",
    uniqueKey: "courier_id",
    quotedCols: false,
    searchPlaceholder: "Search by Courier ID or Courier Name...",
    searchColumns: ["courier_id", "courier_name"],
    columns: [
      { db: "courier_id", label: "Courier ID", required: true },
      { db: "courier_name", label: "Courier Name" },
      { db: "contact_no", label: "Contact No" },
      { db: "tracking_url", label: "Tracking URL" },
    ],
  },
  RM_Data: {
    dbName: '"RM_Data"',
    displayName: "RM Data",
    uniqueKey: "Store_Code",
    quotedCols: true,
    searchPlaceholder: "Search by Store Code or Branch Name...",
    searchColumns: ["Store_Code", "Branch_Name"],
    columns: [
      { db: "Store_Code", label: "Store Code", required: true },
      { db: "Branch_Name", label: "Branch Name" },
      { db: "Zone", label: "Zone" },
      { db: "RM", label: "RM" },
    ],
  },
};

const ALLOWED_ROLES = ["Store", "Warehouse", "RM", "Admin", "Dashboard"];

const colRef = (colName, quoted) => (quoted ? `"${colName}"` : colName);

// Render admin panel
const renderPanel = (req, res) => {
  res.render("admin/panel", {
    userId: req.session.userIdDisplay,
    role: req.session.role || "SuperAdmin",
    tableConfig: JSON.stringify(TABLE_CONFIG),
    maxUsers: MAX_USERS,
  });
};

// Dashboard KPIs
const getDashboardKPIs = async (req, res) => {
  try {
    const kpis = [];
    for (const [key, cfg] of Object.entries(TABLE_CONFIG)) {
      const result = await db.query(
        `SELECT COUNT(*) as count FROM repair_app.${cfg.dbName}`,
      );
      kpis.push({
        table: key,
        displayName: cfg.displayName,
        count: parseInt(result.rows[0].count, 10),
      });
    }

    // User count KPI
    const userCountResult = await db.query(
      `SELECT COUNT(*) as count FROM repair_app.users`,
    );
    const userCount = parseInt(userCountResult.rows[0].count, 10);
    kpis.push({
      table: "Users",
      displayName: "Users",
      count: userCount,
      maxUsers: MAX_USERS,
      isUserKpi: true,
    });

    res.json({ success: true, kpis });
  } catch (err) {
    console.error("Dashboard KPI error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch KPIs" });
  }
};

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────

// Get all users (no passwords)
const getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = (req.query.search || "").trim();
  const offset = (page - 1) * limit;

  try {
    let whereClause = "";
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE user_id ILIKE $1 OR role ILIKE $1`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM repair_app.users ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataParams = [...params, limit, offset];
    const dataResult = await db.query(
      `SELECT id, user_id, role FROM repair_app.users ${whereClause} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );

    res.json({
      success: true,
      data: dataResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      maxUsers: MAX_USERS,
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// Add new user
const addUser = async (req, res) => {
  const { user_id, password, role } = req.body;

  if (!user_id || !password || !role) {
    return res
      .status(400)
      .json({ success: false, message: "User ID, password and role are required" });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role selected" });
  }

  try {
    // Check user limit
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM repair_app.users`,
    );
    const currentCount = parseInt(countResult.rows[0].count, 10);

    if (currentCount >= MAX_USERS) {
      return res.status(403).json({
        success: false,
        message: `User limit reached. Maximum ${MAX_USERS} users allowed under your license.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO repair_app.users (user_id, password, role) VALUES ($1, $2, $3) RETURNING id, user_id, role`,
      [user_id, hashedPassword, role],
    );

    res.json({
      success: true,
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "User ID already exists" });
    }
    console.error("Add user error:", err);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
};

// Reset user password
const resetUserPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res
      .status(400)
      .json({ success: false, message: "Password must be at least 4 characters" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await db.query(
      `UPDATE repair_app.users SET password = $1 WHERE id = $2 RETURNING user_id`,
      [hashedPassword, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: `Password reset successfully for ${result.rows[0].user_id}`,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Prevent deleting SuperAdmin
    const userCheck = await db.query(
      `SELECT user_id, role FROM repair_app.users WHERE id = $1`,
      [id],
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userCheck.rows[0].role === "SuperAdmin") {
      return res
        .status(403)
        .json({ success: false, message: "Cannot delete SuperAdmin user" });
    }

    await db.query(`DELETE FROM repair_app.users WHERE id = $1`, [id]);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// ─── MASTER TABLE CONTROLLERS ──────────────────────────────────────────────

// Get table data with search and pagination
const getTableData = async (req, res) => {
  const { tableName } = req.params;
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg)
    return res.status(400).json({ success: false, message: "Invalid table" });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = (req.query.search || "").trim();
  const offset = (page - 1) * limit;

  try {
    let whereClause = "";
    const params = [];

    if (search) {
      const searchCols = cfg.searchColumns || cfg.columns.map((c) => c.db);
      const conditions = searchCols.map((col, i) => {
        params.push(`%${search}%`);
        return `CAST(${colRef(col, cfg.quotedCols)} AS TEXT) ILIKE $${i + 1}`;
      });
      whereClause = `WHERE ${conditions.join(" OR ")}`;
    }

    const countQuery = `SELECT COUNT(*) as total FROM repair_app.${cfg.dbName} ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const allCols = cfg.columns
      .map((c) => colRef(c.db, cfg.quotedCols))
      .join(", ");
    const dataParams = [...params, limit, offset];
    const dataQuery = `SELECT id, ${allCols} FROM repair_app.${cfg.dbName} ${whereClause} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataResult = await db.query(dataQuery, dataParams);

    res.json({
      success: true,
      data: dataResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get table data error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch data" });
  }
};

// Create record
const createRecord = async (req, res) => {
  const { tableName } = req.params;
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg)
    return res.status(400).json({ success: false, message: "Invalid table" });

  try {
    const cols = [];
    const vals = [];
    const placeholders = [];
    let idx = 1;

    for (const col of cfg.columns) {
      if (req.body[col.db] !== undefined && req.body[col.db] !== "") {
        cols.push(colRef(col.db, cfg.quotedCols));
        vals.push(req.body[col.db]);
        placeholders.push(`$${idx++}`);
      }
    }

    if (cols.length === 0) {
      return res.status(400).json({ success: false, message: "No data provided" });
    }

    const query = `INSERT INTO repair_app.${cfg.dbName} (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id`;
    const result = await db.query(query, vals);
    res.json({ success: true, message: "Record created", id: result.rows[0].id });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Record with this unique key already exists",
      });
    }
    console.error("Create record error:", err);
    res.status(500).json({ success: false, message: "Failed to create record" });
  }
};

// Update record
const updateRecord = async (req, res) => {
  const { tableName, id } = req.params;
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg)
    return res.status(400).json({ success: false, message: "Invalid table" });

  try {
    const sets = [];
    const vals = [];
    let idx = 1;

    for (const col of cfg.columns) {
      if (req.body[col.db] !== undefined) {
        sets.push(`${colRef(col.db, cfg.quotedCols)} = $${idx++}`);
        vals.push(req.body[col.db]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: "No data provided" });
    }

    vals.push(id);
    const query = `UPDATE repair_app.${cfg.dbName} SET ${sets.join(", ")} WHERE id = $${idx}`;
    await db.query(query, vals);
    res.json({ success: true, message: "Record updated" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Duplicate unique key value" });
    }
    console.error("Update record error:", err);
    res.status(500).json({ success: false, message: "Failed to update record" });
  }
};

// Delete record
const deleteRecord = async (req, res) => {
  const { tableName, id } = req.params;
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg)
    return res.status(400).json({ success: false, message: "Invalid table" });

  try {
    await db.query(`DELETE FROM repair_app.${cfg.dbName} WHERE id = $1`, [id]);
    res.json({ success: true, message: "Record deleted" });
  } catch (err) {
    console.error("Delete record error:", err);
    res.status(500).json({ success: false, message: "Failed to delete record" });
  }
};

// Upload and parse file
const uploadFile = async (req, res) => {
  const { tableName } = req.params;
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg)
    return res.status(400).json({ success: false, message: "Invalid table" });

  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (jsonData.length === 0) {
      return res.status(400).json({ success: false, message: "File is empty" });
    }

    const validCols = cfg.columns.map((c) => c.db);
    const rows = jsonData.map((row) => {
      const mapped = {};
      for (const col of validCols) {
        mapped[col] = row[col] !== undefined ? String(row[col]).trim() : "";
      }
      return mapped;
    });

    res.json({ success: true, totalRows: rows.length, rows });
  } catch (err) {
    console.error("Upload parse error:", err);
    res.status(500).json({ success: false, message: "Failed to parse file" });
  }
};

// Insert parsed data into DB
const insertData = async (req, res) => {
  const { tableName } = req.params;
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg)
    return res.status(400).json({ success: false, message: "Invalid table" });

  const { rows } = req.body;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "No data to insert" });
  }

  try {
    const uniqueCol = cfg.uniqueKey;
    const uniqueColRef = colRef(uniqueCol, cfg.quotedCols);

    const existingResult = await db.query(
      `SELECT ${uniqueColRef} FROM repair_app.${cfg.dbName}`,
    );
    const existingKeys = new Set(existingResult.rows.map((r) => r[uniqueCol]));

    const duplicates = [];
    const newRows = [];

    for (const row of rows) {
      const keyVal = (row[uniqueCol] || "").trim();
      if (!keyVal) continue;
      if (existingKeys.has(keyVal)) {
        duplicates.push(keyVal);
      } else {
        newRows.push(row);
        existingKeys.add(keyVal);
      }
    }

    let inserted = 0;
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const row of newRows) {
        const cols = [];
        const vals = [];
        const placeholders = [];
        let idx = 1;

        for (const col of cfg.columns) {
          const val = (row[col.db] || "").trim();
          if (val !== "") {
            cols.push(colRef(col.db, cfg.quotedCols));
            vals.push(val);
            placeholders.push(`$${idx++}`);
          }
        }

        if (cols.length > 0) {
          await client.query(
            `INSERT INTO repair_app.${cfg.dbName} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
            vals,
          );
          inserted++;
        }
      }
      await client.query("COMMIT");
    } catch (insertErr) {
      await client.query("ROLLBACK");
      throw insertErr;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      inserted,
      skipped: duplicates.length,
      duplicates: duplicates.slice(0, 50),
      total: rows.length,
    });
  } catch (err) {
    console.error("Insert data error:", err);
    res.status(500).json({ success: false, message: "Failed to insert data: " + err.message });
  }
};

// Download template
const downloadTemplate = async (req, res) => {
  const { tableName } = req.params;
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg)
    return res.status(400).json({ success: false, message: "Invalid table" });

  try {
    const headers = cfg.columns.map((c) => c.db);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tableName);
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=${tableName}_template.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err) {
    console.error("Template download error:", err);
    res.status(500).json({ success: false, message: "Failed to generate template" });
  }
};

// Get config for client
const getConfig = (req, res) => {
  res.json({ success: true, config: TABLE_CONFIG });
};

module.exports = {
  renderPanel,
  getDashboardKPIs,
  getTableData,
  createRecord,
  updateRecord,
  deleteRecord,
  uploadFile,
  insertData,
  downloadTemplate,
  getConfig,
  // User management
  getUsers,
  addUser,
  resetUserPassword,
  deleteUser,
};