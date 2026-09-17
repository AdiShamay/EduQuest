const { buildOpenRouterConfig, callOpenRouter } = require('../src/services/openrouter');

describe('OpenRouter utility', () => {
  it('builds a free-tier model configuration', () => {
    const config = buildOpenRouterConfig({
      model: 'openrouter/auto',
      prompt: 'Generate a quest scene',
    });

    expect(config.model).toBe('openrouter/auto');
    expect(config.messages[0].role).toBe('user');
    expect(config.messages[0].content).toContain('Generate a quest scene');
  });

  it('returns a friendly fallback when the API call fails', async () => {
    const result = await callOpenRouter({
      model: 'openrouter/auto',
      prompt: 'Generate a quest scene',
      fetchImpl: async () => {
        throw new Error('network error');
      },
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('The magic portal is resting');
  });
});
