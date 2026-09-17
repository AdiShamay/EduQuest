const mongoose = require('mongoose');

const User = require('../src/models/User');
const Quest = require('../src/models/Quest');

function question(number) {
  return {
    narrativePrompt: `Challenge ${number}`,
    userAnswer: `${number}`,
    correctAnswer: `${number}`,
    passed: true,
  };
}

describe('EduQuest schemas', () => {
  it('requires parentId for child users but not parent users', () => {
    const parent = new User({ username: 'parent', password: 'secret-password', role: 'parent' });
    const child = new User({ username: 'child', password: 'secret-password', role: 'child' });

    expect(parent.validateSync()).toBeUndefined();
    expect(child.validateSync().errors.parentId).toBeDefined();
  });

  it('rejects unsupported roles', () => {
    const user = new User({ username: 'admin', password: 'secret', role: 'admin' });

    expect(user.validateSync().errors.role).toBeDefined();
  });

  it('requires exactly five embedded quest questions', () => {
    const childId = new mongoose.Types.ObjectId();
    const validQuest = new Quest({
      childId,
      subject: 'Math',
      difficulty: 'Easy',
      questions: [1, 2, 3, 4, 5].map(question),
    });
    const shortQuest = new Quest({
      childId,
      subject: 'Math',
      difficulty: 'Easy',
      questions: [1, 2, 3, 4].map(question),
    });
    const longQuest = new Quest({
      childId,
      subject: 'Math',
      difficulty: 'Easy',
      questions: [1, 2, 3, 4, 5, 6].map(question),
    });

    expect(validQuest.validateSync()).toBeUndefined();
    expect(shortQuest.validateSync().errors.questions).toBeDefined();
    expect(longQuest.validateSync().errors.questions).toBeDefined();
  });

  it('rejects invalid quest subject and difficulty values', () => {
    const quest = new Quest({
      childId: new mongoose.Types.ObjectId(),
      subject: 'Science',
      difficulty: 'Impossible',
      questions: [1, 2, 3, 4, 5].map(question),
    });

    const validation = quest.validateSync();

    expect(validation.errors.subject).toBeDefined();
    expect(validation.errors.difficulty).toBeDefined();
  });
});
