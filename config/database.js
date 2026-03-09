// const { Pool } = require("pg");
// const { Connector } = require("@google-cloud/cloud-sql-connector");
// const { GoogleAuth } = require("google-auth-library");
// const path = require("path");
// require("dotenv").config({ path: path.join(__dirname, "../.env") });

// // ── Build Service Account credentials from env ──
// const credentials = {
//   type: process.env.GSA_TYPE,
//   project_id: process.env.GSA_PROJECT_ID,
//   private_key_id: process.env.GSA_PRIVATE_KEY_ID,
//   private_key: (process.env.GSA_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
//   client_email: process.env.GSA_CLIENT_EMAIL,
//   client_id: process.env.GSA_CLIENT_ID,
//   auth_uri: process.env.GSA_AUTH_URI,
//   token_uri: process.env.GSA_TOKEN_URI,
//   auth_provider_x509_cert_url: process.env.GSA_AUTH_PROVIDER_X509_CERT_URL,
//   client_x509_cert_url: process.env.GSA_CLIENT_X509_CERT_URL,
//   universe_domain: process.env.GSA_UNIVERSE_DOMAIN,
// };

// // ── GoogleAuth with explicit credentials and scope ──
// const auth = new GoogleAuth({
//   credentials,
//   scopes: ["https://www.googleapis.com/auth/sqlservice.admin"],
// });

// const connector = new Connector({ auth });

// let pool;

// const createPool = async () => {
//   const clientOpts = await connector.getOptions({
//     instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
//     ipType: "PUBLIC",
//   });

//   pool = new Pool({
//     ...clientOpts,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME || "RepairApp",
//     max: 10,
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 5000,
//   });

//   // Set default search_path so all queries use repair_app schema
//   pool.on("connect", (client) => {
//     client.query("SET search_path TO repair_app, public");
//   });

//   pool.on("error", (err) => {
//     console.error("Unexpected Cloud SQL error:", err.message);
//   });

//   return pool;
// };

// const getPool = async () => {
//   if (!pool) {
//     await createPool();
//   }
//   return pool;
// };

// const getISTTimestamp = () => {
//   const now = new Date();
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   const istTime = new Date(now.getTime() + istOffset);
//   return istTime.toISOString().replace("T", " ").substring(0, 19);
// };

// const getISTDate = (offsetMs = 0) => {
//   const now = new Date();
//   const istOffset = 5.5 * 60 * 60 * 1000;
//   const istTime = new Date(now.getTime() + istOffset + offsetMs);
//   return istTime.toISOString().replace("T", " ").substring(0, 19);
// };

// const addColumnIfMissing = async (client, table, column, type = "TEXT") => {
//   try {
//     await client.query(
//       `ALTER TABLE repair_app.${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`,
//     );
//   } catch (err) {
//     console.error(`Error adding ${column} to ${table}:`, err.message);
//   }
// };

// const initializeDatabase = async () => {
//   const db = await getPool();

//   // Test connection
//   const ping = await db.query("SELECT NOW()");
//   console.log("✓ Connected to Cloud SQL PostgreSQL");
//   console.log(`✓ Database: ${process.env.DB_NAME}`);
//   console.log("✓ Time:", ping.rows[0].now);

//   const client = await db.connect();
//   try {
//     await client.query(`CREATE SCHEMA IF NOT EXISTS repair_app`);
//     await client.query(`SET search_path TO repair_app`);

//     // ── Users ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app.users (
//         id         SERIAL PRIMARY KEY,
//         user_id    TEXT UNIQUE NOT NULL,
//         password   TEXT NOT NULL,
//         role       TEXT,
//         created_at TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')
//       )
//     `);
//     console.log("✓ Users table ready");

//     // ── Item_Master ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app."Item_Master" (
//         id            SERIAL PRIMARY KEY,
//         barcode       TEXT UNIQUE,
//         item_code     TEXT,
//         division      TEXT,
//         section       TEXT,
//         department    TEXT,
//         active        TEXT,
//         created_by    TEXT,
//         creation_date TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
//         remarks       TEXT
//       )
//     `);
//     console.log("✓ Item_Master ready");

