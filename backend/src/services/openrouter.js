const FREE_MODELS = [
  'google/gemma-2-9b-it:free',
  'huggingfaceh4/zephyr-7b-beta:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3-8b-instruct:free',
];
const DEFAULT_MODEL = FREE_MODELS[0];

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
  model = DEFAULT_MODEL,
  prompt,
  fetchImpl = global.fetch,
  apiKey = process.env.OPENROUTER_API_KEY,
}) {
  if (!apiKey) {
    console.error('WARNING: OPENROUTER_API_KEY is missing in backend .env!');
    return {
      success: false,
      message: 'The magic portal is resting, try again!',
    };
  }

  const modelsToTry = [model, ...FREE_MODELS.filter((freeModel) => freeModel !== model)];

  for (const modelName of modelsToTry) {
    try {
      console.log('Sending request to model:', modelName);
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
          body: JSON.stringify(buildOpenRouterConfig({ model: modelName, prompt })),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenRouter request failed with status ${response.status}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenRouter response did not contain message content');

      return { success: true, message: text };
    } catch (error) {
      console.warn(`Model ${modelName} failed, trying next...`);
      console.error('ACTUAL OPENROUTER API ERROR:', error.response?.data || error.message || error);
    }
  }

  return {
    success: false,
    message: 'The magic portal is resting, try again!',
  };
}

module.exports = {
  DEFAULT_MODEL,
  buildOpenRouterConfig,
  callOpenRouter,
};
