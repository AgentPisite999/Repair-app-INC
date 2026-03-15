// middleware/authMiddleware.js

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  if (
    req.xhr ||
    (req.headers.accept && req.headers.accept.indexOf("json") > -1)
  ) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized", redirectUrl: "/login" });
  }
  res.redirect("/login");
};

const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};

const isSuperAdmin = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    if (
      req.xhr ||
      (req.headers.accept && req.headers.accept.indexOf("json") > -1)
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized",
          redirectUrl: "/login",
        });
    }
    return res.redirect("/login");
  }
  const role = (req.session.role || "").toLowerCase().trim();
  if (role !== "superadmin") {
    if (
      req.xhr ||
      (req.headers.accept && req.headers.accept.indexOf("json") > -1)
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return res.redirect("/dashboard");
  }
  next();
};

module.exports = { isAuthenticated, isNotAuthenticated, isSuperAdmin };