//     // ── Customer_Master ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app."Customer_Master" (
//         id            SERIAL PRIMARY KEY,
//         customer_id   TEXT UNIQUE,
//         customer_name TEXT,
//         phone         TEXT,
//         address       TEXT,
//         city          TEXT,
//         state         TEXT,
//         pincode       TEXT,
//         whatsapp_ok   TEXT,
//         sms_ok        TEXT,
//         active        TEXT,
//         email         TEXT,
//         drive_file_id TEXT,
//         remarks       TEXT,
//         created_by    TEXT,
//         created_date  TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')
//       )
//     `);
//     console.log("✓ Customer_Master ready");

//     // ── Store_Master ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app."Store_Master" (
//         id         SERIAL PRIMARY KEY,
//         store_id   TEXT UNIQUE,
//         store_name TEXT,
//         address    TEXT,
//         city       TEXT,
//         state      TEXT,
//         pincode    TEXT,
//         active     TEXT
//       )
//     `);
//     console.log("✓ Store_Master ready");

//     // ── Damage_Reason_Master ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app."Damage_Reason_Master" (
//         id          SERIAL PRIMARY KEY,
//         reason_id   TEXT UNIQUE,
//         reason_name TEXT,
//         active      TEXT
//       )
//     `);
//     console.log("✓ Damage_Reason_Master ready");

//     // ── Warehouse_Master ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app."Warehouse_Master" (
//         id             SERIAL PRIMARY KEY,
//         wh_id          TEXT UNIQUE,
//         warehouse_name TEXT,
//         address        TEXT,
//         city           TEXT,
//         state          TEXT,
//         active         TEXT
//       )
//     `);
//     console.log("✓ Warehouse_Master ready");

//     // ── Vendor_Master ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app."Vendor_Master" (
//         id             SERIAL PRIMARY KEY,
//         vendor_id      TEXT UNIQUE,
//         vendor_name    TEXT,
//         specialization TEXT,
//         address        TEXT,
//         city           TEXT,
//         state          TEXT,
//         email          TEXT,
//         active         TEXT
//       )
//     `);
//     console.log("✓ Vendor_Master ready");

//     // ── Courier_Master ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app."Courier_Master" (
//         id           SERIAL PRIMARY KEY,
//         courier_id   TEXT UNIQUE,
//         courier_name TEXT,
//         contact_no   TEXT,
//         tracking_url TEXT,
//         active       TEXT
//       )
//     `);
//     console.log("✓ Courier_Master ready");

//     // ── OTP Store ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app.otp_store (
//         id            SERIAL PRIMARY KEY,
//         phone         TEXT NOT NULL,
//         otp           TEXT NOT NULL,
//         job_id        TEXT,
//         customer_name TEXT,
//         created_at    TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
//         expires_at    TEXT NOT NULL
//       )
//     `);
//     console.log("✓ otp_store table ready");

