const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');
const Complaint = require('../src/models/Complaint');
const jwt = require('jsonwebtoken');
describe('Complaints API Endpoints', () => {
  let token;
  let userId;

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
  });

  afterAll(async () => {
    await User.deleteMany({ phone: '9876543210' });
    await Complaint.deleteMany({ userId });
  });

  test('POST /api/v1/complaints should create a new complaint', async () => {
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('issue_type', 'burning_waste')
      .field('lat', '12.9716')
      .field('lng', '77.5946')
      .field('description', 'Test complaint');
    
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

  test('GET /api/v1/complaints should support sorting complaints', async () => {
    const complaints = await Complaint.insertMany([
      {
        userId,
        issueType: 'other',
        priority: 1,
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
      {
        userId,
        issueType: 'full_dustbin',
        priority: 2,
        location: { type: 'Point', coordinates: [77.5947, 12.9717] },
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
      {
        userId,
        issueType: 'burning_waste',
        priority: 3,
        location: { type: 'Point', coordinates: [77.5948, 12.9718] },
        createdAt: new Date('2024-01-03T00:00:00.000Z'),
        updatedAt: new Date('2024-01-03T00:00:00.000Z'),
      },
    ]);

    const oldestFirst = await request(app)
      .get('/api/v1/complaints')
      .query({ sort: 'oldest', limit: 3 })
      .set('Authorization', `Bearer ${token}`);

    expect(oldestFirst.statusCode).toEqual(200);
    expect(oldestFirst.body.data.data.map(c => String(c._id))).toEqual(
      complaints.map(c => String(c._id))
    );

    const priorityLowFirst = await request(app)
      .get('/api/v1/complaints')
      .query({ sort: 'priority_low', limit: 3 })
      .set('Authorization', `Bearer ${token}`);

    expect(priorityLowFirst.statusCode).toEqual(200);
    expect(priorityLowFirst.body.data.data.map(c => c.priority)).toEqual([1, 2, 3]);
  });

  test('GET /api/v1/complaints should reject invalid sort values', async () => {
    const res = await request(app)
      .get('/api/v1/complaints')
      .query({ sort: 'bad_sort' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(400);
  });
});
