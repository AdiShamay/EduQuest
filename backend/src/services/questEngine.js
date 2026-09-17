const openrouter = require('./openrouter');

const TOTAL_QUESTIONS = 5;

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function parseGameMasterResponse(message) {
  let parsed;

  try {
    parsed = JSON.parse(message);
  } catch (error) {
    throw new Error('The magic portal returned invalid quest data');
  }

  const story = parsed?.story;
  const imageKeyword = parsed?.imageKeyword;
  const question = parsed?.question;

  if (
    typeof story !== 'string' ||
    countWords(story) > 30 ||
    typeof imageKeyword !== 'string' ||
    !imageKeyword.trim() ||
    typeof question?.prompt !== 'string' ||
    typeof question?.correctAnswer !== 'string' ||
    typeof question?.explanation !== 'string'
  ) {
    throw new Error('The magic portal returned invalid quest data');
  }

  return {
    story,
    imageKeyword: imageKeyword.trim().split(/\s+/)[0],
    question,
  };
}

async function generateChallenge({ subject, difficulty, branch = 'opening', previousAnswer }) {
  const context = branch === 'setback'
    ? `The child answered incorrectly with ${previousAnswer}. Create a short setback and recovery challenge.`
    : 'Continue the quest with a normal progression challenge.';
  const prompt = `Create a ${subject} ${difficulty} quest challenge. ${context}`;
  let result;
  try {
    result = await openrouter.callOpenRouter({ prompt });
    if (!result.success) {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Raw OpenRouter Error:', error.response?.data || error.message || error);
    throw error;
  }

  return parseGameMasterResponse(result.message);
}

function hiddenQuestion(challenge, isRecovery) {
  return {
    narrativePrompt: challenge.question.prompt,
    userAnswer: 'unanswered',
    correctAnswer: challenge.question.correctAnswer,
    passed: false,
    isRecovery,
    imageKeyword: challenge.imageKeyword,
    story: challenge.story,
    explanation: challenge.question.explanation,
  };
}

function publicQuestion(question) {
  return {
    prompt: question.narrativePrompt,
    imageKeyword: question.imageKeyword,
    story: question.story,
  };
}

module.exports = {
  TOTAL_QUESTIONS,
  generateChallenge,
  hiddenQuestion,
  publicQuestion,
};
