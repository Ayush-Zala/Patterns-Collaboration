const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function buildActivityRoutes({ store }) {
  const router = express.Router();

  router.get("/", asyncHandler(async (req, res) => {
    if (typeof store.listActivityLogs !== "function") {
      return res.status(500).json({ error: "Activity logs are not available for current store mode." });
    }

    const limit = Number(req.query.limit || 100);
    const activity = await store.listActivityLogs({ limit });
    return res.status(200).json({ activity });
  }));

  return router;
}

module.exports = { buildActivityRoutes };
