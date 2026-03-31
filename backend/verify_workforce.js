const mongoose = require('mongoose');
const Worker = require('./src/models/Worker');
const Complaint = require('./src/models/Complaint');
const { findBestWorker } = require('./src/services/workforceService');

const MONGODB_URI = 'mongodb://localhost:27017/Swachhanet-SRMS';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const wardId = new mongoose.Types.ObjectId();
  const complaintId = new mongoose.Types.ObjectId();

  // 1. Create near worker
  const nearWorker = await Worker.create({
    name: 'Near Worker',
    role: 'cleaner',
    wardId,
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [77.5946, 12.9716] } // Bangalore center
  });

  // 2. Create far worker
  const farWorker = await Worker.create({
    name: 'Far Worker',
    role: 'cleaner',
    wardId,
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [77.5946, 13.5716] } // ~66km away
  });

  // 3. Create complaint near Worker A
  const complaint = {
    wardId,
    location: { type: 'Point', coordinates: [77.5946, 12.9726] } // ~0.1km away from Near Worker
  };

  console.log('Searching for best worker...');
  const best = await findBestWorker(complaint);

  if (best && String(best._id) === String(nearWorker._id)) {
    console.log(`✅ Success! Picked ${best.name} (Dist: ${best.distance.toFixed(3)}km)`);
  } else {
    console.error('❌ Failed! Picked wrong worker or none.');
    console.log('Picked:', best?.name);
  }

  // Cleanup
  await Worker.deleteMany({ _id: { $in: [nearWorker._id, farWorker._id] } });
  console.log('Cleanup complete');
  process.exit();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
