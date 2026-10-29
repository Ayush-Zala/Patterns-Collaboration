const request = require('supertest');
const { createTestApp } = require('../createTestApp');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

let app;
let prisma;
let testOrgId;
let testChannelId;
let testInboxId;
let testThreadId;

beforeAll(async () => {
  app = await createTestApp();
  prisma = new PrismaClient();
  
  testOrgId = 'test-org-threads-1';
  testChannelId = 'test-channel-threads-1';
  testInboxId = 'test-inbox-threads-1';
  
  await prisma.authorganization.upsert({
    where: { id: testOrgId },
    update: {},
    create: {
      id: testOrgId,
      name: 'Test Org Threads',
      slug: 'test-org-threads-1',
      createdAt: new Date()
    }
  });

  await prisma.oauthaccount.upsert({
    where: { id: 'test-oauth-1' },
    update: {},
    create: {
      id: 'test-oauth-1',
      provider: 'google',
      accessToken: 'test-token',
      userId: 'u-admin-1',
      email: `test-${crypto.randomBytes(4).toString("hex")}@example.com`,
      expiresAt: new Date(Date.now() + 3600000),
      updatedAt: new Date(),
    }
  });

  await prisma.channel.upsert({
    where: { id: testChannelId },
    update: {},
    create: {
      id: testChannelId,
      name: 'Test Channel',
      emailAddress: `test-${crypto.randomBytes(4).toString("hex")}@example.com`,
      provider: 'google',
      oauthAccountId: 'test-oauth-1',
      scopeId: testOrgId,
      scopeType: 'company',
      createdAt: new Date()
    }
  });

  await prisma.inbox.upsert({
    where: { id: testInboxId },
    update: {},
    create: {
      id: testInboxId,
      name: 'Test Inbox',
      scopeId: testOrgId,
      scopeType: 'company',
      createdAt: new Date()
    }
  });

  await prisma.inboxchannel.upsert({
    where: { inboxId_channelId: { inboxId: testInboxId, channelId: testChannelId } },
    update: {},
    create: {
      id: crypto.randomUUID(),
      inboxId: testInboxId,
      channelId: testChannelId,
    }
  });
});

afterAll(async () => {
  if (testOrgId) {
    try {
      await prisma.analyticsmetric.deleteMany({ where: { orgId: testOrgId } });
      await prisma.inboxchannel.deleteMany({ where: { inboxId: testInboxId } });
      await prisma.inbox.deleteMany({ where: { id: testInboxId } });
      await prisma.thread.deleteMany({ where: { channelId: testChannelId } });
      await prisma.channel.deleteMany({ where: { id: testChannelId } });
      await prisma.oauthaccount.deleteMany({ where: { id: 'test-oauth-1' } });
      await prisma.authorganization.deleteMany({ where: { id: testOrgId } });
    } catch (err) {
      console.warn("Cleanup failed:", err.message);
    }
  }
  await prisma.$disconnect();
});

describe('Threads and Analytics API', () => {
  it('should create a thread and emit analytics', async () => {
    // Get the email we created
    const channel = await prisma.channel.findUnique({ where: { id: testChannelId } });
    
    // 1. Create a thread
    const response = await request(app)
      .post('/threads')
      .set('x-org-id', testOrgId)
      .set('x-user-id', 'u-admin-1')
      .set('x-user-role', 'admin')
      .send({
        from: channel.emailAddress,
        to: ['customer@example.com'],
        subject: 'Help with my account',
        body_text: 'I cannot login.'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('thread');
    testThreadId = response.body.thread.id;

    // 2. Wait a small tick for the async event bus
    await new Promise(r => setTimeout(r, 200));

    // 3. Fetch analytics snapshot
    const analyticsResponse = await request(app)
      .get(`/analytics-v2/summary?orgId=${testOrgId}`)
      .set('x-org-id', testOrgId)
      .set('x-user-id', 'u-admin-1')
      .set('x-user-role', 'admin');

    expect(analyticsResponse.status).toBe(200);
    const data = analyticsResponse.body.data;
    
    // Validate that workload re-counted the 1 thread!
    expect(data.workload.new_conversations).toBe(1);
    expect(data.workload.open_conversations).toBe(1);
    expect(data.workload.unassigned_conversations).toBe(1);
    expect(data.workload.assigned_conversations).toBe(0);
    expect(data.workload.backlog).toBe(1);
  });
});
