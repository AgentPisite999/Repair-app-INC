// routes/authRoutes.js

const express = require("express");
const multer = require("multer");
const router = express.Router();

const authController = require("../controllers/authController");
const jobController = require("../controllers/jobController");
const analyticsController = require("../controllers/analyticsController");
const {
  isAuthenticated,
  isNotAuthenticated,
} = require("../middleware/authMiddleware");

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/", isNotAuthenticated, (req, res) => res.redirect("/login"));
router.get("/login", isNotAuthenticated, authController.renderLogin);
router.post("/login", authController.login);

router.get("/dashboard", isAuthenticated, authController.renderDashboard);
router.post("/logout", isAuthenticated, authController.logout);
router.get("/job-creation", isAuthenticated, jobController.renderJobCreation);

router.get(
  "/action-analytics",
  isAuthenticated,
  analyticsController.renderAnalytics,
);

router.get("/dashboard-admin", isAuthenticated, (req, res) => {
  const role = (req.session.role || "").toLowerCase().trim();
  if (role !== "admin" && role !== "dashboard" && role !== "rm") {
    return res.redirect("/dashboard");
  }
  res.render("dashboard-admin", {
    userId: req.session.userIdDisplay,
    role: req.session.role || "user",
  });
});

router.get("/api/item", isAuthenticated, jobController.getItemByBarcode);
router.get("/api/customer", isAuthenticated, jobController.getCustomerByNumber);

router.post(
  "/api/job",
  isAuthenticated,
  upload.fields([
    { name: "attachment", maxCount: 1 },
    { name: "wh_attachment", maxCount: 1 },
  ]),
  jobController.createJob,
);

router.post("/api/send-otp", isAuthenticated, jobController.sendOtp);
router.post(
  "/api/send-closure-otp",
  isAuthenticated,
  jobController.sendClosureOtp,
);
router.post("/api/verify-otp", isAuthenticated, jobController.verifyOtp);

router.get("/api/analytics/jobs", isAuthenticated, analyticsController.getJobs);
router.get(
  "/api/analytics/statuses",
  isAuthenticated,
  analyticsController.getStatuses,
);
router.get(
  "/api/analytics/attachment/:jobId",
  isAuthenticated,
  analyticsController.getAttachment,
);
router.get(
  "/api/analytics/wh-attachment/:jobId",
  isAuthenticated,
  analyticsController.getWhAttachment,
);
router.get(
  "/api/analytics/receipt/:jobId",
  isAuthenticated,
  analyticsController.generateReceipt,
);
router.post(
  "/api/analytics/update-delivery-date",
  isAuthenticated,
  analyticsController.updateDeliveryDate,
);
router.post(
  "/api/analytics/close-ticket",
  isAuthenticated,
  analyticsController.closeTicket,
);
router.post(
  "/api/analytics/warehouse-draft",
  isAuthenticated,
  upload.single("wh_attachment_transfer"),
  analyticsController.saveWarehouseDraft,
);
router.post(
  "/api/analytics/vendor-draft",
  isAuthenticated,
  analyticsController.saveVendorDraft,
);
router.post(
  "/api/analytics/transfer-warehouse",
  isAuthenticated,
  upload.single("wh_attachment_transfer"),
  analyticsController.transferToWarehouse,
);
router.post(
  "/api/analytics/admin-update-job",
  isAuthenticated,
  analyticsController.adminUpdateJob,
);
router.post(
  "/api/analytics/warehouse-acknowledge",
  isAuthenticated,
  analyticsController.warehouseAcknowledge,
);
router.post(
  "/api/analytics/send-to-vendor",
  isAuthenticated,
  analyticsController.sendToVendor,
);
router.post(
  "/api/analytics/vendor-decision",
  isAuthenticated,
  analyticsController.vendorDecision,
);
router.post(
  "/api/analytics/return-to-store",
  isAuthenticated,
  analyticsController.returnToStore,
);
router.post(
  "/api/analytics/store-acknowledge",
  isAuthenticated,
  analyticsController.storeAcknowledge,
);

module.exports = router;
