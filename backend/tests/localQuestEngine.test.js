const openrouter = require('../src/services/openrouter');
const {
  generateChallenge,
  generateEnglishQuestion,
  generateMathQuestion,
} = require('../src/services/questEngine');

describe('Local educational question engine', () => {
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
      json: async () => [{ meanings: [{ definitions: [{ definition: 'A brave act.' }] }] }],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const question = await generateEnglishQuestion('Easy');

    expect(question.type).toBe('english');
    expect(question.options).toHaveLength(4);
    expect(question.options).toContain(question.correctAnswer);
    expect(question.prompt).toContain('definition');
    expect(dictionaryFetch).toHaveBeenCalledWith(expect.stringContaining('https://api.dictionaryapi.dev/api/v2/entries/en/'));
  });

  it('combines a local question with a narrative-only OpenRouter response', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    jest.spyOn(openrouter, 'callOpenRouter').mockResolvedValue({
      success: true,
      message: JSON.stringify({ story: 'A silver gate rises.', imageKeyword: 'gate' }),
    });

    const challenge = await generateChallenge({ subject: 'Math', difficulty: 'Easy' });

    expect(challenge.question.type).toBe('math');
    expect(challenge.question.correctAnswer).toBe('2');
    expect(challenge.story).toBe('A silver gate rises.');
    expect(challenge.imageKeyword).toBe('gate');
  });
});