const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { isAuthenticated } = require("../middleware/authMiddleware"); // ✅ Use your existing middleware

router.get("/stats", isAuthenticated, getDashboardStats);

module.exports = router;
