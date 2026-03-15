const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getRawData,
} = require("../controllers/dashboardController");
const { isAuthenticated } = require("../middleware/authMiddleware");

router.get("/stats", isAuthenticated, getDashboardStats);
router.get("/raw-data", isAuthenticated, getRawData);

module.exports = router;
