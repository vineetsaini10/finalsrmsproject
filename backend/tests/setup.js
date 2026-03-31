require('dotenv').config({ path: '.env.test' });
const { connectDB, mongoose } = require('../src/config/database');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
