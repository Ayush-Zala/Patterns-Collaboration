const { DatabaseStore } = require("./src/data/databaseStore");
const { AuthService } = require("./src/services/authService");
const { MailService } = require("./src/services/mailService");
const { ThreadService } = require("./src/services/threadService");

async function test() {
  const store = new DatabaseStore();
  const authService = new AuthService({ store });
  const mailService = new MailService();
  const threadService = new ThreadService({ store, draftLockManager: {}, realtime: { broadcastNewMessage:()=>{}, broadcastThreadUpdated:()=>{} }, authService, mailService });

  try {
    const inboxes = await store.listInboxes();
    if (!inboxes.length) return console.log("No inboxes");
    const channels = await store.listInboxChannels(inboxes[0].id);
    if (!channels.length) return console.log("No channels");
    
    const channel = channels[0];
    console.log("Using channel:", channel.email_address);

    const result = await threadService.createThread({
      userId: "u-admin-1",
      from: channel.email_address,
      to: ["test@example.com"],
      cc: [],
      subject: "Test email sending",
      bodyText: "Does this work?",
      bodyHtml: "",
      attachments: []
    });
    console.log("Success:", result.thread.id);
  } catch(e) {
    console.error("Test failed:", e);
  } finally {
    await store.close();
  }
}
test();
