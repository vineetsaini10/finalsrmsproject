const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env.test') });

const User = require('../../backend/src/models/User');
const Complaint = require('../../backend/src/models/Complaint');
const Ward = require('../../backend/src/models/Ward');
const Hotspot = require('../../backend/src/models/Hotspot');

async function validateDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swachhanet-test';
  
  try {
    console.log(`Connecting to ${uri}...`);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    const models = [
      { name: 'User', model: User, expectedIndexes: ['phone_1', 'email_1'] },
      { name: 'Complaint', model: Complaint, expectedIndexes: ['userId_1', 'wardId_1', 'status_1', 'location_2dsphere'] },
      { name: 'Ward', model: Ward, expectedIndexes: ['city_1', 'boundary_2dsphere'] },
      { name: 'Hotspot', model: Hotspot, expectedIndexes: ['wardId_1', 'centroid_2dsphere'] }
    ];

    for (const { name, model, expectedIndexes } of models) {
      console.log(`\nValidating ${name} model...`);
      const indexes = await model.collection.getIndexes();
      const indexNames = Object.keys(indexes);
      
      for (const expected of expectedIndexes) {
        if (indexNames.includes(expected)) {
          console.log(`[PASS] Index ${expected} found.`);
        } else {
          console.log(`[FAIL] Index ${expected} MISSING.`);
        }
      }
      
      // Basic sanity check: counting documents
      const count = await model.countDocuments();
      console.log(`[INFO] Current document count: ${count}`);
    }

    console.log('\nDatabase validation complete.');
  } catch (err) {
    console.error('Database validation failed:', err);
  } finally {
    await mongoose.connection.close();
  }
}

validateDatabase();
