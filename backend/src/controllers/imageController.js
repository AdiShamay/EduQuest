const { findImage } = require('../services/unsplash');

async function getImage(req, res) {
  const keyword = String(req.params.keyword || '').trim().split(/\s+/)[0];
  if (!keyword) return res.status(400).json({ message: 'An image keyword is required' });
  return res.status(200).json({ imageUrl: await findImage(keyword) });
}

module.exports = { getImage };