const {
  generateChallenge,
  generateEnglishQuestion,
  generateMathQuestion,
  generateNarrative,
} = require('../src/services/questEngine');

describe('Local educational question engine', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => jest.restoreAllMocks());

  it('generates a typed Math question locally without asking OpenRouter for an answer', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const question = generateMathQuestion('Easy');

    expect(question.type).toBe('math');
    expect(question.prompt).toMatch(/\d+ [+-] \d+/);
    expect(question.correctAnswer).toBe('2');
    expect(question.options).toEqual([]);
  });

  it('builds an English question with four options from a dictionary definition', async () => {
    const dictionaryFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ defs: ['n\tA brave act.'] }],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const question = await generateEnglishQuestion('Easy');

    expect(question.type).toBe('english');
    expect(question.options).toHaveLength(4);
    expect(question.options).toContain(question.correctAnswer);
    expect(question.prompt).toContain('definition');
    expect(dictionaryFetch).toHaveBeenCalledWith(expect.stringContaining('https://api.datamuse.com/words?sp=brave'));
  });

  it('reports the dictionary error object when a word has no definition', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => [],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    await expect(generateEnglishQuestion('Easy')).rejects.toThrow('Definition not found');
  });

  it('uses the local question when the dictionary returns Cloudflare HTML', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 522, json: async () => [] });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    await expect(generateEnglishQuestion('Medium')).rejects.toThrow('Definition not found');
  });

  it('combines a local question with a narrative-only OpenRouter response', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ story: 'A silver gate rises.', imageKeyword: 'gate' }) }] } }] }),
    });

    const challenge = await generateChallenge({ subject: 'Math', difficulty: 'Easy' });

    expect(challenge.question.type).toBe('math');
    expect(challenge.question.correctAnswer).toBe('2');
    expect(challenge.story).toBe('A silver gate rises.');
    expect(challenge.imageKeyword).toBe('gate');
  });
});