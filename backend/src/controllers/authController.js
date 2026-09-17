const User = require('../models/User');
const {
  comparePassword,
  createToken,
  hashPassword,
  serializeUser,
} = require('../services/auth');

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

async function register(req, res) {
  const { username, password, role, parentId } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required' });
  }

  try {
    const user = new User({ username, password: await hashPassword(password), role, parentId });
    await user.validate();

    if (role === 'child') {
      const parent = await User.findOne({ _id: parentId, role: 'parent' });
      if (!parent) {
        return res.status(400).json({ message: 'A valid parent is required for child users' });
      }
    }

    await user.save();
    return res.status(201).json({ token: createToken(user), user: serializeUser(user) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'Username is already in use' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Unable to register user' });
  }
}

async function login(req, res) {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select('+password');

  if (!user || !(await comparePassword(password || '', user.password))) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  return res.status(200).json({ token: createToken(user), user: serializeUser(user) });
}

async function createChild(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // The authenticated parent is the only source of parentId, preventing clients from linking children to another account.
    const child = new User({
      username,
      password: await hashPassword(password),
      role: 'child',
      parentId: req.user._id,
    });
    await child.save();

    return res.status(201).json({ user: serializeUser(child) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'Username is already in use' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Unable to create child profile' });
  }
}

async function listChildren(req, res) {
  const children = await User.find({ parentId: req.user._id, role: 'child' }).sort({ username: 1 });
  return res.status(200).json({ children: children.map(serializeUser) });
}

module.exports = { createChild, listChildren, login, register };
