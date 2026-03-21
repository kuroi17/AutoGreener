const express = require("express");
const router = express.Router();
const axios = require("axios");
const { isAuthenticated } = require("../middleware/auth");

/**
 * GET /api/debug/token-scopes
 * Returns the OAuth token scopes for the authenticated user
 */
router.get("/token-scopes", isAuthenticated, async (req, res) => {
  try {
    const accessToken = req.user?.access_token;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "No access token available for the authenticated user",
      });
    }

    // Call GitHub /user endpoint to get headers containing scopes
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "PushClock-App",
      },
    });

    const scopesHeader = response.headers["x-oauth-scopes"] || "";

    res.json({
      success: true,
      scopes: scopesHeader,
      login: response.data?.login || null,
    });
  } catch (error) {
    console.error(
      "Error fetching token scopes:",
      error.response?.data || error.message,
    );
    // If GitHub returns 401/403/404, surface the message for easier debugging
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.message;
    res.status(status).json({
      success: false,
      message: `Failed to fetch token scopes: ${message}`,
      details: error.response?.data || null,
    });
  }
});

module.exports = router;
