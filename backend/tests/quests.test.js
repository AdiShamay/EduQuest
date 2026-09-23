const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');
const Quest = require('../src/models/Quest');
const { connectDB } = require('../src/config/database');

let mongoServer;

function fantasyNarrativeParts() {
  return [
    { story: 'A silver gate rises beneath the moonlit keep.', imageKeyword: 'gate' },
    { story: 'The hero crosses a misty bridge guarded by ancient runes.', imageKeyword: 'bridge' },
    { story: 'A dark forest opens around the path with whispering leaves.', imageKeyword: 'forest' },
    { story: 'The final tower glows beyond a field of fallen stars.', imageKeyword: 'tower' },
    { story: 'At dawn, the restored realm welcomes its victorious champion.', imageKeyword: 'dawn' },
  ];
}

function mockBatchExternalResponses() {
  const geminiResponse = {
    candidates: [{ content: { parts: [{ text: JSON.stringify(fantasyNarrativeParts()) }] } }],
  };

  return jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
    if (url.includes('api.datamuse.com')) {
      const word = new URL(url).searchParams.get('sp');
      return {
        ok: true,
        json: async () => [{ defs: [`n\tA dictionary definition for ${word}.`] }],
      };
    }

    if (url.includes('generativelanguage.googleapis.com')) {
      return { ok: true, json: async () => geminiResponse };
    }

    throw new Error(`Unexpected external request: ${url}`);
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
  it('starts a five-question child quest with one batched Gemini narrative request', async () => {
    const child = await createChild();
    const fetchMock = mockBatchExternalResponses();

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
    expect(quest.questions.map((question) => question.story)).toEqual(
      fantasyNarrativeParts().map((part) => part.story)
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash'),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('responseMimeType') })
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
    const fetchMock = mockBatchExternalResponses();

    const start = await request(app)
      .post('/api/quests/start')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ subject: 'Math', difficulty: 'Medium' });
    const startedQuest = await Quest.findById(start.body.quest.id);
    const externalCallCountAfterStart = fetchMock.mock.calls.length;
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
    expect(answer.body.nextQuestion.prompt).toBe(startedQuest.questions[1].narrativePrompt);
    expect(answer.body.nextQuestion.imageKeyword).toBe('bridge');
    expect(quest.questions[0].userAnswer).toBe('__wrong_answer__');
    expect(quest.questions[0].passed).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(externalCallCountAfterStart);
  });

  it('progresses normally after a correct answer', async () => {
    const child = await createChild();
    const fetchMock = mockBatchExternalResponses();

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
    expect(fetchMock).toHaveBeenCalledTimes(21);
  });

  it('completes on the fifth answer and rejects a sixth answer', async () => {
    const child = await createChild();
    const fetchMock = mockBatchExternalResponses();

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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
