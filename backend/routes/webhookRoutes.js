const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const supabase = require("../config/supabase");

// POST /api/webhook/github
// Receives GitHub webhook events (expects express.json with raw body preserved at req.rawBody)
router.post("/github", async (req, res) => {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (secret) {
      const signature = req.get("x-hub-signature-256");
      if (!signature) {
        console.warn("Webhook: missing signature header");
        return res
          .status(400)
          .json({ success: false, message: "Missing signature" });
      }

      const hmac = crypto.createHmac("sha256", secret);
      const digest = `sha256=${hmac.update(req.rawBody || Buffer.from("")).digest("hex")}`;
      if (
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
      ) {
        console.warn("Webhook: signature mismatch");
        return res
          .status(401)
          .json({ success: false, message: "Invalid signature" });
      }
    }

    const event = req.get("x-github-event");
    const payload = req.body;

    // We only care about workflow_run events created/completed
    if (event !== "workflow_run") {
      return res.status(200).json({ success: true, message: "Ignored event" });
    }

    const action = payload.action;
    const run = payload.workflow_run;
    const workflow = payload.workflow || {};

    // We rely on workflow.name format: "PushClock Schedule <scheduleId>"
    const workflowName = workflow.name || run?.name || "";
    const prefix = "PushClock Schedule ";
    if (!workflowName.startsWith(prefix)) {
      // Not a PushClock workflow
      return res
        .status(200)
        .json({ success: true, message: "Not a PushClock workflow" });
    }

    const scheduleId = workflowName.replace(prefix, "").trim();
    if (!scheduleId) {
      return res.status(400).json({
        success: false,
        message: "No schedule id found in workflow name",
      });
    }

    // Only handle completed runs
    if (
      action === "requested" ||
      action === "in_progress" ||
      run?.status === "queued" ||
      run?.status === "in_progress"
    ) {
      await supabase
        .from("schedules")
        .update({ status: "in-progress", updated_at: new Date().toISOString() })
        .eq("id", scheduleId);

      return res
        .status(200)
        .json({ success: true, message: "Marked in-progress" });
    }

    if (action === "completed" || run?.status === "completed") {
      const conclusion = run?.conclusion || null;
      if (conclusion === "success") {
        await supabase
          .from("schedules")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", scheduleId);
        console.log(`Webhook: marked schedule ${scheduleId} completed`);
        return res
          .status(200)
          .json({ success: true, message: "Marked completed" });
      }

      // Non-success conclusion -> mark error
      await supabase
        .from("schedules")
        .update({
          status: "error",
          error_message: conclusion || "workflow_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduleId);
      console.log(
        `Webhook: marked schedule ${scheduleId} error (${conclusion})`,
      );
      return res.status(200).json({ success: true, message: "Marked error" });
    }

    // Other actions: ignore
    res.status(200).json({ success: true, message: "Ignored action" });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
