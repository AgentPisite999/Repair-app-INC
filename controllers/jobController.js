
// const {
//   db,
//   getISTTimestamp,
//   getISTDate,
//   cleanExpiredOTPs,
// } = require("../config/database");
// const https = require("https");
// const http = require("http");
// const { URL } = require("url");

// const SMS_URL = (process.env.SMS_URL || "").trim();
// const SMS_AUTHTOKEN = (process.env.SMS_AUTHTOKEN || "").trim();
// const SMS_SENDERID = (process.env.SMS_SENDERID || "").trim();
// const SMS_PE_ID = (process.env.SMS_PE_ID || "").trim();
// const SMS_TEMPLATE_ID_CREATE = (
//   process.env.SMS_TEMPLATE_ID_CREATE || ""
// ).trim();
// const SMS_TEMPLATE_ID_CLOSE = (process.env.SMS_TEMPLATE_ID_CLOSE || "").trim();

// const normalizeMobile = (mobile) => {
//   const m = mobile.replace(/\D/g, "");
//   if (m.length === 10) return "91" + m;
//   if (m.length === 12 && m.startsWith("91")) return m;
//   return null;
// };

// const generateOTP = () => {
//   return String(Math.floor(100000 + Math.random() * 900000));
// };

// const generateUniqueJobId = async () => {
//   while (true) {
//     const jobId = `JOB-${Math.floor(1000000 + Math.random() * 9000000)}`;

//     const r1 = await db.query(
//       `SELECT 1 FROM repair_app.job_data WHERE "Job_Id" = $1`,
//       [jobId],
//     );
//     if (r1.rows.length > 0) continue;

//     const r2 = await db.query(
//       `SELECT 1 FROM repair_app.otp_store WHERE job_id = $1`,
//       [jobId],
//     );
//     if (r2.rows.length > 0) continue;

//     return jobId;
//   }
// };

// const generateNextCustomerId = async () => {
//   const result = await db.query(
//     `SELECT customer_id
//      FROM repair_app."Customer_Master"
//      WHERE customer_id LIKE 'CUS-%'
//      ORDER BY customer_id DESC
//      LIMIT 1`,
//   );

//   const row = result.rows[0];
//   if (!row || !row.customer_id) return "CUS-000001";

//   const lastNum = parseInt(row.customer_id.replace("CUS-", ""), 10);
//   if (isNaN(lastNum)) return "CUS-000001";

//   return `CUS-${String(lastNum + 1).padStart(6, "0")}`;
// };

// const sendSMS = (mobile, message, templateId) => {
//   return new Promise((resolve, reject) => {
//     if (!SMS_URL || !SMS_AUTHTOKEN) {
//       console.warn("SMS not configured. Skipping SMS send.");
//       return resolve("SMS_NOT_CONFIGURED");
//     }

//     try {
//       const url = new URL(SMS_URL);
//       url.searchParams.set("authtoken", SMS_AUTHTOKEN);
//       url.searchParams.set("to", mobile);
//       url.searchParams.set("from", SMS_SENDERID);
//       url.searchParams.set("text", message);
//       url.searchParams.set("peid", SMS_PE_ID);
//       url.searchParams.set("templateid", templateId);

//       console.log("\n====== SMS DEBUG ======");
//       console.log("URL:", url.toString());
//       console.log("TO:", mobile);
//       console.log("FROM:", SMS_SENDERID);
//       console.log("peid:", SMS_PE_ID);
//       console.log("templateid:", templateId);
//       console.log("MESSAGE:", message);
//       console.log("========================\n");

//       const protocol = url.protocol === "https:" ? https : http;

//       protocol
//         .get(url.toString(), (res) => {
//           let data = "";
//           res.on("data", (chunk) => (data += chunk));
//           res.on("end", () => {
//             console.log("SMS API Response:", data);
//             resolve(data);
//           });
//         })
//         .on("error", (err) => {
//           console.error("SMS send error:", err.message);
//           reject(err);
//         });
//     } catch (err) {
//       console.error("SMS URL parse error:", err.message);
//       reject(err);
//     }
//   });
// };

// const buildCreationSMS = (otp, jobId) => {
//   return (
//     `Your OTP for footwear repair ticket creations is ${otp}. ` +
//     `Ticket ID : ${jobId} . ` +
//     `It is valid for 5 minutes. ` +
//     `Please do not share this OTP with anyone - Inc.5`
//   );
// };

// const buildClosureSMS = (otp, jobId) => {
//   return (
//     `Your OTP for footwear repair ticket closure is ${otp}. ` +
//     `Ticket ID : ${jobId} . ` +
//     `It is valid for 5 minutes. ` +
//     `Please do not share this OTP with anyone - Inc.5`
//   );
// };

// const renderJobCreation = async (req, res) => {
//   try {
//     const reasonsResult = await db.query(
//       `SELECT reason_id AS "ReasonID", reason_name AS "ReasonName"
//        FROM repair_app."Damage_Reason_Master"
//        WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`,
//     );

