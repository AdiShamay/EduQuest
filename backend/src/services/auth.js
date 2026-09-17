const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    role: user.role,
    ...(user.parentId ? { parentId: user.parentId.toString() } : {}),
  };
}

module.exports = {
  comparePassword,
  createToken,
  hashPassword,
  serializeUser,
};
