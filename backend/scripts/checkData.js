const mongoose = require('mongoose');
require('dotenv').config();
const Complaint = require('../src/models/Complaint');
const Ward = require('../models/Ward');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const wards = await Ward.find().lean();
  console.log('Wards:', wards.map(w => ({ id: w._id, name: w.name })));
  
  const counts = await Complaint.aggregate([
    { $group: { _id: '$wardId', count: { $sum: 1 } } }
  ]);
  console.log('Complaints per Ward:', counts);
  
  const total = await Complaint.countDocuments();
  console.log('Total Complaints:', total);
  
  process.exit(0);
}
check();
