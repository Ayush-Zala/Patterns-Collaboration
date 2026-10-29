const express = require("express");
const crypto = require("crypto");

function buildRuleRoutes({ store }) {
  const router = express.Router();

  // GET /rules - Fetch rules for the active organization or user
  router.get("/", async (req, res, next) => {
    try {
      const { auth } = req;
      if (!auth) return res.status(401).json({ error: "Unauthorized" });

      console.log(`[RuleRoutes] Fetching rules for org: ${auth.organization_id}, user: ${auth.user_id}`);

      const scopeType = req.header("x-scope-type") || "individual";
      const scopeId = req.header("x-scope-id") || auth.user_id;

      // Filter by organization if provided, and also by scope
      const rules = await store.prisma.automationRule.findMany({
        where: {
          organizationId: auth.organization_id || null,
          scopeType,
          scopeId,
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ rules });
    } catch (error) {
      console.error("[RuleRoutes] GET error:", error);
      next(error);
    }
  });

  // POST /rules - Create a new rule
  router.post("/", async (req, res, next) => {
    try {
      const { auth } = req;
      if (!auth) return res.status(401).json({ error: "Unauthorized" });

      const scopeType = req.header("x-scope-type") || "individual";
      const scopeId = req.header("x-scope-id") || auth.user_id;

      const { name, triggers, conditions, actions, stopProcessing } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Rule name is required." });
      }

      console.log(`[RuleRoutes] Creating rule: "${name}" for user: ${auth.user_id} with scope ${scopeType}:${scopeId}`);

      const rule = await store.prisma.automationRule.create({
        data: {
          id: `rule-${crypto.randomUUID().slice(0, 8)}`,
          organizationId: auth.organization_id || null,
          createdBy: auth.user_id,
          scopeType,
          scopeId,
          name,
          triggers: JSON.stringify(triggers || []),
          conditions: JSON.stringify(conditions || []),
          actions: JSON.stringify(actions || []),
          stopProcessing: !!stopProcessing,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      console.log(`[RuleRoutes] Successfully created rule: ${rule.id}`);
      return res.status(201).json({ rule });
    } catch (error) {
      console.error("[RuleRoutes] POST Exception:", error.message);
      if (error.code) console.error("[RuleRoutes] Prisma Error Code:", error.code);
      
      // Return a descriptive error instead of just calling next(error)
      return res.status(500).json({ 
        error: error.message || "Internal server error",
        code: error.code,
        detail: "Check server logs for full stack trace"
      });
    }
  });

  // DELETE /rules/:id - Delete a rule
  router.delete("/:id", async (req, res, next) => {
    try {
      const { auth } = req;
      if (!auth) return res.status(401).json({ error: "Unauthorized" });

      const ruleId = req.params.id;
      console.log(`[RuleRoutes] Deleting rule: ${ruleId}`);

      // Verify the rule belongs to the org or user
      const rule = await store.prisma.automationRule.findUnique({
        where: { id: ruleId },
      });

      if (!rule) return res.status(404).json({ error: "Rule not found" });
      
      if (rule.organizationId) {
        if (rule.organizationId !== auth.organization_id) {
          return res.status(403).json({ error: "Cannot delete rule belonging to another organization" });
        }
      } else {
        // Individual scope rule
        if (rule.createdBy !== auth.user_id) {
          return res.status(403).json({ error: "Cannot delete rule belonging to another user" });
        }
      }

      try {
        await store.prisma.automationRule.delete({
          where: { id: ruleId }
        });
        return res.json({ ok: true });
      } catch (error) {
        if (error.code === 'P2025') {
          return res.status(404).json({ error: "Rule not found or already deleted" });
        }
        throw error;
      }
    } catch (error) {
      console.error("[RuleRoutes] DELETE error:", error);
      next(error);
    }
  });

  router.post("/:id/execute", async (req, res, next) => {
    try {
      const ruleId = req.params.id;
      const { threadId } = req.body;
      const { auth } = req;
      
      if (!threadId) {
        return res.status(400).json({ error: "Missing threadId" });
      }

      const rule = await store.prisma.automationRule.findUnique({
        where: { id: ruleId }
      });

      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      // Check permissions
      if (rule.organizationId && rule.organizationId !== auth.organization_id) {
        return res.status(403).json({ error: "Cannot execute rule from another org" });
      }

      const thread = await store.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Execute actions directly (bypassing triggers and conditions)
      // because the user clicked it manually!
      let actions = [];
      try { actions = JSON.parse(rule.actions || '[]'); } catch (e) {}

      // Fire a system event so the AutomationEngine handles it asynchronously?
      // No, we want to execute it synchronously to return success to the user.
      // Wait, we need access to `systemEvents` or `automationEngine` to execute actions cleanly, 
      // but `automationEngine` is only attached to `server.js` or `app.js`.
      // Actually, we can just execute the logic here or dispatch an event `automation:macro.execute`.
      const { AutomationEngineService } = require('../services/automationEngineService');
      const engine = new AutomationEngineService({ store });
      await engine.executeMacro({
        orgId: auth.organization_id,
        ruleId: rule.id,
        threadId: thread.id,
        actorId: auth.user_id
      });

      return res.json({ success: true, message: "Macro execution triggered" });
    } catch (error) {
      console.error("[RuleRoutes] EXECUTE error:", error);
      next(error);
    }
  });

  return router;
}

module.exports = { buildRuleRoutes };
