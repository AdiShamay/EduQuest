const request = require('supertest');

const app = require('../src/app');

describe('Health endpoint', () => {
  it('returns a healthy status response', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
