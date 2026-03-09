// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }

  // If AJAX request, return JSON
  if (req.xhr || req.headers.accept.indexOf("json") > -1) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      redirectUrl: "/login",
    });
  }

  // Otherwise redirect to login
  res.redirect("/login");
};

// Middleware to check if user is already logged in (for login page)
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
};
