const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');
const Quest = require('../src/models/Quest');
const { connectDB } = require('../src/config/database');

let mongoServer;

async function createParent(username) {
  return request(app).post('/api/auth/register').send({
    username,
    password: 'secret-password',
    role: 'parent',
  });
}

async function createChild(parentToken, username) {
  return request(app)
    .post('/api/auth/create-child')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ username, password: 'child-password' });
}

function questFor(childId, overrides = {}) {
  return {
    childId,
    subject: 'Math',
    difficulty: 'Easy',
    questions: Array.from({ length: 5 }, (_, index) => ({
      narrativePrompt: `Question ${index + 1}`,
      userAnswer: index < 4 ? 'correct' : 'pending',
      correctAnswer: 'correct',
      passed: index < 4,
      explanation: 'The answer follows the challenge clues.',
    })),
    answeredQuestions: 4,
    currentQuestionIndex: 3,
    completed: true,
    ...overrides,
  };
}

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
});

afterEach(async () => {
  await Quest.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Parent dashboard endpoints', () => {
  it('lists only the authenticated parent\'s linked children', async () => {
    const parent = await createParent(`parent-${Date.now()}-one`);
    const otherParent = await createParent(`parent-${Date.now()}-two`);
    await createChild(parent.body.token, `child-${Date.now()}-one`);
    await createChild(otherParent.body.token, `child-${Date.now()}-two`);

    const response = await request(app)
      .get('/api/auth/children')
      .set('Authorization', `Bearer ${parent.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.children).toHaveLength(1);
    expect(response.body.children[0]).toEqual(
      expect.objectContaining({ username: expect.stringContaining('child-') })
    );
  });

  it('returns child-scoped metrics, advanced chart data, and paginated history', async () => {
    const parent = await createParent(`parent-${Date.now()}-analytics`);
    const child = await createChild(parent.body.token, `child-${Date.now()}-analytics`);
    await Quest.create(questFor(child.body.user.id, { createdAt: daysAgo(1) }));
    await Quest.create(questFor(child.body.user.id, {
      subject: 'English',
      difficulty: 'Hard',
      createdAt: daysAgo(2),
      answeredQuestions: 5,
      currentQuestionIndex: 4,
      questions: Array.from({ length: 5 }, (_, index) => ({
        narrativePrompt: `English question ${index + 1}`,
        userAnswer: index === 0 ? 'wrong' : 'correct',
        correctAnswer: 'correct',
        passed: index !== 0,
        explanation: 'The answer follows the challenge clues.',
      })),
    }));
    await Quest.create(questFor(child.body.user.id, { difficulty: 'Medium', createdAt: daysAgo(40) }));

    const response = await request(app)
      .get(`/api/quests/analytics/${child.body.user.id}?page=1&limit=2`)
      .set('Authorization', `Bearer ${parent.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.metrics).toEqual({
      totalQuests: 3,
      overallAccuracy: 92,
      favoriteDifficulty: 'Easy',
    });
    expect(response.body.performanceTrend).toEqual(expect.any(Array));
    expect(response.body.activityVolume).toEqual(expect.any(Array));
    expect(response.body.difficultyDistribution).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Easy' }),
      expect.objectContaining({ name: 'Hard' }),
      expect.objectContaining({ name: 'Medium' }),
    ]));
    expect(response.body.history).toHaveLength(2);
    expect(response.body.hasMore).toBe(true);
    expect(response.body.totalHistory).toBe(3);
  });

  it('rejects child-role users and parents requesting unrelated child data', async () => {
    const parent = await createParent(`parent-${Date.now()}-owner`);
    const otherParent = await createParent(`parent-${Date.now()}-other`);
    const child = await createChild(parent.body.token, `child-${Date.now()}-owned`);
    const otherChild = await createChild(otherParent.body.token, `child-${Date.now()}-private`);
    const childLogin = await request(app).post('/api/auth/login').send({
      username: child.body.user.username,
      password: 'child-password',
    });

    const childAttempt = await request(app)
      .get('/api/auth/children')
      .set('Authorization', `Bearer ${childLogin.body.token}`);
    const unrelatedAttempt = await request(app)
      .get(`/api/quests/analytics/${otherChild.body.user.id}`)
      .set('Authorization', `Bearer ${parent.body.token}`);

    expect(childAttempt.status).toBe(403);
    expect(unrelatedAttempt.status).toBe(403);
  });
});