const express = require("express");
const crypto = require("crypto");
const { asyncHandler } = require("../utils/asyncHandler");

function buildSequenceRoutes({ store }) {
  const router = express.Router();

  // Middleware to ensure organization context
  router.use((req, res, next) => {
    if (!req.auth?.organization_id) {
      return res.status(401).json({ error: "Organization context required" });
    }
    next();
  });

  // Create Sequence
  router.post("/", asyncHandler(async (req, res) => {
    const { name, channelId, cc, bcc, senderName } = req.body;
    
    if (!name || !channelId || !senderName) {
      return res.status(400).json({ error: "Missing required fields (name, channelId, senderName)" });
    }

    const sequence = await store.prisma.sequence.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: req.auth.organization_id,
        name,
        channelId,
        cc,
        bcc,
        senderName,
        status: "draft"
      }
    });

    return res.status(201).json({ sequence });
  }));

  // List Sequences
  router.get("/", asyncHandler(async (req, res) => {
    const sequences = await store.prisma.sequence.findMany({
      where: { organizationId: req.auth.organization_id },
      orderBy: { createdAt: "desc" },
      include: {
        channel: { select: { emailAddress: true } },
        _count: { select: { stages: true } }
      }
    });
    return res.status(200).json({ sequences });
  }));

  // Get Sequence details
  router.get("/:id", asyncHandler(async (req, res) => {
    const sequence = await store.prisma.sequence.findUnique({
      where: { 
        id: req.params.id,
        organizationId: req.auth.organization_id
      },
      include: {
        stages: { orderBy: { orderIndex: "asc" } },
        channel: { select: { emailAddress: true } }
      }
    });

    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    return res.status(200).json({ sequence });
  }));

  // Delete Sequence
  router.delete("/:id", asyncHandler(async (req, res) => {
    const sequence = await store.prisma.sequence.findUnique({
      where: { id: req.params.id, organizationId: req.auth.organization_id }
    });
    if (!sequence) return res.status(404).json({ error: "Sequence not found" });

    await store.prisma.sequence.delete({
      where: { id: req.params.id }
    });

    return res.status(204).send();
  }));

  // Update Sequence Details
  router.patch("/:id", asyncHandler(async (req, res) => {
    const { name, channelId, cc, bcc, senderName, status, recipients } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (channelId !== undefined) data.channelId = channelId;
    if (cc !== undefined) data.cc = cc;
    if (bcc !== undefined) data.bcc = bcc;
    if (senderName !== undefined) data.senderName = senderName;
    if (status !== undefined) data.status = status;
    if (recipients !== undefined) data.recipients = recipients;

    const sequence = await store.prisma.sequence.update({
      where: { 
        id: req.params.id,
        organizationId: req.auth.organization_id
      },
      data,
      include: {
        stages: { orderBy: { orderIndex: "asc" } }
      }
    });

    // START SEQUENCE LOGIC
    if (status === "active" && sequence.recipients && sequence.stages.length > 0) {
      const recipientList = sequence.recipients;
      const firstStage = sequence.stages[0];

      // Use a transaction to populate initial recipients and jobs
      await store.prisma.$transaction(async (tx) => {
        for (const r of recipientList) {
          // 1. Create or ensure SequenceRecipient exists
          const sRecipient = await tx.sequencerecipient.upsert({
            where: {
              sequenceId_email: { sequenceId: sequence.id, email: r.email }
            },
            update: {
              status: "active",
              currentStageId: firstStage.id
            },
            create: {
              id: crypto.randomUUID(),
              sequenceId: sequence.id,
              email: r.email,
              status: "active",
              currentStageId: firstStage.id
            }
          });

          // 2. Schedule the first job
          await tx.sequencejob.create({
            data: {
              id: crypto.randomUUID(),
              sequenceId: sequence.id,
              recipientEmail: r.email,
              stageId: firstStage.id,
              // If stage has a sendDate, use it, otherwise schedule for now
              scheduledFor: firstStage.sendDate ? new Date(firstStage.sendDate) : new Date(),
              status: "queued"
            }
          });
        }
      });
    }

    return res.status(200).json({ sequence });
  }));

  // Create Stage
  router.post("/:id/stages", asyncHandler(async (req, res) => {
    const sequenceId = req.params.id;
    const { name, orderIndex, sendDate, subject, bodyHtml } = req.body;

    const sequence = await store.prisma.sequence.findUnique({
      where: { id: sequenceId, organizationId: req.auth.organization_id }
    });
    if (!sequence) return res.status(404).json({ error: "Sequence not found" });

    // Determine orderIndex if not provided
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const maxStage = await store.prisma.sequencestage.findFirst({
        where: { sequenceId },
        orderBy: { orderIndex: "desc" }
      });
      finalOrderIndex = maxStage ? maxStage.orderIndex + 1 : 0;
    }

    const stage = await store.prisma.sequencestage.create({
      data: {
        id: crypto.randomUUID(),
        sequenceId,
        name: name || `Stage ${String.fromCharCode(65 + finalOrderIndex)}`,
        orderIndex: finalOrderIndex,
        sendDate: sendDate ? new Date(sendDate) : null,
        subject,
        bodyHtml
      }
    });

    return res.status(201).json({ stage });
  }));

  // Update Stage
  router.patch("/:id/stages/:stageId", asyncHandler(async (req, res) => {
    const { id, stageId } = req.params;
    const { name, orderIndex, sendDate, subject, bodyHtml } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (orderIndex !== undefined) data.orderIndex = orderIndex;
    if (sendDate !== undefined) data.sendDate = sendDate ? new Date(sendDate) : null;
    if (subject !== undefined) data.subject = subject;
    if (bodyHtml !== undefined) data.bodyHtml = bodyHtml;

    // Verify ownership
    const sequence = await store.prisma.sequence.findUnique({
      where: { id, organizationId: req.auth.organization_id }
    });
    if (!sequence) return res.status(404).json({ error: "Sequence not found" });

    const stage = await store.prisma.sequencestage.update({
      where: { id: stageId, sequenceId: id },
      data
    });

    return res.status(200).json({ stage });
  }));

  // Delete Stage
  router.delete("/:id/stages/:stageId", asyncHandler(async (req, res) => {
    const { id, stageId } = req.params;
    
    const sequence = await store.prisma.sequence.findUnique({
      where: { id, organizationId: req.auth.organization_id }
    });
    if (!sequence) return res.status(404).json({ error: "Sequence not found" });

    await store.prisma.sequencestage.delete({
      where: { id: stageId, sequenceId: id }
    });

    return res.status(204).send();
  }));

  return router;
}

module.exports = { buildSequenceRoutes };
