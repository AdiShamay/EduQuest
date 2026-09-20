const { generateNarrative } = require('../src/services/questEngine');

describe('Gemini direct REST narrative service', () => {
  afterEach(() => jest.restoreAllMocks());

  it('requests Gemini JSON and returns only narrative fields', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ story: 'A moonlit gate opens.', imageKeyword: 'gate' }) }] } }],
      }),
    });

    const narrative = await generateNarrative('Wrap this challenge in a short scene.', 'test-gemini-key');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('responseMimeType'),
      })
    );
    expect(narrative).toEqual({ story: 'A moonlit gate opens.', imageKeyword: 'gate' });
  });

  it('propagates Gemini REST failures to the caller', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await expect(generateNarrative('Create a scene.', 'test-gemini-key')).rejects.toThrow('Gemini API failed');
  });
});
