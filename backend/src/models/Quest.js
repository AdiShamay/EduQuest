const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    narrativePrompt: { type: String, required: true, maxlength: 30 },
    userAnswer: { type: String, required: true },
    correctAnswer: { type: String, required: true },
    passed: { type: Boolean, required: true },
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
  },
  { timestamps: true }
);

module.exports = mongoose.models.Quest || mongoose.model('Quest', questSchema);
