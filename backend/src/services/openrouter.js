function buildOpenRouterConfig({ model, prompt }) {
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
  prompt,
  apiKey = process.env.OPENROUTER_API_KEY,
}) {
  if (!apiKey) {
    console.error('WARNING: OPENROUTER_API_KEY is missing in backend .env!');
    return {
      success: false,
      message: 'The magic portal is resting, try again!',
    };
  }

  let models = [];
  try {
    const modelResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'EduQuest',
      },
    });

    if (!modelResponse.ok) {
      const errText = await modelResponse.text();
      throw new Error(`HTTP ${modelResponse.status} from OpenRouter models endpoint: ${errText}`);
    }

    const modelData = await modelResponse.json();
    models = (Array.isArray(modelData?.data) ? modelData.data : [])
      .map((availableModel) => availableModel?.id)
      .filter((id) => {
        if (typeof id !== 'string' || !id.endsWith(':free')) return false;
        const normalizedId = id.toLowerCase();
        const isUnsupportedModel = ['-vl', 'vision', 'embed'].some((term) => normalizedId.includes(term));
        return !isUnsupportedModel;
      });
    console.log('Dynamically loaded all eligible free models:', models);
  } catch (error) {
    console.error('Unable to load available OpenRouter models:', error.message || error);
  }

  console.log('Selected dynamic free models for retry:', models);

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`Sending request to model: ${model}`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'EduQuest',
        },
        body: JSON.stringify({
          ...buildOpenRouterConfig({ model, prompt }),
          model,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status} from OpenRouter: ${errText}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenRouter response did not contain message content');

      return { success: true, message: text };
    } catch (error) {
      console.warn(`Model ${model} failed, trying next...`);
      console.error(`Error details for ${model}:`, error.message || error);
      lastError = error;
    }
  }

  console.error(
    'ALL MODELS FAILED. LAST ERROR:',
    lastError?.response?.data || lastError?.message || lastError
  );
  return {
    success: false,
    message: 'The magic portal is resting, try again!',
  };
}

module.exports = {
  buildOpenRouterConfig,
  callOpenRouter,
};
