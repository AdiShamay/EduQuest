const TOTAL_QUESTIONS = 5;

const WORD_BANKS = {
  Easy: [
    'brave', 'happy', 'small', 'quick', 'bright', 'kind', 'cold', 'warm', 'fast', 'slow',
    'big', 'tall', 'short', 'loud', 'quiet', 'clean', 'dirty', 'dark', 'light', 'strong',
    'weak', 'young', 'old', 'good', 'bad', 'new', 'easy', 'hard', 'rich', 'poor',
    'sweet', 'sour', 'soft', 'hot', 'cool', 'wet', 'dry', 'full', 'empty',
    'safe', 'wild', 'tame', 'calm', 'glad', 'sad', 'mad', 'sick', 'well',
    'neat', 'fair', 'nice', 'rude', 'wise', 'silly', 'funny', 'smart',
    'deep', 'high', 'flat', 'round'
  ],
  Medium: [
    'ancient', 'curious', 'fragile', 'generous', 'mysterious', 'reluctant', 'brilliant', 'cautious', 'furious', 'glorious',
    'honest', 'lonely', 'magical', 'nervous', 'patient', 'polite', 'proud', 'scary', 'secret', 'silent',
    'simple', 'sincere', 'special', 'strange', 'sudden', 'tender', 'terrible', 'useful', 'valuable', 'violent',
    'wandering', 'weary', 'wicked', 'wooden', 'worried', 'worthy', 'abundant', 'active', 'adequate', 'admirable',
    'agreeable', 'alert', 'ambitious', 'amiable', 'amusing', 'anxious', 'apparent', 'apt', 'ardent', 'artistic',
    'astonishing', 'attentive', 'attractive', 'graceful', 'auspicious', 'authentic', 'available', 'avenging', 'aware', 'awesome'
  ],
  Hard: [
    'benevolent', 'circumvent', 'enigmatic', 'meticulous', 'resilient', 'vindicate', 'audacious', 'cacophony', 'deleterious', 'ephemeral',
    'fastidious', 'gargantuan', 'haughty', 'iconoclast', 'juxtapose', 'kinetic', 'labyrinth', 'mellifluous', 'nefarious', 'oblivious',
    'paradox', 'quarantine', 'rancorous', 'sagacious', 'taciturn', 'ubiquitous', 'vacillate', 'waning', 'xenophile', 'yearning',
    'zealot', 'altruistic', 'belligerent', 'capricious', 'destitute', 'ebullient', 'fallacious', 'gregarious', 'hedonistic', 'immutable',
    'jeopardy', 'kleptomaniac', 'luminous', 'munificent', 'nostalgic', 'omnipotent', 'pragmatic', 'quell', 'recalcitrant', 'sanguine',
    'tenacious', 'uxorious', 'venerable', 'winsome', 'xenophobic', 'yoke', 'zenith', 'acumen', 'bumptious', 'candor'
  ]
};

function calculateMathQuestion(operator, left, right) {
  // Ensure subtraction never results in a negative number by swapping operands if needed
  let l = left;
  let r = right;
  if (operator === '-' && l < r) {
    l = right;
    r = left;
  }

  const answer = operator === '+' ? l + r : operator === '-' ? l - r : operator === 'x' ? l * r : l / r;
  return {
    type: 'math',
    prompt: `Solve: ${l} ${operator} ${r}`,
    correctAnswer: String(answer),
    explanation: `${l} ${operator} ${r} equals ${answer}`,
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
  
  // Extract definition and remove part-of-speech tag
  const definition = data[0].defs[0].replace(/^[a-zA-Z]+\t/, '');
  return { definition };
}

async function generateEnglishQuestion(difficulty) {
  const words = WORD_BANKS[difficulty];
  
  // Select 4 unique random words (1 correct, 3 distractors)
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const selectedWords = shuffled.slice(0, 4);
  const targetWord = selectedWords[0];
  
  // Fetch definitions for all 4 words concurrently for maximum performance
  const definitions = await Promise.all(
    selectedWords.map(async (word) => {
      try {
        const { definition } = await fetchDefinition(word);
        return definition;
      } catch (error) {
        return `The meaning of the word ${word}`;
      }
    })
  );
  
  const correctAnswer = definitions[0];
  
  // Ensure all displayed options are strictly unique (prevents identical dictionary definitions)
  const uniqueOptions = Array.from(new Set(definitions));
  
  return {
    type: 'english',
    word: targetWord,
    prompt: `What is the definition of the word: ${targetWord}?`,
    correctAnswer,
    // Formatted cleanly without trailing periods to prevent double punctuation
    explanation: `The word '${targetWord}' is defined as: ${correctAnswer}`,
    options: uniqueOptions.sort(() => Math.random() - 0.5),
  };
}

async function generateEducationalQuestion(subject, difficulty) {
  return subject === 'English' ? generateEnglishQuestion(difficulty) : generateMathQuestion(difficulty);
}

// Fetch 5-part narrative with 6 retries for high availability
async function generateStoryBatch(subject, difficulty, retries = 6) {
  require('dotenv').config();
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("CRITICAL: GEMINI_API_KEY is missing from your .env file!");
  apiKey = apiKey.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  
  const promptText = `You are a game master. Create a continuous 5-part fantasy adventure story about a hero or heroes embarking on a quest.
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
      const errorText = await response.text();
      
      // Handle rate limits and overloaded servers
      if (response.status === 429 || response.status === 503) {
        console.warn(`[Gemini API] Status ${response.status} encountered. Retrying...`, errorText);
        
        if (i < retries - 1) {
          // Determine delay based on status code
          const delay = response.status === 429 ? 40000 : 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error("The magic portal is gathering energy. Please wait a moment and try again.");
      }
      
      console.error(`[Gemini API] Fatal Error ${response.status}:`, errorText);
      throw new Error("The realm's connection was disrupted. Please try again.");
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