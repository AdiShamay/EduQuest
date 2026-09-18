const openrouter = require('./openrouter');

const TOTAL_QUESTIONS = 5;
const WORD_BANKS = {
  Easy: ['brave', 'happy', 'small', 'quick', 'bright', 'kind'],
  Medium: ['ancient', 'curious', 'fragile', 'generous', 'mysterious', 'reluctant'],
  Hard: ['benevolent', 'circumvent', 'enigmatic', 'meticulous', 'resilient', 'vindicate'],
};

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function parseNarrativeResponse(message) {
  let parsed;
  try {
    parsed = JSON.parse(message);
  } catch (error) {
    throw new Error('The magic portal returned invalid narrative data');
  }
  if (typeof parsed?.story !== 'string' || countWords(parsed.story) > 30 || typeof parsed?.imageKeyword !== 'string' || !parsed.imageKeyword.trim()) {
    throw new Error('The magic portal returned invalid narrative data');
  }
  return { story: parsed.story, imageKeyword: parsed.imageKeyword.trim().split(/\s+/)[0] };
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function calculateMathQuestion(operator, left, right) {
  const answer = operator === '+' ? left + right : operator === '-' ? left - right : operator === 'x' ? left * right : left / right;
  return {
    type: 'math',
    prompt: `Solve: ${left} ${operator} ${right}`,
    correctAnswer: String(answer),
    explanation: `${left} ${operator} ${right} equals ${answer}.`,
    options: [],
  };
}

function generateMathQuestion(difficulty) {
  if (difficulty === 'Easy') {
    const left = Math.floor(Math.random() * 20) + 1;
    const right = Math.floor(Math.random() * 20) + 1;
    return calculateMathQuestion(Math.random() < 0.5 ? '+' : '-', left, right);
  }
  if (difficulty === 'Medium') {
    const operation = Math.floor(Math.random() * 3);
    if (operation === 2) return calculateMathQuestion('x', Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1);
    return calculateMathQuestion(operation === 0 ? '+' : '-', Math.floor(Math.random() * 100) + 1, Math.floor(Math.random() * 100) + 1);
  }
  const operation = Math.floor(Math.random() * 4);
  if (operation === 2) return calculateMathQuestion('x', Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1);
  if (operation === 3) {
    const divisor = Math.floor(Math.random() * 9) + 2;
    const quotient = Math.floor(Math.random() * 20) + 1;
    return calculateMathQuestion('/', divisor * quotient, divisor);
  }
  return calculateMathQuestion(operation === 0 ? '+' : '-', Math.floor(Math.random() * 1000) + 1, Math.floor(Math.random() * 1000) + 1);
}

async function fetchDefinition(word) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!response.ok) throw new Error('The dictionary portal is resting, try again!');
  const data = await response.json();
  const meaning = data?.[0]?.meanings?.[0];
  const definition = meaning?.definitions?.[0]?.definition;
  const synonym = meaning?.synonyms?.[0] || meaning?.definitions?.[0]?.synonyms?.[0];
  if (!definition && !synonym) throw new Error('The dictionary returned no usable meaning');
  return { definition, synonym };
}

async function generateEnglishQuestion(difficulty) {
  const words = WORD_BANKS[difficulty];
  const word = randomItem(words);
  const { definition, synonym } = await fetchDefinition(word);
  const correctAnswer = synonym || definition;
  const distractors = words.filter((candidate) => candidate !== word).slice(0, 3);
  return {
    type: 'english',
    word,
    prompt: `What is the ${synonym ? 'synonym' : 'definition'} of ${word}?`,
    correctAnswer,
    explanation: synonym ? `${word} can mean ${synonym}.` : `${word} means ${definition}.`,
    options: [correctAnswer, ...distractors].sort(() => Math.random() - 0.5),
  };
}

async function generateEducationalQuestion(subject, difficulty) {
  return subject === 'English' ? generateEnglishQuestion(difficulty) : generateMathQuestion(difficulty);
}

async function generateChallenge({ subject, difficulty, branch = 'opening', previousAnswer }) {
  const educationalQuestion = await generateEducationalQuestion(subject, difficulty);
  const context = branch === 'setback' ? `The child answered incorrectly with ${previousAnswer}. Describe a short setback and recovery scene.` : 'Describe a short normal progression scene.';
  const prompt = `Wrap this ${subject} ${difficulty} challenge in a dark-fantasy narrative. Challenge: ${educationalQuestion.prompt}. ${context}`;
  let result;
  try {
    result = await openrouter.callOpenRouter({ prompt });
    if (!result.success) throw new Error(result.message);
  } catch (error) {
    console.error('Raw OpenRouter Error:', error.message || error);
    throw error;
  }
  return { ...parseNarrativeResponse(result.message), question: educationalQuestion };
}

function hiddenQuestion(challenge, isRecovery) {
  return {
    narrativePrompt: challenge.question.prompt,
    questionType: challenge.question.type,
    options: challenge.question.options,
    word: challenge.question.word || '',
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
  return { prompt: question.narrativePrompt, type: question.questionType, options: question.options || [], imageKeyword: question.imageKeyword, story: question.story };
}

module.exports = { TOTAL_QUESTIONS, WORD_BANKS, generateChallenge, generateEnglishQuestion, generateMathQuestion, hiddenQuestion, publicQuestion };
