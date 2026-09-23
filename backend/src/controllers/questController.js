const Quest = require('../models/Quest');
const User = require('../models/User');
const {
  TOTAL_QUESTIONS,
  generateStoryBatch,
  generateEducationalQuestion,
  hiddenQuestion,
  publicQuestion,
} = require('../services/questEngine');

const SUBJECTS = ['Math', 'English'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function dateRange(days) {
  return Array.from({ length: days }, (_, index) => formatDate(dateDaysAgo(days - index - 1)));
}

function questionScore(quest) {
  const answered = quest.questions.slice(0, quest.answeredQuestions);
  return answered.length
    ? Math.round((answered.filter((question) => question.passed).length / answered.length) * 100)
    : 0;
}

function historyEntry(quest) {
  return {
    id: quest._id.toString(),
    subject: quest.subject,
    difficulty: quest.difficulty,
    completed: quest.completed,
    score: quest.questions.slice(0, quest.answeredQuestions).filter((question) => question.passed).length,
    totalQuestions: quest.answeredQuestions,
    createdAt: quest.createdAt,
  };
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

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 5, 1), 50);
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

  const performanceDays = dateRange(30).map((date) => ({ date, mathScores: [], englishScores: [] }));
  const performanceByDate = Object.fromEntries(performanceDays.map((day) => [day.date, day]));
  quests.forEach((quest) => {
    const day = performanceByDate[formatDate(quest.createdAt)];
    if (!day) return;
    const scores = quest.subject === 'Math' ? day.mathScores : day.englishScores;
    scores.push(questionScore(quest));
  });
  const performanceTrend = performanceDays.map(({ date, mathScores, englishScores }) => ({
    date,
    math: mathScores.length ? Math.round(mathScores.reduce((sum, score) => sum + score, 0) / mathScores.length) : 0,
    english: englishScores.length ? Math.round(englishScores.reduce((sum, score) => sum + score, 0) / englishScores.length) : 0,
  }));

  const activityDays = dateRange(7).map((date) => ({ date, math: 0, english: 0 }));
  const activityByDate = Object.fromEntries(activityDays.map((day) => [day.date, day]));
  quests.forEach((quest) => {
    const day = activityByDate[formatDate(quest.createdAt)];
    if (day) day[quest.subject.toLowerCase()] += 1;
  });
  const activityVolume = activityDays;
  const difficultyDistribution = DIFFICULTIES.map((difficulty) => ({
    name: difficulty,
    value: difficultyCounts[difficulty] || 0,
  }));
  const historyStart = (page - 1) * limit;
  const history = quests.slice(historyStart, historyStart + limit).map(historyEntry);
  const totalHistory = quests.length;

  return res.status(200).json({
    child: { id: child._id.toString(), username: child.username },
    metrics: {
      totalQuests: quests.length,
      overallAccuracy: answeredQuestions.length
        ? Math.round((passedQuestions / answeredQuestions.length) * 100)
        : 0,
      favoriteDifficulty,
    },
    performanceTrend,
    activityVolume,
    difficultyDistribution,
    history,
    page,
    limit,
    totalHistory,
    hasMore: historyStart + history.length < totalHistory,
  });
}

function progressFor(quest) {
  return { current: quest.answeredQuestions + 1, total: TOTAL_QUESTIONS };
}

async function startQuest(req, res) {
  console.log('--- START QUEST ENDPOINT ---', req.body);
  const { subject, difficulty } = req.body;

  if (!SUBJECTS.includes(subject) || !DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ message: 'Invalid subject or difficulty' });
  }

  try {
    const storyParts = await generateStoryBatch(subject, difficulty);
    
    const questions = [];
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      const edQ = await generateEducationalQuestion(subject, difficulty);
      questions.push(hiddenQuestion({
        story: storyParts[i].story,
        imageKeyword: storyParts[i].imageKeyword,
        question: edQ
      }));
    }

    const newQuest = new Quest({
      childId: req.user._id,
      subject,
      difficulty,
      questions,
      answeredQuestions: 0,
      currentQuestionIndex: 0,
      completed: false,
    });
    await newQuest.save();

    return res.status(201).json({
      quest: { id: newQuest._id.toString(), subject, difficulty },
      question: publicQuestion(newQuest.questions[0]),
      progress: { current: 1, total: TOTAL_QUESTIONS },
    });
  } catch (error) {
    console.error('CRITICAL ERROR IN START QUEST:', error);
    // Forward the specific error message to the frontend payload
    return res.status(500).json({ message: error.message || 'Unable to start quest. Please try again.' });
  }
}

async function answerQuest(req, res) {
  try {
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

    quest.currentQuestionIndex += 1;
    await quest.save();

    return res.status(200).json({
      isCorrect,
      branch: isCorrect ? 'progress' : 'setback',
      ...(isCorrect ? {} : {
        feedback: {
          correctAnswer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation,
        },
      }),
      nextQuestion: publicQuestion(quest.questions[quest.currentQuestionIndex]),
      progress: progressFor(quest),
    });
  } catch (error) {
    console.error('CRITICAL ERROR IN ANSWER QUEST:', error);
    return res.status(500).json({ message: 'The magic portal is gathering energy. Please wait a moment and try again.', error: error.message });
  }
}

module.exports = { answerQuest, getAnalytics, startQuest };