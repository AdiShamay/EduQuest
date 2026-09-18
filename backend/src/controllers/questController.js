const Quest = require('../models/Quest');
const User = require('../models/User');
const {
  TOTAL_QUESTIONS,
  generateChallenge,
  hiddenQuestion,
  publicQuestion,
} = require('../services/questEngine');

const SUBJECTS = ['Math', 'English'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function weekLabel(date) {
  const day = new Date(date).getUTCDate();
  return `Week ${Math.ceil(day / 7)}`;
}

async function getAnalytics(req, res) {
  const child = await User.findOne({
    _id: req.params.childId,
    parentId: req.user._id,
    role: 'child',
  });

  if (!child) {
    return res.status(403).json({ message: 'Child is not linked to this parent' });
  }

  const quests = await Quest.find({ childId: child._id }).sort({ createdAt: -1 });
  const difficultyCounts = quests.reduce((counts, quest) => {
    counts[quest.difficulty] = (counts[quest.difficulty] || 0) + 1;
    return counts;
  }, {});
  const answeredQuestions = quests.flatMap((quest) =>
    quest.questions.slice(0, quest.answeredQuestions)
  );
  const passedQuestions = answeredQuestions.filter((question) => question.passed).length;
  const favoriteDifficulty = Object.entries(difficultyCounts).sort((left, right) =>
    right[1] - left[1]
  )[0]?.[0] || 'None';

  // Aggregate the same quest records into the two chart shapes so the UI never needs to infer metrics.
  const monthlySuccessByWeek = quests.reduce((weeks, quest) => {
    const week = weekLabel(quest.createdAt);
    const entry = weeks.find((item) => item.week === week);
    const successful = quest.questions.slice(0, quest.answeredQuestions).every(
      (question) => question.passed
    ) ? 1 : 0;
    if (entry) {
      entry.successful += successful;
      entry.total += 1;
    } else {
      weeks.push({ week, successful, total: 1 });
    }
    return weeks;
  }, []);

  const dailyAccuracy = Object.values(
    quests.reduce((days, quest) => {
      const date = formatDate(quest.createdAt);
      days[date] ||= { date, passed: 0, answered: 0 };
      quest.questions.slice(0, quest.answeredQuestions).forEach((question) => {
        days[date].passed += question.passed ? 1 : 0;
        days[date].answered += 1;
      });
      return days;
    }, {})
  ).map(({ date, passed, answered }) => ({
    date,
    accuracy: answered ? Math.round((passed / answered) * 100) : 0,
  }));

  return res.status(200).json({
    child: { id: child._id.toString(), username: child.username },
    metrics: {
      totalQuests: quests.length,
      overallAccuracy: answeredQuestions.length
        ? Math.round((passedQuestions / answeredQuestions.length) * 100)
        : 0,
      favoriteDifficulty,
    },
    monthlySuccessByWeek,
    dailyAccuracy,
    history: quests.map((quest) => ({
      id: quest._id.toString(),
      subject: quest.subject,
      difficulty: quest.difficulty,
      completed: quest.completed,
      score: quest.questions.slice(0, quest.answeredQuestions).filter((question) => question.passed).length,
      totalQuestions: quest.answeredQuestions,
      createdAt: quest.createdAt,
    })),
  });
}

function progressFor(quest) {
  return { current: quest.answeredQuestions + 1, total: TOTAL_QUESTIONS };
}

async function startQuest(req, res) {
  console.log('--- START QUEST ENDPOINT HIT ---', req.body);
  const { subject, difficulty } = req.body;

  if (!SUBJECTS.includes(subject) || !DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ message: 'Invalid subject or difficulty' });
  }

  try {
    const challenge = await generateChallenge({ subject, difficulty });
    const questions = Array.from({ length: TOTAL_QUESTIONS }, (_, index) =>
      index === 0 ? hiddenQuestion(challenge, false) : hiddenQuestion({
        story: 'The next challenge awaits.',
        imageKeyword: 'dungeon',
        question: {
          type: 'math',
          prompt: 'Pending challenge',
          correctAnswer: 'pending',
          explanation: 'The next challenge has not been revealed yet.',
          options: [],
        },
      }, false)
    );
    const quest = await Quest.create({
      childId: req.user._id,
      subject,
      difficulty,
      questions,
      answeredQuestions: 0,
      currentQuestionIndex: 0,
      completed: false,
    });

    return res.status(201).json({
      quest: { id: quest._id.toString(), subject, difficulty },
      question: publicQuestion(quest.questions[0]),
      progress: { current: 1, total: TOTAL_QUESTIONS },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to start quest', error: error.message || error });
  }
}

async function answerQuest(req, res) {
  const { questId, answer } = req.body;

  if (!questId || typeof answer !== 'string') {
    return res.status(400).json({ message: 'Quest ID and answer are required' });
  }

  const quest = await Quest.findOne({ _id: questId, childId: req.user._id });
  if (!quest) {
    return res.status(404).json({ message: 'Quest not found' });
  }
  if (quest.completed || quest.answeredQuestions >= TOTAL_QUESTIONS) {
    return res.status(409).json({ message: 'Quest is already complete' });
  }

  const currentQuestion = quest.questions[quest.currentQuestionIndex];
  const isCorrect = answer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
  currentQuestion.userAnswer = answer;
  currentQuestion.passed = isCorrect;
  quest.answeredQuestions += 1;

  if (quest.answeredQuestions === TOTAL_QUESTIONS) {
    quest.completed = true;
    await quest.save();
    return res.status(200).json({
      isCorrect,
      completed: true,
      progress: { current: TOTAL_QUESTIONS, total: TOTAL_QUESTIONS },
      ...(isCorrect ? {} : {
        feedback: {
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation,
        },
      }),
    });
  }

  const branch = isCorrect ? 'progress' : 'setback';
  const challenge = await generateChallenge({
    subject: quest.subject,
    difficulty: quest.difficulty,
    branch,
    previousAnswer: answer,
  });
  quest.currentQuestionIndex += 1;
  quest.questions[quest.currentQuestionIndex] = hiddenQuestion(challenge, !isCorrect);
  await quest.save();

  return res.status(200).json({
    isCorrect,
    branch,
    ...(isCorrect ? {} : {
      feedback: {
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
      },
    }),
    nextQuestion: publicQuestion(quest.questions[quest.currentQuestionIndex]),
    progress: progressFor(quest),
  });
}

module.exports = { answerQuest, getAnalytics, startQuest };