//     // ── job_data ──
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS repair_app.job_data (
//         id          SERIAL PRIMARY KEY,
//         "Job_Id"      TEXT UNIQUE,
//         "JobType"     TEXT,

//         "BARCODE"           TEXT,
//         "ITEM_ID"           TEXT,
//         "DIVISION"          TEXT,
//         "SECTION"           TEXT,
//         "DEPARTMENT"        TEXT,
//         "ItemRemarks"       TEXT,
//         "ItemCreation_Date" TEXT,

//         "ProductUnder90Days" TEXT,
//         "DamageReason"       TEXT,
//         "DamageRemarks"      TEXT,
//         "DeliveryDate"       TEXT,

//         "CustomerNumber"  TEXT,
//         "CustomerName"    TEXT,
//         "Email"           TEXT,
//         "Pincode"         TEXT,
//         "City"            TEXT,
//         "State"           TEXT,
//         "Address"         TEXT,
//         "WhatsAppOK"      TEXT,
//         "SMSOK"           TEXT,
//         "CustomerRemarks" TEXT,

//         "WarehouseID"         TEXT,
//         "WarehouseName"       TEXT,
//         "CourierName"         TEXT,
//         "AWB"                 TEXT,
//         "DispatchDate"        TEXT,
//         "WarehouseRemarks"    TEXT,
//         "WarehouseAttachment" TEXT,

//         "Attachment" TEXT,
//         "Comments"   TEXT,

//         "Store_Id" TEXT,

//         "Warehouse_Receive_Date" TEXT,

//         "Vendor_Name"          TEXT,
//         "Vendor_Awb"           TEXT,
//         "Gate_Pass_No"         TEXT,
//         "Vendor_Sent_Date"     TEXT,
//         "Vendor_Decision"      TEXT,
//         "Vendor_Decision_Date" TEXT,

//         "Store_Sent_Date"        TEXT,
//         "Store_Received_Date"    TEXT,
//         "Ticket_Closing_Date"    TEXT,
//         "Closing_Ticket_Remarks" TEXT,

//         "Warehouse_Sent_Date" TEXT,

//         "admin_logs" TEXT,

//         "Status"    TEXT DEFAULT 'Open',
//         "CreatedAt" TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')
//       )
//     `);
//     console.log("✓ job_data table ready");

//     // ── Migrations for job_data ──
//     const migrations = [
//       "Store_Id",
//       "Warehouse_Receive_Date",
//       "Vendor_Name",
//       "Vendor_Awb",
//       "Gate_Pass_No",
//       "Vendor_Sent_Date",
//       "Vendor_Decision",
//       "Vendor_Decision_Date",
//       "Store_Sent_Date",
//       "Store_Received_Date",
//       "Ticket_Closing_Date",
//       "Closing_Ticket_Remarks",
//       "Warehouse_Sent_Date",
//       "admin_logs",
//     ];
//     for (const col of migrations) {
//       await addColumnIfMissing(client, "job_data", `"${col}"`, "TEXT");
//     }

//     // ── Check user count ──
//     const result = await client.query(
//       "SELECT COUNT(*) as count FROM repair_app.users",
//     );
//     console.log(`✓ Total users: ${result.rows[0].count}`);
//     if (parseInt(result.rows[0].count) === 0) {
//       console.log("No users found. Run import_users.py.");
//     }

//     console.log("✅ Database initialization complete!");
//   } catch (err) {
//     console.error("❌ Database initialization error:", err.message);
//     throw err;
//   } finally {
//     client.release();
//   }
// };

// // ── Clean expired OTPs ──
// const cleanExpiredOTPs = async () => {
//   const p = await getPool();
//   const istNow = getISTTimestamp();
//   try {
//     await p.query("DELETE FROM repair_app.otp_store WHERE expires_at < $1", [
//       istNow,
//     ]);
//   } catch (err) {
//     console.error("OTP cleanup error:", err.message);
//   }
// };

// // ── Wrapper so other files can do db.query() ──
// const dbProxy = {
//   query: async (...args) => {
//     const p = await getPool();
//     return p.query(...args);
//   },
//   connect: async () => {
//     const p = await getPool();
//     return p.connect();
//   },
// };

// // ── Cleanup on shutdown ──
// const shutdown = async () => {
//   try {
//     connector.close();
//   } catch (_) {}
//   try {
//     if (pool) await pool.end();
//   } catch (_) {}
//   process.exit(0);
// };
// process.on("SIGTERM", shutdown);
// process.on("SIGINT", shutdown);

// module.exports = {
//   db: dbProxy,
//   initializeDatabase,
//   getISTTimestamp,
//   getISTDate,
//   cleanExpiredOTPs,
// };



const { Pool } = require("pg");
const { Connector } = require("@google-cloud/cloud-sql-connector");
const { GoogleAuth } = require("google-auth-library");

// Build Service Account credentials from env
const credentials = {
  type: process.env.GSA_TYPE,
  project_id: process.env.GSA_PROJECT_ID,
  private_key_id: process.env.GSA_PRIVATE_KEY_ID,
  private_key: (process.env.GSA_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim(),
  client_email: process.env.GSA_CLIENT_EMAIL,
  client_id: process.env.GSA_CLIENT_ID,
  auth_uri: process.env.GSA_AUTH_URI,
  token_uri: process.env.GSA_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GSA_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GSA_CLIENT_X509_CERT_URL,
  universe_domain: process.env.GSA_UNIVERSE_DOMAIN,
};

// GoogleAuth with explicit credentials and scope
const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/sqlservice.admin"],
});

