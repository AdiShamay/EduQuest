const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    narrativePrompt: { type: String, required: true, maxlength: 300 },
    userAnswer: { type: String, required: true },
    correctAnswer: { type: String, required: true },
    passed: { type: Boolean, required: true },
    isRecovery: { type: Boolean, default: false },
    imageKeyword: { type: String, default: '' },
    story: { type: String, default: '' },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const questSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['Math', 'English'],
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Easy', 'Medium', 'Hard'],
    },
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (questions) => questions.length === 5,
        message: 'A quest must contain exactly five questions',
      },
    },
    answeredQuestions: { type: Number, default: 0, min: 0, max: 5 },
    currentQuestionIndex: { type: Number, default: 0, min: 0, max: 4 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Quest || mongoose.model('Quest', questSchema);
