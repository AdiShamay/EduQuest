const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');
const questRoutes = require('./routes/quests');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/quests', questRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((error, req, res, next) => {
  console.error('Backend Error:', error.message || error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