//     const whResult = await db.query(
//       `SELECT wh_id AS "WhID", warehouse_name AS "WarehouseName"
//        FROM repair_app."Warehouse_Master"
//        WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`,
//     );

//     const courierResult = await db.query(
//       `SELECT courier_id AS "CourierID", courier_name AS "CourierName"
//        FROM repair_app."Courier_Master"
//        WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`,
//     );

//     res.render("job-creation", {
//       userId: req.session.userIdDisplay,
//       role: req.session.role || "user",
//       damageReasons: reasonsResult.rows || [],
//       warehouses: whResult.rows || [],
//       couriers: courierResult.rows || [],
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).send("Server error");
//   }
// };

// // ── UPDATED: searches by barcode OR item_code ──
// const getItemByBarcode = async (req, res) => {
//   const { barcode, search } = req.query;
//   const searchVal = (search || barcode || "").trim();

//   if (!searchVal) {
//     return res.json({ success: false, message: "Barcode or item code is required" });
//   }

//   try {
//     const result = await db.query(
//       `SELECT barcode, item_code, division, section, department,
//               category2, category3, category4, rsp, remarks
//        FROM repair_app."Item_Master"
//        WHERE barcode = $1 OR item_code = $1 OR LOWER(category2) = LOWER($1)`,
//       [searchVal],
//     );

//     const row = result.rows[0];

//     if (!row) {
//       return res.json({ success: true, found: false });
//     }

//     return res.json({
//       success: true,
//       found: true,
//       item: {
//         barcode: row.barcode,
//         item_id: row.item_code,
//         division: row.division,
//         section: row.section,
//         department: row.department,
//         category2: row.category2 || "",
//         category3: row.category3 || "",
//         category4: row.category4 || "",
//         rsp: row.rsp || "",
//         remarks: row.remarks || "",
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     return res.json({ success: false, message: "Server error" });
//   }
// };

// const getCustomerByNumber = async (req, res) => {
//   const { customerNumber } = req.query;

//   if (!customerNumber) {
//     return res.json({ success: false, message: "Customer number is required" });
//   }

//   try {
//     const result = await db.query(
//       `SELECT phone, customer_name, address, city, state, pincode,
//               whatsapp_ok, sms_ok, email, remarks
//        FROM repair_app."Customer_Master"
//        WHERE phone = $1`,
//       [customerNumber.trim()],
//     );

//     const row = result.rows[0];

//     if (!row) {
//       return res.json({ success: true, found: false });
//     }

//     return res.json({
//       success: true,
//       found: true,
//       customer: {
//         phone: row.phone,
//         name: row.customer_name || "",
//         address: row.address,
//         city: row.city,
//         state: row.state,
//         pincode: row.pincode,
//         email: row.email,
//         whatsapp_ok: row.whatsapp_ok || "False",
//         sms_ok: row.sms_ok || "False",
//         remarks: row.remarks || "",
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     return res.json({ success: false, message: "Server error" });
//   }
// };

// const sendOtp = async (req, res) => {
//   const { phone, customer_name } = req.body;

//   if (!phone || !phone.trim()) {
//     return res.json({ success: false, message: "Customer number is required" });
//   }

//   const rawPhone = phone.trim();
//   const mobile = normalizeMobile(rawPhone);

//   if (!mobile) {
//     return res.json({
//       success: false,
//       message: "Invalid phone number. Use 10 or 12 digit format.",
//     });
//   }

//   try {
//     await cleanExpiredOTPs();
//     await db.query(`DELETE FROM repair_app.otp_store WHERE phone = $1`, [
//       rawPhone,
//     ]);

//     const otp = generateOTP();
//     const istNow = getISTTimestamp();
//     const expiresAt = getISTDate(5 * 60 * 1000);
//     const jobId = await generateUniqueJobId();
//     const custName = (customer_name || "Customer").trim();

//     await db.query(
//       `INSERT INTO repair_app.otp_store
//        (phone, otp, job_id, customer_name, created_at, expires_at)
//        VALUES ($1, $2, $3, $4, $5, $6)`,
//       [rawPhone, otp, jobId, custName, istNow, expiresAt],
//     );

//     const message = buildCreationSMS(otp, jobId);

//     try {
//       await sendSMS(mobile, message, SMS_TEMPLATE_ID_CREATE);
//     } catch (smsErr) {
//       console.error("SMS send failed:", smsErr);
//     }

//     console.log(`✓ OTP ${otp} sent to ${mobile} for Job ${jobId}`);

//     return res.json({
//       success: true,
//       message: "OTP sent successfully",
//       jobId,
//     });
//   } catch (err) {
//     console.error("sendOtp error:", err);
//     return res
//       .status(500)
//       .json({ success: false, message: "Failed to send OTP" });
//   }
// };

// const sendClosureOtp = async (req, res) => {
//   const { jobId } = req.body;

//   if (!jobId) {
//     return res.json({ success: false, message: "Job ID is required" });
//   }

