const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');
const Quest = require('../src/models/Quest');
const { connectDB } = require('../src/config/database');

let mongoServer;

function narrativeResponse({ prompt, imageKeyword = 'cavern' }) {
  return { story: prompt, imageKeyword };
}

function mockExternalResponses(narratives) {
  let narrativeIndex = 0;
  return jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
    if (url.includes('api.datamuse.com')) {
      return { ok: true, json: async () => [{ defs: ['n\tA hidden word meaning.'] }] };
    }
    const narrative = narratives[Math.min(narrativeIndex, narratives.length - 1)];
    narrativeIndex += 1;
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(narrative) }] } }],
      }),
    };
  });
}

async function createChild() {
  const parent = await request(app).post('/api/auth/register').send({
    username: `parent-${Date.now()}-${Math.random()}`,
    password: 'secret-password',
    role: 'parent',
  });
  const child = await request(app)
    .post('/api/auth/create-child')
    .set('Authorization', `Bearer ${parent.body.token}`)
    .send({
      username: `child-${Date.now()}-${Math.random()}`,
      password: 'child-password',
    });
  const login = await request(app).post('/api/auth/login').send({
    username: child.body.user.username,
    password: 'child-password',
  });

  return { token: login.body.token, user: child.body.user };
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
});

afterEach(async () => {
  await Quest.deleteMany({});
  await User.deleteMany({});
  jest.restoreAllMocks();
});

afterAll(async () => {
  try {
    if (mongoServer) {
      await mongoServer.stop();
    }
  } finally {
    await mongoose.connection.close();
  }
});

describe('Quest engine endpoints', () => {
  it('starts a five-question child quest and asks Gemini for the narrative wrapper', async () => {
    const child = await createChild();
    const narrativeMock = mockExternalResponses([
      narrativeResponse({
        prompt: 'A rune glows beside the gate.',
      })
    ]);

    const response = await request(app)
      .post('/api/quests/start')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ subject: 'Math', difficulty: 'Easy' });
    const quest = await Quest.findById(response.body.quest.id);

    expect(response.status).toBe(201);
    expect(response.body.progress).toEqual({ current: 1, total: 5 });
    expect(response.body.question.prompt).toMatch(/^Solve:/);
    expect(response.body.question.correctAnswer).toBeUndefined();
    expect(quest.questions).toHaveLength(5);
    expect(quest.subject).toBe('Math');
    expect(quest.difficulty).toBe('Easy');
    expect(narrativeMock).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('rejects invalid quest setup and non-child access', async () => {
    const child = await createChild();
    const parent = await request(app).post('/api/auth/register').send({
      username: `parent-only-${Date.now()}`,
      password: 'secret-password',
      role: 'parent',
    });

    const invalidSubject = await request(app)
      .post('/api/quests/start')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ subject: 'Science', difficulty: 'Easy' });
    const parentAttempt = await request(app)
      .post('/api/quests/start')
      .set('Authorization', `Bearer ${parent.body.token}`)
      .send({ subject: 'Math', difficulty: 'Easy' });

    expect(invalidSubject.status).toBe(400);
    expect(parentAttempt.status).toBe(403);
  });

  it('returns educational correction and generates a recovery challenge after an incorrect answer', async () => {
    const child = await createChild();
    mockExternalResponses([
      narrativeResponse({ prompt: 'Solve the ward: 5 x 4.' }),
      narrativeResponse({
        prompt: 'The ward snaps shut. Escape by solving 3 + 2.',
        imageKeyword: 'trap',
      }),
    ]);

    const start = await request(app)
      .post('/api/quests/start')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ subject: 'Math', difficulty: 'Medium' });
    const startedQuest = await Quest.findById(start.body.quest.id);
    const answer = await request(app)
      .post('/api/quests/answer')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ questId: start.body.quest.id, answer: '__wrong_answer__' });
    const quest = await Quest.findById(start.body.quest.id);

    expect(answer.status).toBe(200);
    expect(answer.body.isCorrect).toBe(false);
    expect(answer.body.feedback).toEqual(
      expect.objectContaining({ correctAnswer: startedQuest.questions[0].correctAnswer, explanation: startedQuest.questions[0].explanation })
    );
    expect(answer.body.branch).toBe('setback');
    expect(answer.body.nextQuestion.prompt).toMatch(/^Solve:/);
    expect(answer.body.nextQuestion.imageKeyword).toBe('trap');
    expect(quest.questions[0].userAnswer).toBe('__wrong_answer__');
    expect(quest.questions[0].passed).toBe(false);
    expect(quest.questions[1].isRecovery).toBe(true);
  });

  it('progresses normally after a correct answer', async () => {
    const child = await createChild();
    mockExternalResponses([
      narrativeResponse({ prompt: 'Name the hidden key.' }),
      narrativeResponse({ prompt: 'The path opens.' }),
    ]);

    const start = await request(app)
      .post('/api/quests/start')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ subject: 'English', difficulty: 'Hard' });
    const startedQuest = await Quest.findById(start.body.quest.id);
    const answer = await request(app)
      .post('/api/quests/answer')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ questId: start.body.quest.id, answer: startedQuest.questions[0].correctAnswer });

    expect(answer.status).toBe(200);
    expect(answer.body.isCorrect).toBe(true);
    expect(answer.body.branch).toBe('progress');
    expect(answer.body.feedback).toBeUndefined();
    expect(answer.body.nextQuestion.type).toBe('english');
    expect(answer.body.nextQuestion.options).toHaveLength(4);
  });

  it('completes on the fifth answer and rejects a sixth answer', async () => {
    const child = await createChild();
    let generation = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url.includes('api.datamuse.com')) {
        return { ok: true, json: async () => [{ defs: ['n\tA valid answer.'] }] };
      }
      const current = generation;
      generation += 1;
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ story: `Challenge ${current}`, imageKeyword: 'cavern' }) }] } }],
        }),
      };
    });

    const start = await request(app)
      .post('/api/quests/start')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ subject: 'Math', difficulty: 'Easy' });
    let lastAnswer;

    for (let index = 0; index < 5; index += 1) {
      lastAnswer = await request(app)
        .post('/api/quests/answer')
        .set('Authorization', `Bearer ${child.token}`)
        .send({ questId: start.body.quest.id, answer: `answer-${index}` });
    }

    const extraAnswer = await request(app)
      .post('/api/quests/answer')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ questId: start.body.quest.id, answer: 'answer-5' });

    expect(lastAnswer.body.completed).toBe(true);
    expect(lastAnswer.body.progress).toEqual({ current: 5, total: 5 });
    expect(extraAnswer.status).toBe(409);
    expect(generation).toBe(5);
  });
});
