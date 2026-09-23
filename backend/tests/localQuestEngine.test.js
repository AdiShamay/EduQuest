const { generateEducationalQuestion } = require('../src/services/questEngine');

describe('Local educational question engine', () => {
  afterEach(() => jest.restoreAllMocks());

  it('generates a typed Math question locally without asking an LLM', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const question = await generateEducationalQuestion('Math', 'Easy');

    expect(question.type).toBe('math');
    expect(question.prompt).toMatch(/\d+ [+\-x] \d+/);
    expect(question.correctAnswer).toBe('2');
    expect(question.options).toEqual([]);
  });

  it('builds an English question with options from the Datamuse dictionary definition', async () => {
    const dictionaryFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ defs: ['n\tA brave act.'] }],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const question = await generateEducationalQuestion('English', 'Easy');

    expect(question.type).toBe('english');
    expect(question.options.length).toBeGreaterThan(0);
    expect(question.options).toContain(question.correctAnswer);
    expect(dictionaryFetch).toHaveBeenCalledWith(expect.stringContaining('api.datamuse.com/words?sp='));
  });

  it('uses fallback text for definitions when the dictionary returns a 404', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => [],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const question = await generateEducationalQuestion('English', 'Easy');
    
    expect(question.type).toBe('english');
    expect(question.correctAnswer).toMatch(/^The meaning of the word/);
  });

  it('uses fallback text for definitions when the dictionary returns Cloudflare HTML (522)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 522, json: async () => [] });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const question = await generateEducationalQuestion('English', 'Medium');
    
    expect(question.type).toBe('english');
    expect(question.correctAnswer).toMatch(/^The meaning of the word/);
  });
});