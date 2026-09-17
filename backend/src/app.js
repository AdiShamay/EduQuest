const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const questRoutes = require('./routes/quests');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
