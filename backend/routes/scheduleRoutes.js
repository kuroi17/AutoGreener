const express = require("express");
const router = express.Router();
const {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  toggleScheduleStatus,
  deleteSchedule,
  syncScheduleStatuses,
} = require("../controllers/scheduleController");
const { isAuthenticated } = require("../middleware/auth");

// All routes require authentication
router.use(isAuthenticated);

// Routes
router.get("/", getAllSchedules); // GET /api/schedule
router.get("/:id", getScheduleById); // GET /api/schedule/:id
router.post("/", createSchedule); // POST /api/schedule
router.put("/:id", updateSchedule); // PUT /api/schedule/:id
router.put("/:id/toggle", toggleScheduleStatus); // PUT /api/schedule/:id/toggle
router.post("/sync-status", syncScheduleStatuses); // POST /api/schedule/sync-status
router.delete("/:id", deleteSchedule); // DELETE /api/schedule/:id

module.exports = router;
