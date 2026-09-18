const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');
const { connectDB } = require('../src/config/database');

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Authentication endpoints', () => {
  it('registers a parent and returns a JWT without exposing the password', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: 'parent-one',
      password: 'secret-password',
      role: 'parent',
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual(
      expect.objectContaining({ username: 'parent-one', role: 'parent' })
    );
    expect(response.body.user.password).toBeUndefined();
    expect(jwt.verify(response.body.token, process.env.JWT_SECRET)).toEqual(
      expect.objectContaining({ role: 'parent' })
    );

    const savedUser = await User.findOne({ username: 'parent-one' }).select('+password');
    expect(savedUser.password).not.toBe('secret-password');
    expect(await bcrypt.compare('secret-password', savedUser.password)).toBe(true);
  });

  it('logs in with valid credentials and rejects invalid credentials', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'parent-two',
      password: 'secret-password',
      role: 'parent',
    });

    const login = await request(app).post('/api/auth/login').send({
      username: 'parent-two',
      password: 'secret-password',
    });
    const invalidLogin = await request(app).post('/api/auth/login').send({
      username: 'parent-two',
      password: 'wrong-password',
    });

    expect(login.status).toBe(200);
    expect(login.body.user.password).toBeUndefined();
    expect(invalidLogin.status).toBe(401);
  });

  it('allows an authenticated parent to create a linked child', async () => {
    const parentResponse = await request(app).post('/api/auth/register').send({
      username: 'parent-three',
      password: 'secret-password',
      role: 'parent',
    });

    const childResponse = await request(app)
      .post('/api/auth/create-child')
      .set('Authorization', `Bearer ${parentResponse.body.token}`)
      .send({ username: 'child-one', password: 'child-password' });

    expect(childResponse.status).toBe(201);
    expect(childResponse.body.user.role).toBe('child');
    expect(childResponse.body.user.parentId).toBe(parentResponse.body.user.id);
  });

  it('rejects unauthenticated and child-role attempts to create children', async () => {
    const unauthenticated = await request(app)
      .post('/api/auth/create-child')
      .send({ username: 'child-two', password: 'child-password' });

    const parentResponse = await request(app).post('/api/auth/register').send({
      username: 'parent-four',
      password: 'secret-password',
      role: 'parent',
    });
    const childResponse = await request(app)
      .post('/api/auth/create-child')
      .set('Authorization', `Bearer ${parentResponse.body.token}`)
      .send({ username: 'child-three', password: 'child-password' });
    const childLogin = await request(app).post('/api/auth/login').send({
      username: 'child-three',
      password: 'child-password',
    });
    const childAttempt = await request(app)
      .post('/api/auth/create-child')
      .set('Authorization', `Bearer ${childLogin.body.token}`)
      .send({ username: 'child-four', password: 'child-password' });

    expect(unauthenticated.status).toBe(401);
    expect(childAttempt.status).toBe(403);
  });
});
