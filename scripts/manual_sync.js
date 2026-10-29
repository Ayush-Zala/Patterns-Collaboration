const { DatabaseStore } = require('./src/data/databaseStore');
const { ThreadService } = require('./src/services/threadService');
const { EmailSyncService } = require('./src/services/emailSyncService');
const { AuthService } = require('./src/services/authService');
const { MailService } = require('./src/services/mailService');

async function main() {
  const store = new DatabaseStore();
  await store.init({ seed: false });

  const authService = new AuthService({ store });
  const mailService = new MailService();
  const threadService = new ThreadService({ store, authService, mailService, realtime: { broadcastNewMessage: () => {}, broadcastThreadUpdated: () => {} }, draftLockManager: {} });
  const emailSyncService = new EmailSyncService({ threadService, store, authService });

  console.log('Triggering manual pull for channel c40ac7bd-8137-4e09-8506-0c5fa851430c...');
  const result = await emailSyncService.pullChannelNow({
    channelId: 'c40ac7bd-8137-4e09-8506-0c5fa851430c',
    actorId: 'u-admin-1'
  });
  console.log(JSON.stringify(result, null, 2));

  await store.close();
}

main().catch(console.error);
