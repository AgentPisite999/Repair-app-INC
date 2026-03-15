// routes/adminRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const {
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
  getUsers,
  addUser,
  resetUserPassword,
  deleteUser,
} = require("../controllers/adminController");

// Middleware: SuperAdmin only
const superAdminOnly = (req, res, next) => {
  if (req.session && req.session.role === "SuperAdmin") return next();
  return res.status(403).json({ success: false, message: "Access denied. SuperAdmin only." });
};

// Panel render
router.get("/panel", superAdminOnly, renderPanel);

// Dashboard KPIs
router.get("/api/kpis", superAdminOnly, getDashboardKPIs);

// Config
router.get("/api/config", superAdminOnly, getConfig);

// Master table CRUD
router.get("/api/table/:tableName", superAdminOnly, getTableData);
router.post("/api/table/:tableName", superAdminOnly, createRecord);
router.put("/api/table/:tableName/:id", superAdminOnly, updateRecord);
router.delete("/api/table/:tableName/:id", superAdminOnly, deleteRecord);

// File upload & insert
router.post("/api/upload/:tableName", superAdminOnly, upload.single("file"), uploadFile);
router.post("/api/insert/:tableName", superAdminOnly, insertData);

// Template download
router.get("/api/template/:tableName", superAdminOnly, downloadTemplate);

// ── User Management Routes ──────────────────────────────────────────────────
router.get("/api/users", superAdminOnly, getUsers);
router.post("/api/users", superAdminOnly, addUser);
router.put("/api/users/:id/reset-password", superAdminOnly, resetUserPassword);
router.delete("/api/users/:id", superAdminOnly, deleteUser);

module.exports = router;