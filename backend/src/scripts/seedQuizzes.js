const mongoose = require('mongoose');
require('dotenv').config();
const { TrainingModule } = require('../models/Training');

async function seedQuizzes() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Swachhanet-SRMS';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const modules = await TrainingModule.find({});
    console.log(`Found ${modules.length} modules to process`);

    for (const mod of modules) {
      if (!mod.quizQuestions || mod.quizQuestions.length < 3) {
        console.log(`Updating module: ${mod.title} (${mod.category})`);
        
        // The pre-save hook will handle the injection, but we call the static helper
        // just to be explicit if we wanted to log what we're doing.
        // We'll just save it to trigger the hook.
        await mod.save();
        console.log(`✅ Successfully seeded quiz for: ${mod.title}`);
      } else {
        console.log(`⏭️ Skipping module: ${mod.title} (Already has ${mod.quizQuestions.length} questions)`);
      }
    }

    console.log('--- Done Seeding Quizzes ---');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding quizzes:', err);
    process.exit(1);
  }
}

seedQuizzes();