//   try {
//     const jobResult = await db.query(
//       `SELECT "CustomerNumber", "CustomerName", "Status"
//        FROM repair_app.job_data
//        WHERE "Job_Id" = $1`,
//       [jobId],
//     );

//     const job = jobResult.rows[0];

//     if (!job) {
//       return res.json({ success: false, message: "Job not found" });
//     }

//     if ((job.Status || "").toLowerCase() === "closed") {
//       return res.json({ success: false, message: "Ticket already closed" });
//     }

//     const rawPhone = (job.CustomerNumber || "").trim();

//     if (!rawPhone) {
//       return res.json({
//         success: false,
//         message: "No customer phone number on this job",
//       });
//     }

//     const mobile = normalizeMobile(rawPhone);

//     if (!mobile) {
//       return res.json({
//         success: false,
//         message: "Invalid customer phone number on this job",
//       });
//     }

//     await cleanExpiredOTPs();
//     await db.query(
//       `DELETE FROM repair_app.otp_store WHERE phone = $1 AND job_id = $2`,
//       [rawPhone, jobId],
//     );

//     const otp = generateOTP();
//     const istNow = getISTTimestamp();
//     const expiresAt = getISTDate(5 * 60 * 1000);
//     const custName = (job.CustomerName || "Customer").trim();

//     await db.query(
//       `INSERT INTO repair_app.otp_store
//        (phone, otp, job_id, customer_name, created_at, expires_at)
//        VALUES ($1, $2, $3, $4, $5, $6)`,
//       [rawPhone, otp, jobId, custName, istNow, expiresAt],
//     );

//     const message = buildClosureSMS(otp, jobId);

//     try {
//       await sendSMS(mobile, message, SMS_TEMPLATE_ID_CLOSE);
//     } catch (smsErr) {
//       console.error("Closure SMS send failed:", smsErr);
//     }

//     console.log(`✓ Closure OTP ${otp} sent to ${mobile} for Job ${jobId}`);

//     return res.json({
//       success: true,
//       message: "OTP sent successfully",
//       phone: rawPhone,
//     });
//   } catch (err) {
//     console.error("sendClosureOtp error:", err);
//     return res
//       .status(500)
//       .json({ success: false, message: "Failed to send OTP" });
//   }
// };

// const verifyOtp = async (req, res) => {
//   const { phone, otp, jobId } = req.body;

//   if (!phone || !otp) {
//     return res.json({
//       success: false,
//       valid: false,
//       message: "Phone and OTP are required",
//     });
//   }

//   try {
//     await cleanExpiredOTPs();
//     const istNow = getISTTimestamp();

//     let result;
//     if (jobId) {
//       result = await db.query(
//         `SELECT otp, job_id
//          FROM repair_app.otp_store
//          WHERE phone = $1 AND job_id = $2 AND expires_at > $3
//          ORDER BY created_at DESC
//          LIMIT 1`,
//         [phone.trim(), jobId, istNow],
//       );
//     } else {
//       result = await db.query(
//         `SELECT otp, job_id
//          FROM repair_app.otp_store
//          WHERE phone = $1 AND expires_at > $2
//          ORDER BY created_at DESC
//          LIMIT 1`,
//         [phone.trim(), istNow],
//       );
//     }

//     const row = result.rows[0];

//     if (!row) {
//       return res.json({
//         success: true,
//         valid: false,
//         message: "OTP expired or not found",
//       });
//     }

//     if (row.otp !== otp.trim()) {
//       return res.json({
//         success: true,
//         valid: false,
//         message: "Invalid OTP",
//       });
//     }

//     return res.json({
//       success: true,
//       valid: true,
//       message: "OTP verified",
//       jobId: row.job_id,
//     });
//   } catch (err) {
//     console.error("OTP verify error:", err);
//     return res.json({ success: false, valid: false, message: "Server error" });
//   }
// };

// const createJob = async (req, res) => {
//   const files = req.files || {};
//   const mainFile = files["attachment"] ? files["attachment"][0] : null;
//   const whFile = files["wh_attachment"] ? files["wh_attachment"][0] : null;

//   const {
//     jobType,
//     barcode,
//     item_id,
//     division,
//     section,
//     department,
//     category2,
//     category3,
//     category4,
//     rsp,
//     item_remarks,
//     item_missing,
//     product_under_90,
//     damage_reason,
//     damage_reason_display,
//     damage_reason_other_remarks,
//     delivery_date,
//     customer_number,
//     customer_name,
//     email,
//     pincode,
//     city,
//     state,
//     address,
//     whatsapp_ok,
//     sms_ok,
//     customer_remarks,
//     customer_missing,
//     warehouse_id,
//     warehouse_name,
//     courier_name,
//     awb,
//     dispatch_date,
//     warehouse_remarks,
//     comments,
//     verified_otp,
//     pre_generated_job_id,
//   } = req.body;

//   if (!verified_otp || !customer_number) {
//     return res
//       .status(400)
//       .json({ success: false, message: "OTP verification required" });
//   }

//   try {
//     await cleanExpiredOTPs();
//     const istNow = getISTTimestamp();

