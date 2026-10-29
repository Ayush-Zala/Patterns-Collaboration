const { DatabaseStore } = require("./src/data/databaseStore");
const { ThreadService } = require("./src/services/threadService");
const { AuthService } = require("./src/services/authService");

// mock mailService
const mailService = {
  sendGmail: async () => ({ provider_message_id: "msg_123", provider_thread_id: "thr_123" })
};

const realtime = {
  broadcastNewMessage: () => {},
  broadcastThreadUpdated: () => {},
};

async function test() {
  const store = new DatabaseStore();
  const authService = new AuthService({ store });
  
  // Create a ThreadService
  const threadService = new ThreadService({ store, realtime, authService, mailService, draftLockManager: {} });

  try {
    // First we need a real channel ID
    const inboxes = await store.listInboxes();
    const channels = await store.listInboxChannels(inboxes[0].id);
    if (!channels.length) {
      console.log("No channels found to test.");
      return;
    }
    const channel = channels[0];

    // Mock auth refresh to not fail
    authService.refreshIfNeeded = async () => ({ access_token: "fake" });
    
    // We mock getChannelByEmail to return the channel we found
    store.getChannelByEmail = async () => channel;
    
    const result = await threadService.createThread({
      userId: "u-admin-1",
      from: channel.email_address,
      to: ["test@example.com"],
      cc: [],
      subject: "Test Send Mail Fix",
      bodyText: "This is a test body",
      bodyHtml: "",
      attachments: []
    });

    console.log("Success! Thread created:", result.thread.id);
  } catch(e) {
    console.error("Test failed:", e);
  } finally {
    await store.close();
  }
}
test();
