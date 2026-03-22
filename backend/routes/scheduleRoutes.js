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
// Routes
router.get("/", getAllSchedules); // GET /api/schedule
// Place explicit non-id routes before the parameterized `/:id` route so
// path segments like "sync-status" are not accidentally treated as an ID.
router.post("/sync-status", syncScheduleStatuses); // POST /api/schedule/sync-status
router.get("/:id", getScheduleById); // GET /api/schedule/:id
router.post("/", createSchedule); // POST /api/schedule
router.put("/:id", updateSchedule); // PUT /api/schedule/:id
router.put("/:id/toggle", toggleScheduleStatus); // PUT /api/schedule/:id/toggle
router.delete("/:id", deleteSchedule); // DELETE /api/schedule/:id

module.exports = router;
