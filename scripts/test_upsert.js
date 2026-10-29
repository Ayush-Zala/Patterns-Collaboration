const { DatabaseStore } = require("./src/data/databaseStore");
const crypto = require("crypto");

async function test() {
  const store = new DatabaseStore();
  try {
    const input = {
      channel_id: "c-sales-1",
      thread_key: "test_thread_" + Date.now(),
      subject: "Test Subject",
      from: "sales@patterns.example.com",
      to: ["customer@example.com"],
      cc: [],
      body_text: "Test Body",
      body_html: "",
      attachments: [],
      participants: ["sales@patterns.example.com", "customer@example.com"],
      provider_message_id: "msg_" + Date.now(),
      received_at: new Date().toISOString(),
      direction: "outbound",
      created_by: "u-sales-1",
    };

    const result = await store.upsertSyncedMessage(input);
    console.log("Success:", result.thread.id);
  } catch (e) {
    console.error("Store Error:", e);
  } finally {
    await store.close();
  }
}
test();
