const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { analyticsEventBus } = require("../analytics/analyticsEventBus");

function buildCalendarRoutes({ store, calendarService }) {
  const router = express.Router();

  // GET /api/calendar/events
  router.get("/", asyncHandler(async (req, res) => {
    const { startDate, endDate, threadId } = req.query;
    const organizationId = req.auth.organization_id;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const events = await store.listEvents({
      organizationId,
      threadId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    // Emit meeting.completed for any past events that are not yet marked completed
    const now = new Date();
    for (const event of events) {
      const endTime = event.end_time || event.endTime;
      if (endTime && new Date(endTime) < now && event.status !== "cancelled") {
        analyticsEventBus.publish("meeting.completed", {
          orgId: organizationId,
          eventId: event.id,
        });
      }
    }

    return res.status(200).json({ events });
  }));

  // POST /api/calendar/events
  router.post("/", asyncHandler(async (req, res) => {
    const { title, description, startTime, endTime, threadId, channelId, attendees, generateMeetLink } = req.body;
    const organizationId = req.auth.organization_id;
    const userId = req.auth.user_id;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Optional: push to Google Calendar via a calendarService if implemented
    let externalEventId = null;
    let meetingLink = null;

    if (calendarService && generateMeetLink) {
      const gcalEvent = await calendarService.createEvent(userId, {
        summary: title,
        description,
        start: new Date(startTime),
        end: new Date(endTime),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
          },
        },
      });
      externalEventId = gcalEvent.id;
      meetingLink = gcalEvent.hangoutLink || gcalEvent.htmlLink;
    }

    const event = await store.createEvent({
      organizationId,
      threadId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdBy: userId,
      provider: channelId || "google",
      externalEventId,
      meetingLink,
      attendees: Array.isArray(attendees) ? attendees : [],
    });

    if (typeof store.logActivity === "function") {
      await store.logActivity({
        type: "event_created",
        actor_id: userId,
        entity_type: "event",
        entity_id: event.id,
        metadata: { title },
      });
    }


    // Emit analytics event
    if (organizationId) {
      analyticsEventBus.publish("meeting.created", {
        orgId: organizationId,
        eventId: event.id,
        actorId: userId,
      });
    }

    return res.status(201).json({ event });
  }));

  // GET /api/calendar/events/:id
  router.get("/:id", asyncHandler(async (req, res) => {
    const event = await store.getEvent(req.params.id);
    if (!event || event.organizationId !== req.auth.organization_id) {
      return res.status(404).json({ error: "Event not found" });
    }
    return res.status(200).json({ event });
  }));

  // PATCH /api/calendar/events/:id
  router.patch("/:id", asyncHandler(async (req, res) => {
    const event = await store.getEvent(req.params.id);
    if (!event || event.organizationId !== req.auth.organization_id) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.createdBy !== req.auth.user_id && req.auth.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to edit this event" });
    }

    if (typeof store.updateEvent !== "function") {
      return res.status(500).json({ error: "Event updates are not available for current store mode." });
    }

    const { title, description, startTime, endTime, threadId, channelId, attendees, generateMeetLink } = req.body;
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let externalEventId = event.externalEventId || null;
    let meetingLink = event.meetingLink || null;

    if (calendarService && generateMeetLink && !meetingLink) {
      const gcalEvent = await calendarService.createEvent(req.auth.user_id, {
        summary: title,
        description,
        start: new Date(startTime),
        end: new Date(endTime),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
          },
        },
      });
      externalEventId = gcalEvent.id;
      meetingLink = gcalEvent.hangoutLink || gcalEvent.htmlLink;
    }

    const updated = await store.updateEvent(req.params.id, {
      threadId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      provider: channelId || event.provider || "google",
      externalEventId,
      meetingLink,
      attendees: Array.isArray(attendees) ? attendees : [],
    });

    return res.status(200).json({ event: updated });
  }));

  // DELETE /api/calendar/events/:id
  router.delete("/:id", asyncHandler(async (req, res) => {
    const event = await store.getEvent(req.params.id);
    if (!event || event.organizationId !== req.auth.organization_id) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.createdBy !== req.auth.user_id && req.auth.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this event" });
    }

    if (calendarService && event.externalEventId) {
      await calendarService.deleteEvent(req.auth.user_id, event.externalEventId);
    }

    await store.deleteEvent(req.params.id);

    // Decrement meetings_scheduled since the event is permanently deleted
    if (req.auth?.organization_id) {
      analyticsEventBus.publish("meeting.deleted", {
        orgId: req.auth.organization_id,
        eventId: req.params.id,
        actorId: req.auth.user_id,
      });
    }

    return res.status(200).json({ success: true });
  }));

  return router;
}

module.exports = { buildCalendarRoutes };
