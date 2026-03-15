// server.js

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const dashboardApiRoutes = require("./routes/dashboardRoutes");
const { initializeDatabase } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public/views"));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "test_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, secure: false },
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Routes
app.use("/", adminRoutes);
app.use("/", authRoutes);
app.use("/api/dashboard", dashboardApiRoutes);

// 404 handler
app.use((req, res) => {
  console.log("404 Not Found:", req.method, req.originalUrl);
  res.status(404).send(`Page not found: ${req.originalUrl}`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack || err);
  res.status(500).send("Something went wrong!");
});

const startServer = async () => {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }
};

startServer();
