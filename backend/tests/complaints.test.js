const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');
const Complaint = require('../src/models/Complaint');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

describe('Complaints API Endpoints', () => {
  let token;
  let userId;
  const testImagePath = path.resolve(__dirname, 'test_image.jpg');

  beforeAll(async () => {
    // Create a test user and get a token
    const user = await User.create({
      name: 'Auth User',
      phone: '9876543210',
      passwordHash: 'hashed',
      role: 'citizen',
      isVerified: true
    });
    userId = user._id;
    token = jwt.sign({ userId, role: user.role }, process.env.JWT_SECRET || 'test_secret_for_jwt_validation_purpose_only');
    
    // Create a dummy image for testing
    fs.writeFileSync(testImagePath, 'dummy content');
  });

  afterAll(async () => {
    await User.deleteMany({ phone: '9876543210' });
    await Complaint.deleteMany({ userId });
    if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
  });

  test('POST /api/v1/complaints should create a new complaint', async () => {
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('issue_type', 'burning_waste')
      .field('lat', '12.9716')
      .field('lng', '77.5946')
      .field('description', 'Test complaint')
      .attach('image', testImagePath);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.complaint.issueType).toEqual('burning_waste');
  });

  test('GET /api/v1/complaints should return list of complaints for the user', async () => {
    const res = await request(app)
      .get('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.data.length).toBeGreaterThan(0);
  });
});
