const crypto = require("crypto");

class SequenceWorker {
  constructor({ store, authService, mailService }) {
    this.store = store;
    this.authService = authService;
    this.mailService = mailService;
    this.timer = null;
    this.isRunning = false;
  }

  start(intervalMs = 10000) { // Poll every 10 seconds
    console.log(`[SequenceWorker] Started polling every ${intervalMs}ms`);
    this.timer = setInterval(() => this.processJobs(), intervalMs);
    // Process immediately on start
    this.processJobs();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log(`[SequenceWorker] Stopped polling`);
    }
  }

  async processJobs() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Find all due queued jobs
      const dueJobs = await this.store.prisma.sequencejob.findMany({
        where: {
          status: "queued",
          scheduledFor: { lte: new Date() }
        },
        take: 50 // process batch
      });

      for (const job of dueJobs) {
        await this.processSingleJob(job);
      }
    } catch (error) {
      console.error("[SequenceWorker] Error processing jobs:", error);
    } finally {
      this.isRunning = false;
    }
  }

  async processSingleJob(job) {
    console.log(`[SequenceWorker] Processing Job ${job.id} for ${job.recipientEmail} (Stage: ${job.stageId})`);

    try {
      // Mark as processing
      await this.store.prisma.sequencejob.update({
        where: { id: job.id },
        data: { status: "processing" }
      });

      const recipient = await this.store.prisma.sequencerecipient.findUnique({
        where: { sequenceId_email: { sequenceId: job.sequenceId, email: job.recipientEmail } }
      });

      // If they opted out, replied, or paused, mark job as failed/skipped
      if (!recipient || recipient.status !== "active") {
        await this.store.prisma.sequencejob.update({
          where: { id: job.id },
          data: { status: "failed", error: `Recipient status is ${recipient?.status || 'missing'}` }
        });
        return;
      }

      const stage = await this.store.prisma.sequencestage.findUnique({
        where: { id: job.stageId },
        include: { 
          sequence: {
            include: { channel: true }
          }
        }
      });

      if (!stage) {
        throw new Error("Stage not found");
      }

      // SEND EMAIL via GMAIL API
      console.log(`[SequenceWorker] 📧 Sending Live Email to: ${job.recipientEmail} via ${stage.sequence.channel.provider}`);
      
      const channel = stage.sequence.channel;
      if (!channel || channel.provider !== 'gmail') {
        throw new Error("Only Gmail channels are currently supported for sequences.");
      }

      const account = await this.store.getOAuthAccountById(channel.oauthAccountId);
      if (!account) {
        throw new Error("OAuth account missing for this channel.");
      }

      const refreshed = await this.authService.refreshIfNeeded(account);

      await this.mailService.sendGmail({
        accessToken: refreshed.access_token,
        from: channel.emailAddress,
        to: [job.recipientEmail],
        subject: stage.subject || "No Subject",
        bodyHtml: stage.bodyHtml || ""
      });

      console.log(`[SequenceWorker] ✅ Email successfully sent via Gmail API!`);

      // Mark Job Completed
      await this.store.prisma.sequencejob.update({
        where: { id: job.id },
        data: { status: "completed" }
      });

      // Find next stage
      const nextStage = await this.store.prisma.sequencestage.findFirst({
        where: { 
          sequenceId: job.sequenceId,
          orderIndex: { gt: stage.orderIndex }
        },
        orderBy: { orderIndex: "asc" }
      });

      if (nextStage) {
        // Schedule next stage
        // In reality, this might be +3 days. Here we'll schedule it for 1 minute from now for testing purposes.
        const nextDate = new Date();
        nextDate.setMinutes(nextDate.getMinutes() + 1);

        await this.store.prisma.sequencejob.create({
          data: {
            id: crypto.randomUUID(),
            sequenceId: job.sequenceId,
            recipientEmail: job.recipientEmail,
            stageId: nextStage.id,
            scheduledFor: nextStage.sendDate ? new Date(nextStage.sendDate) : nextDate,
            status: "queued"
          }
        });

        // Update recipient
        await this.store.prisma.sequencerecipient.update({
          where: { id: recipient.id },
          data: { 
            currentStageId: nextStage.id,
            lastProcessedAt: new Date()
          }
        });
      } else {
        // No more stages, sequence completed for this user
        await this.store.prisma.sequencerecipient.update({
          where: { id: recipient.id },
          data: { 
            status: "completed",
            lastProcessedAt: new Date()
          }
        });
        console.log(`[SequenceWorker] Sequence completed for ${job.recipientEmail}`);
      }

    } catch (error) {
      console.error(`[SequenceWorker] Job failed: ${error.message}`);
      await this.store.prisma.sequencejob.update({
        where: { id: job.id },
        data: { status: "failed", error: error.message }
      });
    }
  }
}

module.exports = { SequenceWorker };
