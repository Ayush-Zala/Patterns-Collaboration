/**
 * Analytics REST Routes
 * ---------------------
 * Dashboard API — reads exclusively from AnalyticsStore.
 * Never queries operational tables (threads, messages, events).
 *
 * All endpoints require `orgId` query param or org context from Better Auth.
 *
 * Routes:
 *   GET /analytics-v2/summary    — full snapshot
 *   GET /analytics-v2/workload
 *   GET /analytics-v2/efficiency
 *   GET /analytics-v2/busiest
 *   GET /analytics-v2/inboxes
 *   GET /analytics-v2/team
 *   GET /analytics-v2/calendar
 */

const express = require("express");
const { analyticsStore } = require("../analytics/analyticsStore");
const { asyncHandler } = require("../utils/asyncHandler");

function buildAnalyticsRoutes() {
  const router = express.Router();

  // Helper: resolve orgId from query param or auth context
  function resolveOrgId(req) {
    return (
      req.query.orgId ||
      req.auth?.organization_id ||
      null
    );
  }

  // ─── GET /analytics-v2/summary ────────────────────────────────────────────
  router.get("/summary", asyncHandler(async (req, res) => {
    const orgId = resolveOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }
    // getSnapshotAsync rehydrates from DB on first call after a restart
    const snapshot = await analyticsStore.getSnapshotAsync(orgId);
    return res.json({ ok: true, orgId, data: snapshot });
  }));

  // ─── GET /analytics-v2/workload ──────────────────────────────────────────
  router.get("/workload", asyncHandler(async (req, res) => {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const { workload, updatedAt } = await analyticsStore.getSnapshotAsync(orgId);
    return res.json({ ok: true, orgId, data: { workload, updatedAt } });
  }));

  // ─── GET /analytics-v2/efficiency ────────────────────────────────────────
  router.get("/efficiency", asyncHandler(async (req, res) => {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const { efficiency, updatedAt } = await analyticsStore.getSnapshotAsync(orgId);
    return res.json({ ok: true, orgId, data: { efficiency, updatedAt } });
  }));

  // ─── GET /analytics-v2/busiest ───────────────────────────────────────────
  router.get("/busiest", asyncHandler(async (req, res) => {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const { busiest, updatedAt } = await analyticsStore.getSnapshotAsync(orgId);
    return res.json({ ok: true, orgId, data: { busiest, updatedAt } });
  }));

  // ─── GET /analytics-v2/inboxes ───────────────────────────────────────────
  router.get("/inboxes", asyncHandler(async (req, res) => {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const { inboxes, updatedAt } = await analyticsStore.getSnapshotAsync(orgId);
    return res.json({ ok: true, orgId, data: { inboxes, updatedAt } });
  }));

  // ─── GET /analytics-v2/team ──────────────────────────────────────────────
  router.get("/team", asyncHandler(async (req, res) => {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const { team, updatedAt } = await analyticsStore.getSnapshotAsync(orgId);
    return res.json({ ok: true, orgId, data: { team, updatedAt } });
  }));

  // ─── GET /analytics-v2/calendar ──────────────────────────────────────────
  router.get("/calendar", asyncHandler(async (req, res) => {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: "orgId is required" });
    const { calendar, updatedAt } = await analyticsStore.getSnapshotAsync(orgId);
    return res.json({ ok: true, orgId, data: { calendar, updatedAt } });
  }));

  return router;
}

module.exports = { buildAnalyticsRoutes };
