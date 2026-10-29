const { DatabaseStore } = require('./src/data/databaseStore');
const { ThreadService } = require('./src/services/threadService');
const { AuthService } = require('./src/services/authService');
const { MailService } = require('./src/services/mailService');
const { GmailAdapter } = require('./src/services/providers/GmailAdapter');

async function main() {
  const store = new DatabaseStore();
  await store.init({ seed: false });

  const authService = new AuthService({ store });
  const mailService = new MailService();
  const threadService = new ThreadService({ store, authService, mailService, realtime: { broadcastNewMessage: () => {}, broadcastThreadUpdated: () => {} }, draftLockManager: {} });
  
  const gmailAdapter = new GmailAdapter(authService, store, threadService);
  
  const channel = await store.getChannel('c40ac7bd-8137-4e09-8506-0c5fa851430c');
  const account = await store.prisma.oauthaccount.findUnique({
    where: { provider_email: { provider: 'gmail', email: 'achaltrivedi1235@gmail.com' } }
  });
  
  console.log('Sending watch request to Google for ' + channel.emailAddress + '...');
  const result = await gmailAdapter.setupWatch(channel, account);
  console.log(JSON.stringify(result, null, 2));

  await store.close();
}

main().catch(console.error);
