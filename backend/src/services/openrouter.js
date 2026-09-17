const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

function buildOpenRouterConfig({ model = DEFAULT_MODEL, prompt }) {
  if (!model.endsWith(':free')) {
    throw new Error('OPENROUTER_MODEL must use a :free model');
  }

  return {
    model,
    messages: [
      {
        role: 'user',
        content: `${prompt}\nReturn minified JSON only. Keep each narrative segment under 30 words and provide one image keyword.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 180,
  };
}

async function callOpenRouter({
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
  prompt,
  fetchImpl = global.fetch,
  apiKey = process.env.OPENROUTER_API_KEY,
}) {
  try {
    if (!apiKey) {
      return {
        success: false,
        message: 'The magic portal is resting, try again!',
      };
    }

    const response = await fetchImpl(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'EduQuest',
        },
        body: JSON.stringify(buildOpenRouterConfig({ model, prompt })),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        message: 'The magic portal is resting, try again!',
      };
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || 'The magic portal is resting, try again!';

    return {
      success: true,
      message: text,
    };
  } catch (error) {
    return {
      success: false,
      message: 'The magic portal is resting, try again!',
    };
  }
}

module.exports = {
  DEFAULT_MODEL,
  buildOpenRouterConfig,
  callOpenRouter,
};
