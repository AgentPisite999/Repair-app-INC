// routes/adminRoutes.js

const express = require("express");
const multer = require("multer");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isSuperAdmin } = require("../middleware/authMiddleware");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Render admin panel
router.get("/admin", isSuperAdmin, adminController.renderPanel);

// API routes
router.get("/api/admin/config", isSuperAdmin, adminController.getConfig);
router.get(
  "/api/admin/dashboard",
  isSuperAdmin,
  adminController.getDashboardKPIs,
);
router.get(
  "/api/admin/table/:tableName",
  isSuperAdmin,
  adminController.getTableData,
);
router.post(
  "/api/admin/table/:tableName",
  isSuperAdmin,
  adminController.createRecord,
);
router.put(
  "/api/admin/table/:tableName/:id",
  isSuperAdmin,
  adminController.updateRecord,
);
router.delete(
  "/api/admin/table/:tableName/:id",
  isSuperAdmin,
  adminController.deleteRecord,
);
router.post(
  "/api/admin/upload/:tableName",
  isSuperAdmin,
  upload.single("file"),
  adminController.uploadFile,
);
router.post(
  "/api/admin/insert/:tableName",
  isSuperAdmin,
  adminController.insertData,
);
router.get(
  "/api/admin/template/:tableName",
  isSuperAdmin,
  adminController.downloadTemplate,
);

module.exports = router;
