const TOTAL_QUESTIONS = 5;
const GEMINI_MODEL = 'gemini-1.5-flash';
const WORD_BANKS = {
  Easy: ['brave', 'happy', 'small', 'quick', 'bright', 'kind'],
  Medium: ['ancient', 'curious', 'fragile', 'generous', 'mysterious', 'reluctant'],
  Hard: ['benevolent', 'circumvent', 'enigmatic', 'meticulous', 'resilient', 'vindicate'],
};

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
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
  const targetWord = word;
  const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(targetWord)}&md=d&max=1`);
  const data = await response.json();
  if (!data || data.length === 0 || !data[0].defs) throw new Error('Definition not found');
  const definition = data[0].defs[0].replace(/^[a-zA-Z]+\t/, '');
  return { definition };
}

async function generateEnglishQuestion(difficulty) {
  const words = WORD_BANKS[difficulty];
  const word = randomItem(words);
  const { definition } = await fetchDefinition(word);
  const correctAnswer = definition;
  const distractors = words.filter((candidate) => candidate !== word).slice(0, 3);
  return {
    type: 'english',
    word,
    prompt: `What is the definition of ${word}?`,
    correctAnswer,
    explanation: `${word} means ${definition}.`,
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
  const narrative = await generateNarrative(prompt);
  return { ...narrative, question: educationalQuestion };
}

async function generateNarrative(promptText, apiKey = process.env.GEMINI_API_KEY) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${promptText}\nReturn JSON with only story and imageKeyword. Keep story under 30 words.` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) throw new Error('Gemini API failed');
  const data = await response.json();
  const resultText = data.candidates[0].content.parts[0].text;
  const parsedJSON = JSON.parse(resultText);
  if (!parsedJSON.story || !parsedJSON.imageKeyword || countWords(parsedJSON.story) > 30) {
    throw new Error('Gemini returned invalid narrative data');
  }
  return { story: parsedJSON.story, imageKeyword: parsedJSON.imageKeyword };
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

module.exports = { TOTAL_QUESTIONS, WORD_BANKS, generateChallenge, generateEnglishQuestion, generateMathQuestion, generateNarrative, hiddenQuestion, publicQuestion };
