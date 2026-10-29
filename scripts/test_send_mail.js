const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    await prisma.message.create({
      data: {
        id: "test1",
        threadId: "invalid",
        channelId: "invalid",
        fromEmail: "test",
        toRecipients: "[]",
        ccRecipients: "[]",
        bodyText: "",
        bodyHtml: "",
        attachments: "[]",
        receivedAt: new Date(),
        direction: "outbound",
        inReplyTo: "abc",
      }
    });
  } catch(e) {
    console.error(e.message);
  }
}
test();