//     const otpResult = await db.query(
//       `SELECT otp, job_id
//        FROM repair_app.otp_store
//        WHERE phone = $1 AND expires_at > $2
//        ORDER BY created_at DESC
//        LIMIT 1`,
//       [customer_number.trim(), istNow],
//     );

//     const otpRow = otpResult.rows[0];

//     if (!otpRow || otpRow.otp !== verified_otp.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP invalid or expired. Please request a new OTP.",
//       });
//     }

//     const jobId = otpRow.job_id || pre_generated_job_id;
//     if (!jobId) {
//       return res
//         .status(500)
//         .json({ success: false, message: "Missing Job ID" });
//     }

//     const toAttJson = (file) => {
//       if (!file) return null;
//       return JSON.stringify({
//         originalname: file.originalname,
//         mimetype: file.mimetype,
//         size: file.size,
//         buffer: file.buffer ? file.buffer.toString("base64") : null,
//       });
//     };

//     const storeId = req.session.userIdDisplay || "system";

//     let newCustomerId = null;
//     if (customer_missing === "true" && customer_number) {
//       newCustomerId = await generateNextCustomerId();
//     }

//     if (item_missing === "true" && barcode) {
//       await db.query(
//         `INSERT INTO repair_app."Item_Master"
//          (barcode, item_code, division, section, department, active, created_by, creation_date, remarks)
//          VALUES ($1, '', '', '', '', 'True', $2, $3, $4)
//          ON CONFLICT (barcode) DO NOTHING`,
//         [
//           barcode.trim(),
//           req.session.userIdDisplay || "system",
//           istNow,
//           (item_remarks || "").trim(),
//         ],
//       );
//     }

//     if (customer_missing === "true" && customer_number && newCustomerId) {
//       await db.query(
//         `INSERT INTO repair_app."Customer_Master"
//          (customer_id, customer_name, phone, address, city, state, pincode,
//           whatsapp_ok, sms_ok, active, email, remarks, created_by, created_date)
//          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'True', $10, $11, $12, $13)
//          ON CONFLICT (customer_id) DO NOTHING`,
//         [
//           newCustomerId,
//           (customer_name || "").trim(),
//           customer_number.trim(),
//           (address || "").trim(),
//           (city || "").trim(),
//           (state || "").trim(),
//           (pincode || "").trim(),
//           whatsapp_ok || "False",
//           sms_ok || "False",
//           (email || "").trim(),
//           (customer_remarks || "").trim(),
//           req.session.userIdDisplay || "system",
//           istNow,
//         ],
//       );
//       console.log(`✓ New customer: ${newCustomerId}`);
//     }

//     const sql = `
//       INSERT INTO repair_app.job_data (
//         "Job_Id", "JobType", "BARCODE", "ITEM_ID", "DIVISION", "SECTION", "DEPARTMENT",
//         "Category2", "Category3", "Category4", "RSP",
//         "ItemRemarks", "ItemCreation_Date", "ProductUnder90Days", "DamageReason",
//         "DamageRemarks", "DeliveryDate", "CustomerNumber", "CustomerName", "Email",
//         "Pincode", "City", "State", "Address", "WhatsAppOK", "SMSOK", "CustomerRemarks",
//         "WarehouseID", "WarehouseName", "CourierName", "AWB", "DispatchDate",
//         "WarehouseRemarks", "WarehouseAttachment", "Attachment", "Comments",
//         "Store_Id", "Status", "CreatedAt"
//       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39)
//     `;

//     const values = [
//       jobId,
//       jobType || "",
//       (barcode || "").trim(),
//       (item_id || "").trim(),
//       (division || "").trim(),
//       (section || "").trim(),
//       (department || "").trim(),
//       (category2 || "").trim(),
//       (category3 || "").trim(),
//       (category4 || "").trim(),
//       (rsp || "").trim(),
//       (item_remarks || "").trim(),
//       istNow,
//       product_under_90 || "No",
//       damage_reason_display || damage_reason || "",
//       (damage_reason_other_remarks || "").trim(),
//       delivery_date || "",
//       (customer_number || "").trim(),
//       (customer_name || "").trim(),
//       (email || "").trim(),
//       (pincode || "").trim(),
//       (city || "").trim(),
//       (state || "").trim(),
//       (address || "").trim(),
//       whatsapp_ok || "False",
//       sms_ok || "False",
//       (customer_remarks || "").trim(),
//       (warehouse_id || "").trim(),
//       (warehouse_name || "").trim(),
//       (courier_name || "").trim(),
//       (awb || "").trim(),
//       dispatch_date || "",
//       (warehouse_remarks || "").trim(),
//       toAttJson(whFile),
//       toAttJson(mainFile),
//       (comments || "").trim(),
//       storeId,
//       "Open",
//       istNow,
//     ];

//     if (values.length !== 39) {
//       console.error(`VALUE COUNT MISMATCH: expected 39, got ${values.length}`);
//       return res
//         .status(500)
//         .json({ success: false, message: "Internal column count error" });
//     }

