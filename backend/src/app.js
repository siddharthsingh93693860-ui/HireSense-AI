
const authRoutes = require("./routes/authRouter");

const resumeRoutes = require("./routes/resumeRoutes");
const express = require("express");
const cors = require("cors");

const protect = require("./middleware/authMiddleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "HireSense AI backend is running!",
  });
});

app.use("/api/auth", authRoutes);

app.get("/api/auth/me", protect, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

app.use("/api/resumes", resumeRoutes);
module.exports = app;
