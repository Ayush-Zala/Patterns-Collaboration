const request = require('supertest');
const { createTestApp } = require('../createTestApp');
const { PrismaClient } = require('@prisma/client');

let app;
let prisma;
let testOrgId;
let testWorkspaceId;

beforeAll(async () => {
  app = await createTestApp();
  prisma = new PrismaClient();
  
  // Create or update a test organization
  const org = await prisma.authorganization.upsert({
    where: { id: 'test-org-workspaces-1' },
    update: {},
    create: {
      id: 'test-org-workspaces-1',
      name: 'Test Org Workspaces',
      slug: 'test-org-workspaces-1',
      createdAt: new Date()
    }
  });
  testOrgId = org.id;
});

afterAll(async () => {
  // Cleanup
  if (testOrgId) {
    try {
      await prisma.workspace.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.authorganization.delete({ where: { id: testOrgId } });
    } catch (err) {
      console.warn("Cleanup failed:", err.message);
    }
  }
});

describe('Workspaces API', () => {
  it('should create a workspace', async () => {
    const response = await request(app)
      .post('/workspaces')
      .set('x-org-id', testOrgId)
      .set('x-user-id', 'u-admin-1')
      .set('x-user-role', 'admin')
      .send({
        name: 'Test Workspace',
        color: '#ff0000'
      });
      
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('workspace');
    expect(response.body.workspace.name).toBe('Test Workspace');
    
    testWorkspaceId = response.body.workspace.id;
  });

  it('should list workspaces', async () => {
    const response = await request(app)
      .get('/workspaces')
      .set('x-org-id', testOrgId)
      .set('x-user-id', 'u-admin-1')
      .set('x-user-role', 'admin');
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('workspaces');
    expect(Array.isArray(response.body.workspaces)).toBe(true);
    const ws = response.body.workspaces.find(w => w.id === testWorkspaceId);
    expect(ws).toBeDefined();
    expect(ws.name).toBe('Test Workspace');
  });

  it('should update a workspace', async () => {
    const response = await request(app)
      .put(`/workspaces/${testWorkspaceId}`)
      .set('x-org-id', testOrgId)
      .set('x-user-id', 'u-admin-1')
      .set('x-user-role', 'admin')
      .send({
        name: 'Updated Workspace',
        color: '#00ff00'
      });
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('workspace');
    expect(response.body.workspace.name).toBe('Updated Workspace');
  });

  it('should delete a workspace', async () => {
    const response = await request(app)
      .delete(`/workspaces/${testWorkspaceId}`)
      .set('x-org-id', testOrgId)
      .set('x-user-id', 'u-admin-1')
      .set('x-user-role', 'admin');
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    
    // Verify it was deleted
    const getResponse = await request(app)
      .get('/workspaces')
      .set('x-org-id', testOrgId)
      .set('x-user-id', 'u-admin-1')
      .set('x-user-role', 'admin');
      
    const ws = getResponse.body.workspaces.find(w => w.id === testWorkspaceId);
    expect(ws).toBeUndefined();
  });
});