//     await db.query(sql, values);

//     await db.query(
//       `DELETE FROM repair_app.otp_store WHERE phone = $1 AND job_id = $2`,
//       [customer_number.trim(), jobId],
//     );

//     return res.json({
//       success: true,
//       message: "Job created successfully",
//       jobId,
//       customerId: newCustomerId || null,
//     });
//   } catch (err) {
//     console.error("createJob error:", err);
//     return res
//       .status(500)
//       .json({ success: false, message: "Failed to create job" });
//   }
// };

// module.exports = {
//   renderJobCreation,
//   getItemByBarcode,
//   getCustomerByNumber,
//   sendOtp,
//   sendClosureOtp,
//   verifyOtp,
//   createJob,
// };


const {
  db,
  getISTTimestamp,
  getISTDate,
  cleanExpiredOTPs,
} = require("../config/database");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const SMS_URL = (process.env.SMS_URL || "").trim();
const SMS_AUTHTOKEN = (process.env.SMS_AUTHTOKEN || "").trim();
const SMS_SENDERID = (process.env.SMS_SENDERID || "").trim();
const SMS_PE_ID = (process.env.SMS_PE_ID || "").trim();
const SMS_TEMPLATE_ID_CREATE = (
  process.env.SMS_TEMPLATE_ID_CREATE || ""
).trim();
const SMS_TEMPLATE_ID_CLOSE = (process.env.SMS_TEMPLATE_ID_CLOSE || "").trim();

const normalizeMobile = (mobile) => {
  const m = mobile.replace(/\D/g, "");
  if (m.length === 10) return "91" + m;
  if (m.length === 12 && m.startsWith("91")) return m;
  return null;
};

