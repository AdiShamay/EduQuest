const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');
const { connectDB } = require('../src/config/database');

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
  jest.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

async function createChildSession() {
  const parent = await request(app).post('/api/auth/register').send({
    username: `parent-${Date.now()}-${Math.random()}`,
    password: 'secret-password',
    role: 'parent',
  });
  const child = await request(app)
    .post('/api/auth/create-child')
    .set('Authorization', `Bearer ${parent.body.token}`)
    .send({ username: `child-${Date.now()}-${Math.random()}`, password: 'child-password' });
  const login = await request(app).post('/api/auth/login').send({
    username: child.body.user.username,
    password: 'child-password',
  });
  return login.body.token;
}

describe('Unsplash image endpoint', () => {
  it('returns a keyword-based image URL for an authenticated child', async () => {
    const token = await createChildSession();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ urls: { regular: 'https://images.unsplash.com/quest-cavern' } }),
    });

    const response = await request(app)
      .get('/api/images/cavern')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ imageUrl: 'https://images.unsplash.com/quest-cavern' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('query=cavern'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Client-ID test-unsplash-key' }) })
    );
  });

  it('returns a friendly fallback when Unsplash is unavailable and rejects parents', async () => {
    const token = await createChildSession();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const fallback = await request(app)
      .get('/api/images/tower')
      .set('Authorization', `Bearer ${token}`);
    const parent = await request(app).post('/api/auth/register').send({
      username: `parent-only-${Date.now()}`,
      password: 'secret-password',
      role: 'parent',
    });
    const parentAttempt = await request(app)
      .get('/api/images/tower')
      .set('Authorization', `Bearer ${parent.body.token}`);

    expect(fallback.status).toBe(200);
    expect(fallback.body.imageUrl).toContain('images.unsplash.com');
    expect(parentAttempt.status).toBe(403);
  });
});