module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
};