const generateOTP = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const generateUniqueJobId = async () => {
  while (true) {
    const jobId = `JOB-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const r1 = await db.query(
      `SELECT 1 FROM repair_app.job_data WHERE "Job_Id" = $1`,
      [jobId],
    );
    if (r1.rows.length > 0) continue;

    const r2 = await db.query(
      `SELECT 1 FROM repair_app.otp_store WHERE job_id = $1`,
      [jobId],
    );
    if (r2.rows.length > 0) continue;

    return jobId;
  }
};

const generateNextCustomerId = async () => {
  const result = await db.query(
    `SELECT customer_id
     FROM repair_app."Customer_Master"
     WHERE customer_id LIKE 'CUS-%'
     ORDER BY customer_id DESC
     LIMIT 1`,
  );

  const row = result.rows[0];
  if (!row || !row.customer_id) return "CUS-000001";

  const lastNum = parseInt(row.customer_id.replace("CUS-", ""), 10);
  if (isNaN(lastNum)) return "CUS-000001";

  return `CUS-${String(lastNum + 1).padStart(6, "0")}`;
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

      console.log("\n====== SMS DEBUG ======");
      console.log("URL:", url.toString());
      console.log("TO:", mobile);
      console.log("FROM:", SMS_SENDERID);
      console.log("peid:", SMS_PE_ID);
      console.log("templateid:", templateId);
      console.log("MESSAGE:", message);
      console.log("========================\n");

      const protocol = url.protocol === "https:" ? https : http;

      protocol
        .get(url.toString(), (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            console.log("SMS API Response:", data);
            resolve(data);
          });
        })
        .on("error", (err) => {
          console.error("SMS send error:", err.message);
          reject(err);
        });
    } catch (err) {
      console.error("SMS URL parse error:", err.message);
      reject(err);
    }
  });
};

const buildCreationSMS = (otp, jobId) => {
  return (
    `Your OTP for footwear repair ticket creations is ${otp}. ` +
    `Ticket ID : ${jobId} . ` +
    `It is valid for 5 minutes. ` +
    `Please do not share this OTP with anyone - Inc.5`
  );
};

const buildClosureSMS = (otp, jobId) => {
  return (
    `Your OTP for footwear repair ticket closure is ${otp}. ` +
    `Ticket ID : ${jobId} . ` +
    `It is valid for 5 minutes. ` +
    `Please do not share this OTP with anyone - Inc.5`
  );
};

const renderJobCreation = async (req, res) => {
  try {
    const reasonsResult = await db.query(
      `SELECT reason_id AS "ReasonID", reason_name AS "ReasonName"
       FROM repair_app."Damage_Reason_Master"
       WHERE active IS NULL OR TRIM(LOWER(active)) = 'true'`,
    );

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

    res.render("job-creation", {
      userId: req.session.userIdDisplay,
      role: req.session.role || "user",
      damageReasons: reasonsResult.rows || [],
      warehouses: whResult.rows || [],
      couriers: courierResult.rows || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

// ── UPDATED: searches by barcode, item_code, or style (category2)
//            supports space/comma-separated: style [color] [size]
const getItemByBarcode = async (req, res) => {
  const { barcode, search } = req.query;
  const searchVal = (search || barcode || "").trim();

  if (!searchVal) {
    return res.json({ success: false, message: "Search value is required" });
  }

  // Helper to map a DB row to the item object shape
  const rowToItem = (row) => ({
    barcode:    row.barcode,
    item_id:    row.item_code,
    division:   row.division,
    section:    row.section,
    department: row.department,
    category2:  row.category2  || "",
    category3:  row.category3  || "",
    category4:  row.category4  || "",
    rsp:        row.rsp        || "",
    remarks:    row.remarks    || "",
  });

  try {
    // ── 1. Exact barcode or item_code match (unique, highest priority) ──
    const exactResult = await db.query(
      `SELECT barcode, item_code, division, section, department,
              category2, category3, category4, rsp, remarks
       FROM repair_app."Item_Master"
       WHERE barcode = $1 OR item_code = $1`,
      [searchVal],
    );

    if (exactResult.rows.length > 0) {
      return res.json({
        success:  true,
        found:    true,
        multiple: false,
        item:     rowToItem(exactResult.rows[0]),
      });
    }

    // ── 2. Split input by comma OR whitespace into up to 3 parts ──
    //       parts[0] = style (category2)
    //       parts[1] = color (category3)   — optional
    //       parts[2] = size  (category4)   — optional
    const parts = searchVal
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const [stylePart, colorPart, sizePart] = parts;

    if (!stylePart) {
      return res.json({ success: true, found: false, multiple: false });
    }

    // Build dynamic WHERE clause
    const conditions = [`LOWER(category2) = LOWER($1)`];
    const params     = [stylePart];
    let   idx        = 2;

    if (colorPart) {
      conditions.push(`LOWER(category3) = LOWER($${idx++})`);
      params.push(colorPart);
    }
    if (sizePart) {
      conditions.push(`LOWER(category4) = LOWER($${idx++})`);
      params.push(sizePart);
    }

    const styleResult = await db.query(
      `SELECT barcode, item_code, division, section, department,
              category2, category3, category4, rsp, remarks
       FROM repair_app."Item_Master"
       WHERE ${conditions.join(" AND ")}
       ORDER BY category3, category4
       LIMIT 100`,
      params,
    );

    if (styleResult.rows.length === 0) {
      return res.json({ success: true, found: false, multiple: false });
    }

    // ── 3. Single match → auto-fill ──
    if (styleResult.rows.length === 1) {
      return res.json({
        success:  true,
        found:    true,
        multiple: false,
        item:     rowToItem(styleResult.rows[0]),
      });
    }

    // ── 4. Multiple matches → return list for dropdown ──
    return res.json({
      success:  true,
      found:    true,
      multiple: true,
      items:    styleResult.rows.map(rowToItem),
    });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
};

const getCustomerByNumber = async (req, res) => {
  const { customerNumber } = req.query;

  if (!customerNumber) {
    return res.json({ success: false, message: "Customer number is required" });
  }

  try {
    const result = await db.query(
      `SELECT phone, customer_name, address, city, state, pincode,
              whatsapp_ok, sms_ok, email, remarks
       FROM repair_app."Customer_Master"
       WHERE phone = $1`,
      [customerNumber.trim()],
    );

    const row = result.rows[0];

    if (!row) {
      return res.json({ success: true, found: false });
    }

    return res.json({
      success: true,
      found: true,
      customer: {
        phone:        row.phone,
        name:         row.customer_name || "",
        address:      row.address,
        city:         row.city,
        state:        row.state,
        pincode:      row.pincode,
        email:        row.email,
        whatsapp_ok:  row.whatsapp_ok || "False",
        sms_ok:       row.sms_ok      || "False",
        remarks:      row.remarks     || "",
      },
    });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
};

const sendOtp = async (req, res) => {
  const { phone, customer_name } = req.body;

  if (!phone || !phone.trim()) {
    return res.json({ success: false, message: "Customer number is required" });
  }

  const rawPhone = phone.trim();
  const mobile   = normalizeMobile(rawPhone);

  if (!mobile) {
    return res.json({
      success: false,
      message: "Invalid phone number. Use 10 or 12 digit format.",
    });
  }

  try {
    await cleanExpiredOTPs();
    await db.query(`DELETE FROM repair_app.otp_store WHERE phone = $1`, [
      rawPhone,
    ]);

    const otp       = generateOTP();
    const istNow    = getISTTimestamp();
    const expiresAt = getISTDate(5 * 60 * 1000);
    const jobId     = await generateUniqueJobId();
    const custName  = (customer_name || "Customer").trim();

    await db.query(
      `INSERT INTO repair_app.otp_store
       (phone, otp, job_id, customer_name, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [rawPhone, otp, jobId, custName, istNow, expiresAt],
    );

    const message = buildCreationSMS(otp, jobId);

    try {
      await sendSMS(mobile, message, SMS_TEMPLATE_ID_CREATE);
    } catch (smsErr) {
      console.error("SMS send failed:", smsErr);
    }

    console.log(`✓ OTP ${otp} sent to ${mobile} for Job ${jobId}`);

    return res.json({
      success: true,
      message: "OTP sent successfully",
      jobId,
    });
  } catch (err) {
    console.error("sendOtp error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP" });
  }
};

