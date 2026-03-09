const bcrypt = require("bcrypt");
const { db } = require("../config/database");

// Render login page
const renderLogin = (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  res.render("login", { error: null });
};

// Handle login
const login = async (req, res) => {
  const { user_id, password } = req.body;

  if (!user_id || !password) {
    return res.status(400).json({
      success: false,
      message: "User ID and password are required",
    });
  }

  try {
    const result = await db.query("SELECT * FROM users WHERE user_id = $1", [
      user_id,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ── Set session ──
    req.session.userId = user.id;
    req.session.userIdDisplay = user.user_id;
    req.session.role = user.role;

    const normalizedRole = (user.role || "").toLowerCase().trim();

    if (normalizedRole === "store") {
      req.session.storeId = user.user_id;
    }

    if (normalizedRole.startsWith("warehouse")) {
      const idx = user.role.indexOf(" - ");
      req.session.whId =
        idx !== -1 ? user.role.substring(idx + 3).trim() : null;
    }

    // ── Role-based redirect ──
    let redirectUrl = "/dashboard";
    if (normalizedRole === "store") redirectUrl = "/job-creation";
    else if (normalizedRole.includes("warehouse"))
      redirectUrl = "/action-analytics";
    else if (normalizedRole === "admin") redirectUrl = "/job-creation";
    else if (normalizedRole === "dashboard") redirectUrl = "/dashboard-admin";

    return res.json({
      success: true,
      message: "Login successful",
      redirectUrl: redirectUrl,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error occurred",
    });
  }
};

// Handle logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
    res.json({
      success: true,
      message: "Logged out successfully",
      redirectUrl: "/login",
    });
  });
};

// Render dashboard
const renderDashboard = (req, res) => {
  const normalizedRole = (req.session.role || "").toLowerCase().trim();

  if (normalizedRole === "store") return res.redirect("/job-creation");
  else if (normalizedRole.includes("warehouse"))
    return res.redirect("/action-analytics");
  else if (normalizedRole === "admin") return res.redirect("/job-creation");
  else if (normalizedRole === "dashboard")
    return res.redirect("/dashboard-admin");

  res.render("dashboard", {
    userId: req.session.userIdDisplay,
    role: req.session.role || "user",
  });
};

module.exports = {
  renderLogin,
  login,
  logout,
  renderDashboard,
};