const connector = new Connector({ auth });

let pool;

const createPool = async () => {
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
    ipType: "PUBLIC",
  });

  pool = new Pool({
    ...clientOpts,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "repairdb",
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected Cloud SQL error:", err);
  });

  return pool;
};

const getPool = async () => {
  if (!pool) {
    await createPool();
  }
  return pool;
};

const getISTTimestamp = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().replace("T", " ").substring(0, 19);
};

const getISTDate = (offsetMs = 0) => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset + offsetMs);
  return istTime.toISOString().replace("T", " ").substring(0, 19);
};

const addColumnIfMissing = async (client, table, column, type = "TEXT") => {
  try {
    await client.query(
      `ALTER TABLE repair_app.${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`
    );
  } catch (err) {
    console.error(`Error adding ${column} to ${table}:`, err);
  }
};

const initializeDatabase = async () => {
  const db = await getPool();

  // Test connection
  const ping = await db.query("SELECT NOW()");
  console.log("✓ Connected to Cloud SQL PostgreSQL");
  console.log(`✓ Database: ${process.env.DB_NAME}`);
  console.log("✓ Time:", ping.rows[0].now);

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(`CREATE SCHEMA IF NOT EXISTS repair_app`);
    await client.query(`SET search_path TO repair_app, public`);

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app.users (
        id SERIAL PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT,
        created_at TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')
      )
    `);
    console.log("✓ Users table ready");

    // Item_Master
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app."Item_Master" (
        id SERIAL PRIMARY KEY,
        barcode TEXT UNIQUE,
        item_code TEXT,
        division TEXT,
        section TEXT,
        department TEXT,
        active TEXT,
        created_by TEXT,
        creation_date TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
        remarks TEXT
      )
    `);
    console.log("✓ Item_Master ready");

    // Customer_Master
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app."Customer_Master" (
        id SERIAL PRIMARY KEY,
        customer_id TEXT UNIQUE,
        customer_name TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        whatsapp_ok TEXT,
        sms_ok TEXT,
        active TEXT,
        email TEXT,
        drive_file_id TEXT,
        remarks TEXT,
        created_by TEXT,
        created_date TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')
      )
    `);
    console.log("✓ Customer_Master ready");

    // Store_Master
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app."Store_Master" (
        id SERIAL PRIMARY KEY,
        store_id TEXT UNIQUE,
        store_name TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        active TEXT
      )
    `);
    console.log("✓ Store_Master ready");

    // Damage_Reason_Master
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app."Damage_Reason_Master" (
        id SERIAL PRIMARY KEY,
        reason_id TEXT UNIQUE,
        reason_name TEXT,
        active TEXT
      )
    `);
    console.log("✓ Damage_Reason_Master ready");

    // Warehouse_Master
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app."Warehouse_Master" (
        id SERIAL PRIMARY KEY,
        wh_id TEXT UNIQUE,
        warehouse_name TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        active TEXT
      )
    `);
    console.log("✓ Warehouse_Master ready");

    // Vendor_Master
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app."Vendor_Master" (
        id SERIAL PRIMARY KEY,
        vendor_id TEXT UNIQUE,
        vendor_name TEXT,
        specialization TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        email TEXT,
        active TEXT
      )
    `);
    console.log("✓ Vendor_Master ready");

    // Courier_Master
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app."Courier_Master" (
        id SERIAL PRIMARY KEY,
        courier_id TEXT UNIQUE,
        courier_name TEXT,
        contact_no TEXT,
        tracking_url TEXT,
        active TEXT
      )
    `);
    console.log("✓ Courier_Master ready");

    // OTP Store
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app.otp_store (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        otp TEXT NOT NULL,
        job_id TEXT,
        customer_name TEXT,
        created_at TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
        expires_at TEXT NOT NULL
      )
    `);
    console.log("✓ otp_store table ready");

    // job_data
    await client.query(`
      CREATE TABLE IF NOT EXISTS repair_app.job_data (
        id SERIAL PRIMARY KEY,
        "Job_Id" TEXT UNIQUE,
        "JobType" TEXT,
        "BARCODE" TEXT,
        "ITEM_ID" TEXT,
        "DIVISION" TEXT,
        "SECTION" TEXT,
        "DEPARTMENT" TEXT,
        "ItemRemarks" TEXT,
        "ItemCreation_Date" TEXT,
        "ProductUnder90Days" TEXT,
        "DamageReason" TEXT,
        "DamageRemarks" TEXT,
        "DeliveryDate" TEXT,
        "CustomerNumber" TEXT,
        "CustomerName" TEXT,
        "Email" TEXT,
        "Pincode" TEXT,
        "City" TEXT,
        "State" TEXT,
        "Address" TEXT,
        "WhatsAppOK" TEXT,
        "SMSOK" TEXT,
        "CustomerRemarks" TEXT,
        "WarehouseID" TEXT,
        "WarehouseName" TEXT,
        "CourierName" TEXT,
        "AWB" TEXT,
        "DispatchDate" TEXT,
        "WarehouseRemarks" TEXT,
        "WarehouseAttachment" TEXT,
        "Attachment" TEXT,
        "Comments" TEXT,
        "Store_Id" TEXT,
        "Warehouse_Receive_Date" TEXT,
        "Vendor_Name" TEXT,
        "Vendor_Awb" TEXT,
        "Gate_Pass_No" TEXT,
        "Vendor_Sent_Date" TEXT,
        "Vendor_Decision" TEXT,
        "Vendor_Decision_Date" TEXT,
        "Store_Sent_Date" TEXT,
        "Store_Received_Date" TEXT,
        "Ticket_Closing_Date" TEXT,
        "Closing_Ticket_Remarks" TEXT,
        "Warehouse_Sent_Date" TEXT,
        "admin_logs" TEXT,
        "Status" TEXT DEFAULT 'Open',
        "CreatedAt" TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')
      )
    `);
    console.log("✓ job_data table ready");

    const migrations = [
      "Store_Id",
      "Warehouse_Receive_Date",
      "Vendor_Name",
      "Vendor_Awb",
      "Gate_Pass_No",
      "Vendor_Sent_Date",
      "Vendor_Decision",
      "Vendor_Decision_Date",
      "Store_Sent_Date",
      "Store_Received_Date",
      "Ticket_Closing_Date",
      "Closing_Ticket_Remarks",
      "Warehouse_Sent_Date",
      "admin_logs",
    ];

    for (const col of migrations) {
      await addColumnIfMissing(client, "job_data", `"${col}"`, "TEXT");
    }

    const result = await client.query(
      "SELECT COUNT(*) as count FROM repair_app.users"
    );
    console.log(`✓ Total users: ${result.rows[0].count}`);

    if (parseInt(result.rows[0].count, 10) === 0) {
      console.log("No users found. Run import_users.py.");
    }

    await client.query("COMMIT");
    console.log("✅ Database initialization complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Database initialization error:", err);
    throw err;
  } finally {
    client.release();
  }
};

// Clean expired OTPs
const cleanExpiredOTPs = async () => {
  const p = await getPool();
  const istNow = getISTTimestamp();

  try {
    await p.query("DELETE FROM repair_app.otp_store WHERE expires_at < $1", [
      istNow,
    ]);
  } catch (err) {
    console.error("OTP cleanup error:", err);
  }
};

// Wrapper so other files can do db.query()
const dbProxy = {
  query: async (...args) => {
    const p = await getPool();
    return p.query(...args);
  },
  connect: async () => {
    const p = await getPool();
    return p.connect();
  },
};

const shutdown = async () => {
  try {
    connector.close();
  } catch (e) {
    console.error("Connector close error:", e);
  }

  try {
    if (pool) {
      await pool.end();
    }
  } catch (e) {
    console.error("Pool close error:", e);
  }

  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = {
  db: dbProxy,
  initializeDatabase,
  getISTTimestamp,
  getISTDate,
  cleanExpiredOTPs,
};