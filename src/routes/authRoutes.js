const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function buildAuthRoutes({ authService, mailService, store }) {
  const router = express.Router();

  router.post("/google", asyncHandler(async (req, res) => {
    const redirectUri = req.body.redirect_uri;
    try {
      const data = authService.startOAuth({ provider: "gmail", redirectUri: redirectUri });
      res.status(200).json(data);
    } catch (error) {
      res.status(400).json({ error: error.message || "Unable to start Google OAuth." });
    }
  }));

  router.post("/microsoft", asyncHandler(async (req, res) => {
    const redirectUri = req.body.redirect_uri;
    try {
      const data = authService.startOAuth({ provider: "outlook", redirectUri: redirectUri });
      res.status(200).json(data);
    } catch (error) {
      res.status(400).json({ error: error.message || "Unable to start Microsoft OAuth." });
    }
  }));

  router.post("/callback", asyncHandler(async (req, res) => {
    const { provider, email, code, state, redirect_uri: redirectUri } = req.body;
    if (!provider) {
      return res.status(400).json({ error: "provider is required" });
    }
    if (!code) {
      return res.status(400).json({ error: "code is required" });
    }
    if (provider !== "gmail" && !email) {
      return res.status(400).json({ error: "email is required for non-Gmail providers" });
    }

    console.log(`[AuthRoutes] Received callback for provider: ${provider}, state: ${state}`);
    try {
      const account = await authService.completeOAuth({
        provider,
        email,
        code,
        state,
        redirectUri,
        userId: req.auth?.user_id || null,
      });
      console.log(`[AuthRoutes] Callback successful for email: ${account.email}`);
      return res.status(201).json({ account });
    } catch (err) {
      console.error(`[AuthRoutes] Callback error:`, err);
      return res.status(err.message?.includes("state") ? 400 : 500).json({ 
        error: err.message || "Failed to complete OAuth callback" 
      });
    }
  }));

  router.post("/send-invite", asyncHandler(async (req, res) => {
    const { email, inviteLink } = req.body;
    console.log(`[AuthRoutes] Received send-invite request for: ${email}`);
    
    if (!email || !inviteLink) {
      console.warn("[AuthRoutes] Missing email or inviteLink in request");
      return res.status(400).json({ error: "email and inviteLink are required" });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("[AuthRoutes] Missing RESEND_API_KEY in .env");
      return res.status(500).json({ error: "Email provider is not configured." });
    }

    const { Resend } = require("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = "You're invited to join Patterns Inbox";
    const bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hello!</h2>
        <p>You have been invited to join the team on Patterns Inbox.</p>
        <p>Patterns Inbox is a shared communication workspace designed to help teams collaborate on emails and customer interactions seamlessly.</p>
        <p>To accept your invitation and join the organization, please click the link below:</p>
        <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0;">Join Patterns Inbox</a>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>
        <p>Welcome to the team!</p>
        <p>Best regards,<br>The Patterns Team</p>
      </div>
    `;

    try {
      console.log(`[AuthRoutes] Dispatching email via Resend to ${email}...`);
      
      const { data, error } = await resend.emails.send({
        from: "Patterns Inbox <onboarding@resend.dev>", // Note: Replace with your verified domain for production
        to: [email],
        subject,
        html: bodyHtml
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`[AuthRoutes] Invitation email sent successfully to ${email}. ID:`, data.id);
      return res.status(200).json({ success: true, id: data.id });
    } catch (error) {
      console.error("[AuthRoutes] Failed to send invite email via Resend:", error);
      return res.status(500).json({ error: "Failed to send invitation email." });
    }
  }));

  return router;
}

module.exports = { buildAuthRoutes };
