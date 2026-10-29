function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

class MailService {
  /**
   * Constructs a raw RFC 2822 email message.
   */
  buildRawEmail({ from, to, cc, subject, bodyText, inReplyTo, references }) {
    const lines = [];
    
    // Basic headers
    lines.push(`From: ${from}`);
    
    const toList = Array.isArray(to) ? to : (to ? [to] : []);
    if (toList.length > 0) {
      lines.push(`To: ${toList.join(", ")}`);
    }

    const ccList = Array.isArray(cc) ? cc : (cc ? [cc] : []);
    if (ccList.length > 0) {
      lines.push(`Cc: ${ccList.join(", ")}`);
    }

    lines.push(`Subject: ${subject}`);
    lines.push(`Date: ${new Date().toUTCString()}`);
    lines.push(`Message-ID: <${Date.now()}.${Math.random().toString(36).substring(2)}@patterns-shared-inbox>`);
    
    if (inReplyTo) {
      lines.push(`In-Reply-To: ${inReplyTo}`);
    }
    if (references) {
      lines.push(`References: ${references}`);
    }

    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("MIME-Version: 1.0");
    lines.push("");
    lines.push(bodyText);

    return lines.join("\r\n");
  }

  async sendGmail({ accessToken, from, to, cc, subject, bodyText, inReplyTo, references, threadId }) {
    const rawEmail = this.buildRawEmail({ from, to, cc, subject, bodyText, inReplyTo, references });
    console.log(`[MailService] Prepared Raw Email:\n${rawEmail}`);
    const encodedEmail = encodeBase64Url(rawEmail);

    const payload = {
      raw: encodedEmail,
    };
    
    if (threadId) {
      payload.threadId = threadId;
    }

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[MailService] Gmail Send Error:", data);
      throw new Error(data.error?.message || "Failed to send email via Gmail.");
    }

    return {
      provider_message_id: data.id,
      provider_thread_id: data.threadId,
    };
  }

  async sendMail({ provider, accessToken, ...params }) {
    if (provider === "gmail") {
      return this.sendGmail({ accessToken, ...params });
    }
    
    throw new Error(`Outbound sending not yet implemented for provider: ${provider}`);
  }
}

module.exports = { MailService };
