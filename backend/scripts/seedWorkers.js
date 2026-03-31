const mongoose = require('mongoose');
const Worker = require('../src/models/Worker');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Swachhanet-SRMS';

const DEMO_WORKERS = [
  {
    name: 'Arjun Kumar',
    phone: '+919876543210',
    employeeId: 'EMP-001',
    role: 'driver',
    zone: 'North Zone',
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [77.5946, 12.9716] }, // Bangalore Center
    performanceScore: 4.8,
  },
  {
    name: 'Priya Singh',
    phone: '+919876543211',
    employeeId: 'EMP-002',
    role: 'cleaner',
    zone: 'South Zone',
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [77.5806, 12.9416] }, // Koramangala area
    performanceScore: 4.5,
  },
  {
    name: 'Suresh Raina',
    phone: '+919876543212',
    employeeId: 'EMP-003',
    role: 'cleaner',
    zone: 'East Zone',
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [77.6406, 12.9716] }, // Indiranagar area
    performanceScore: 4.2,
  },
  {
    name: 'Anita Desai',
    phone: '+919876543213',
    employeeId: 'EMP-004',
    role: 'supervisor',
    zone: 'West Zone',
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [77.5346, 12.9716] }, // Rajajinagar area
    performanceScore: 4.9,
  },
  {
    name: 'Vikram Seth',
    phone: '+919876543214',
    employeeId: 'EMP-005',
    role: 'driver',
    zone: 'Central Zone',
    status: 'busy',
    currentLocation: { type: 'Point', coordinates: [77.5946, 12.9816] }, // MG Road area
    performanceScore: 4.6,
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Optional: Clear existing demo workers to prevent duplicates
    // await Worker.deleteMany({ employeeId: { $regex: /^EMP-/ } });

    const count = await Worker.countDocuments();
    if (count > 10) {
      console.log('Worker collection already seeded. Skipping...');
      process.exit();
    }

    await Worker.insertMany(DEMO_WORKERS);
    console.log(`✅ Successfully seeded ${DEMO_WORKERS.length} demo workers!`);
    
    process.exit();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
