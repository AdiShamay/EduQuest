const { generateStoryBatch } = require('../src/services/questEngine');

describe('Gemini direct REST narrative batch service', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => jest.restoreAllMocks());

  it('requests a batch of 5 stories and returns parsed JSON', async () => {
    const fakeStories = [
      { story: 'Part 1', imageKeyword: 'one' },
      { story: 'Part 2', imageKeyword: 'two' },
      { story: 'Part 3', imageKeyword: 'three' },
      { story: 'Part 4', imageKeyword: 'four' },
      { story: 'Part 5', imageKeyword: 'five' }
    ];
    
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(fakeStories) }] } }],
      }),
    });

    const narrative = await generateStoryBatch('Math', 'Easy');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key='),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('responseMimeType'),
      })
    );
    expect(narrative).toHaveLength(5);
    expect(narrative[0].story).toBe('Part 1');
  });

  it('propagates a formatted error on fatal API failures', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    });

    await expect(generateStoryBatch('Math', 'Easy', 1)).rejects.toThrow("The realm's connection was disrupted. Please try again.");
  });
  
  it('throws a specific portal energy error when rate limited', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests'
    });

    // Pass '1' for retries to prevent the test from intentionally waiting 40 seconds
    await expect(generateStoryBatch('Math', 'Easy', 1)).rejects.toThrow("The magic portal is gathering energy. Please wait a moment and try again.");
  });
});