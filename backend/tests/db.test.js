const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');

describe('Database configuration', () => {
  it('connects using the configured MongoDB URI', async () => {
    const connectSpy = jest.spyOn(mongoose, 'connect').mockResolvedValue();

    await connectDB('mongodb://localhost:27017/eduquest');

    expect(connectSpy).toHaveBeenCalledWith('mongodb://localhost:27017/eduquest');
    connectSpy.mockRestore();
  });
});
