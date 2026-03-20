const express = require("express");
const router = express.Router();
const passport = require("../config/passport");

// GitHub OAuth login route
router.get(
  "/github",
  passport.authenticate("github", { scope: ["repo", "user"] }),
);

// GitHub OAuth callback route
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${process.env.FRONTEND_URL || "https://autogreener.onrender.com"}/login?error=auth_failed`,
  }),
  (req, res) => {
    // Successful authentication, redirect to dashboard
    res.redirect(
      `${process.env.FRONTEND_URL || "https://autogreener.onrender.com"}/?login=success`,
    );
  },
);

// Get current user route
router.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        avatar_url: req.user.avatar_url,
        github_id: req.user.github_id,
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }
});

// Logout route
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  });
});

// Check auth status
router.get("/status", (req, res) => {
  res.json({
    success: true,
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated()
      ? {
          id: req.user.id,
          username: req.user.username,
          avatar_url: req.user.avatar_url,
        }
      : null,
  });
});

module.exports = router;