const sendClosureOtp = async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.json({ success: false, message: "Job ID is required" });
  }

  try {
    const jobResult = await db.query(
      `SELECT "CustomerNumber", "CustomerName", "Status"
       FROM repair_app.job_data
       WHERE "Job_Id" = $1`,
      [jobId],
    );

    const job = jobResult.rows[0];

    if (!job) {
      return res.json({ success: false, message: "Job not found" });
    }

    if ((job.Status || "").toLowerCase() === "closed") {
      return res.json({ success: false, message: "Ticket already closed" });
    }

    const rawPhone = (job.CustomerNumber || "").trim();

    if (!rawPhone) {
      return res.json({
        success: false,
        message: "No customer phone number on this job",
      });
    }

    const mobile = normalizeMobile(rawPhone);

    if (!mobile) {
      return res.json({
        success: false,
        message: "Invalid customer phone number on this job",
      });
    }

    await cleanExpiredOTPs();
    await db.query(
      `DELETE FROM repair_app.otp_store WHERE phone = $1 AND job_id = $2`,
      [rawPhone, jobId],
    );

    const otp       = generateOTP();
    const istNow    = getISTTimestamp();
    const expiresAt = getISTDate(5 * 60 * 1000);
    const custName  = (job.CustomerName || "Customer").trim();

    await db.query(
      `INSERT INTO repair_app.otp_store
       (phone, otp, job_id, customer_name, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [rawPhone, otp, jobId, custName, istNow, expiresAt],
    );

    const message = buildClosureSMS(otp, jobId);

    try {
      await sendSMS(mobile, message, SMS_TEMPLATE_ID_CLOSE);
    } catch (smsErr) {
      console.error("Closure SMS send failed:", smsErr);
    }

    console.log(`✓ Closure OTP ${otp} sent to ${mobile} for Job ${jobId}`);

    return res.json({
      success: true,
      message: "OTP sent successfully",
      phone:   rawPhone,
    });
  } catch (err) {
    console.error("sendClosureOtp error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP" });
  }
};

const verifyOtp = async (req, res) => {
  const { phone, otp, jobId } = req.body;

  if (!phone || !otp) {
    return res.json({
      success: false,
      valid:   false,
      message: "Phone and OTP are required",
    });
  }

  try {
    await cleanExpiredOTPs();
    const istNow = getISTTimestamp();

    let result;
    if (jobId) {
      result = await db.query(
        `SELECT otp, job_id
         FROM repair_app.otp_store
         WHERE phone = $1 AND job_id = $2 AND expires_at > $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [phone.trim(), jobId, istNow],
      );
    } else {
      result = await db.query(
        `SELECT otp, job_id
         FROM repair_app.otp_store
         WHERE phone = $1 AND expires_at > $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [phone.trim(), istNow],
      );
    }

    const row = result.rows[0];

    if (!row) {
      return res.json({
        success: true,
        valid:   false,
        message: "OTP expired or not found",
      });
    }

    if (row.otp !== otp.trim()) {
      return res.json({
        success: true,
        valid:   false,
        message: "Invalid OTP",
      });
    }

    return res.json({
      success: true,
      valid:   true,
      message: "OTP verified",
      jobId:   row.job_id,
    });
  } catch (err) {
    console.error("OTP verify error:", err);
    return res.json({ success: false, valid: false, message: "Server error" });
  }
};

const createJob = async (req, res) => {
  const files    = req.files || {};
  const mainFile = files["attachment"]    ? files["attachment"][0]    : null;
  const whFile   = files["wh_attachment"] ? files["wh_attachment"][0] : null;

  const {
    jobType,
    barcode,
    item_id,
    division,
    section,
    department,
    category2,
    category3,
    category4,
    rsp,
    item_remarks,
    item_missing,
    product_under_90,
    damage_reason,
    damage_reason_display,
    damage_reason_other_remarks,
    delivery_date,
    customer_number,
    customer_name,
    email,
    pincode,
    city,
    state,
    address,
    whatsapp_ok,
    sms_ok,
    customer_remarks,
    customer_missing,
    warehouse_id,
    warehouse_name,
    courier_name,
    awb,
    dispatch_date,
    warehouse_remarks,
    comments,
    verified_otp,
    pre_generated_job_id,
  } = req.body;

  if (!verified_otp || !customer_number) {
    return res
      .status(400)
      .json({ success: false, message: "OTP verification required" });
  }

  try {
    await cleanExpiredOTPs();
    const istNow = getISTTimestamp();

    const otpResult = await db.query(
      `SELECT otp, job_id
       FROM repair_app.otp_store
       WHERE phone = $1 AND expires_at > $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [customer_number.trim(), istNow],
    );

    const otpRow = otpResult.rows[0];

    if (!otpRow || otpRow.otp !== verified_otp.trim()) {
      return res.status(400).json({
        success: false,
        message: "OTP invalid or expired. Please request a new OTP.",
      });
    }

    const jobId = otpRow.job_id || pre_generated_job_id;
    if (!jobId) {
      return res
        .status(500)
        .json({ success: false, message: "Missing Job ID" });
    }

    const toAttJson = (file) => {
      if (!file) return null;
      return JSON.stringify({
        originalname: file.originalname,
        mimetype:     file.mimetype,
        size:         file.size,
        buffer:       file.buffer ? file.buffer.toString("base64") : null,
      });
    };

    const storeId = req.session.userIdDisplay || "system";

    let newCustomerId = null;
    if (customer_missing === "true" && customer_number) {
      newCustomerId = await generateNextCustomerId();
    }

    if (item_missing === "true" && barcode) {
      await db.query(
        `INSERT INTO repair_app."Item_Master"
         (barcode, item_code, division, section, department, active, created_by, creation_date, remarks)
         VALUES ($1, '', '', '', '', 'True', $2, $3, $4)
         ON CONFLICT (barcode) DO NOTHING`,
        [
          barcode.trim(),
          req.session.userIdDisplay || "system",
          istNow,
          (item_remarks || "").trim(),
        ],
      );
    }

    if (customer_missing === "true" && customer_number && newCustomerId) {
      await db.query(
        `INSERT INTO repair_app."Customer_Master"
         (customer_id, customer_name, phone, address, city, state, pincode,
          whatsapp_ok, sms_ok, active, email, remarks, created_by, created_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'True', $10, $11, $12, $13)
         ON CONFLICT (customer_id) DO NOTHING`,
        [
          newCustomerId,
          (customer_name    || "").trim(),
          customer_number.trim(),
          (address          || "").trim(),
          (city             || "").trim(),
          (state            || "").trim(),
          (pincode          || "").trim(),
          whatsapp_ok       || "False",
          sms_ok            || "False",
          (email            || "").trim(),
          (customer_remarks || "").trim(),
          req.session.userIdDisplay || "system",
          istNow,
        ],
      );
      console.log(`✓ New customer: ${newCustomerId}`);
    }

    const sql = `
      INSERT INTO repair_app.job_data (
        "Job_Id", "JobType", "BARCODE", "ITEM_ID", "DIVISION", "SECTION", "DEPARTMENT",
        "Category2", "Category3", "Category4", "RSP",
        "ItemRemarks", "ItemCreation_Date", "ProductUnder90Days", "DamageReason",
        "DamageRemarks", "DeliveryDate", "CustomerNumber", "CustomerName", "Email",
        "Pincode", "City", "State", "Address", "WhatsAppOK", "SMSOK", "CustomerRemarks",
        "WarehouseID", "WarehouseName", "CourierName", "AWB", "DispatchDate",
        "WarehouseRemarks", "WarehouseAttachment", "Attachment", "Comments",
        "Store_Id", "Status", "CreatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39)
    `;

    const values = [
      jobId,
      jobType                                  || "",
      (barcode              || "").trim(),
      (item_id              || "").trim(),
      (division             || "").trim(),
      (section              || "").trim(),
      (department           || "").trim(),
      (category2            || "").trim(),
      (category3            || "").trim(),
      (category4            || "").trim(),
      (rsp                  || "").trim(),
      (item_remarks         || "").trim(),
      istNow,
      product_under_90                         || "No",
      damage_reason_display || damage_reason   || "",
      (damage_reason_other_remarks || "").trim(),
      delivery_date                            || "",
      (customer_number      || "").trim(),
      (customer_name        || "").trim(),
      (email                || "").trim(),
      (pincode              || "").trim(),
      (city                 || "").trim(),
      (state                || "").trim(),
      (address              || "").trim(),
      whatsapp_ok                              || "False",
      sms_ok                                   || "False",
      (customer_remarks     || "").trim(),
      (warehouse_id         || "").trim(),
      (warehouse_name       || "").trim(),
      (courier_name         || "").trim(),
      (awb                  || "").trim(),
      dispatch_date                            || "",
      (warehouse_remarks    || "").trim(),
      toAttJson(whFile),
      toAttJson(mainFile),
      (comments             || "").trim(),
      storeId,
      "Open",
      istNow,
    ];

    if (values.length !== 39) {
      console.error(`VALUE COUNT MISMATCH: expected 39, got ${values.length}`);
      return res
        .status(500)
        .json({ success: false, message: "Internal column count error" });
    }

    await db.query(sql, values);

    await db.query(
      `DELETE FROM repair_app.otp_store WHERE phone = $1 AND job_id = $2`,
      [customer_number.trim(), jobId],
    );

    return res.json({
      success:    true,
      message:    "Job created successfully",
      jobId,
      customerId: newCustomerId || null,
    });
  } catch (err) {
    console.error("createJob error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create job" });
  }
};

module.exports = {
  renderJobCreation,
  getItemByBarcode,
  getCustomerByNumber,
  sendOtp,
  sendClosureOtp,
  verifyOtp,
  createJob,
};