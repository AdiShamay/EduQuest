const TOTAL_QUESTIONS = 5;
const WORD_BANKS = {
  Easy: ['brave', 'happy', 'small', 'quick', 'bright', 'kind'],
  Medium: ['ancient', 'curious', 'fragile', 'generous', 'mysterious', 'reluctant'],
  Hard: ['benevolent', 'circumvent', 'enigmatic', 'meticulous', 'resilient', 'vindicate'],
};

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
  const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`);
  if (!response.ok) throw new Error(`Datamuse API error: ${response.status}`);
  
  const data = await response.json();
  if (!data || data.length === 0 || !data[0].defs) throw new Error(`Definition not found for word: ${word}`);
  
  // Strip the part-of-speech prefix returned by Datamuse
  const definition = data[0].defs[0].replace(/^[a-zA-Z]+\t/, '');
  return { definition };
}

async function generateEnglishQuestion(difficulty) {
  const words = WORD_BANKS[difficulty];
  const word = words[Math.floor(Math.random() * words.length)];
  const { definition } = await fetchDefinition(word);
  const correctAnswer = definition;
  const distractors = words.filter((candidate) => candidate !== word).slice(0, 3).map(w => `The meaning of ${w}`);
  
  return {
    type: 'english',
    word,
    prompt: `What is the definition of the word: ${word}?`,
    correctAnswer,
    explanation: `${word} means${definition}.`,
    options: [correctAnswer, ...distractors].sort(() => Math.random() - 0.5),
  };
}

async function generateEducationalQuestion(subject, difficulty) {
  return subject === 'English' ? generateEnglishQuestion(difficulty) : generateMathQuestion(difficulty);
}

// Fetches all narrative segments in a single batch request
async function generateStoryBatch(subject, difficulty, retries = 3) {
  require('dotenv').config();
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("CRITICAL: GEMINI_API_KEY is missing from your .env file!");
  apiKey = apiKey.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  
  const promptText = `You are a game master. Create a continuous 5-part fantasy adventure story about a hero embarking on a quest.
  IMPORTANT RULES:
  - Return ONLY a JSON array containing exactly 5 objects.
  - Each object must have exactly two keys: "story" and "imageKeyword".
  - "story": A short continuous narrative segment (max 30 words). Part 1: Intro, Parts 2-4: The journey/obstacles, Part 5: The climax/conclusion.
  - "imageKeyword": A single word from the story to search for a background image (e.g., "castle", "forest", "dragon", "dungeon").
  - STRICT RULE: DO NOT include numbers, math equations, specific puzzles, or vocabulary definitions in the story text. The story must only describe the atmospheric adventure, environments, and heroic actions.
  - Do NOT include any markdown wrappers like \`\`\`json. Return pure JSON.`;

  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      if (response.status === 503 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      const errorText = await response.text();
      throw new Error(`Google API Rejected: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const storyArray = JSON.parse(cleanText);
    if (!Array.isArray(storyArray) || storyArray.length !== 5) {
      throw new Error("Gemini did not return exactly 5 story segments");
    }
    return storyArray;
  }
}

function hiddenQuestion(challenge) {
  return {
    narrativePrompt: challenge.question.prompt,
    questionType: challenge.question.type,
    options: challenge.question.options,
    word: challenge.question.word || '',
    userAnswer: 'unanswered',
    correctAnswer: challenge.question.correctAnswer,
    passed: false,
    imageKeyword: challenge.imageKeyword,
    story: challenge.story,
    explanation: challenge.question.explanation,
  };
}

function publicQuestion(question) {
  return { prompt: question.narrativePrompt, type: question.questionType, options: question.options || [], imageKeyword: question.imageKeyword, story: question.story };
}

module.exports = { TOTAL_QUESTIONS, WORD_BANKS, generateStoryBatch, generateEducationalQuestion, hiddenQuestion, publicQuestion };