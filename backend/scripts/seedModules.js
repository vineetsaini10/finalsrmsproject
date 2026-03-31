const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { TrainingModule } = require('../src/models/Training');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const modules = [
  {
    title: 'Waste Segregation Basics',
    category: 'segregation',
    contentType: 'video',
    contentUrl: 'https://www.youtube.com/watch?v=1pG0e8D6Wm0',
    pointsReward: 30,
    durationMins: 5,
    sortOrder: 0,
    description: 'Learn the 3-bin system for effective waste separation at source.',
  },
  {
    title: 'Home Composting Guide',
    category: 'composting',
    contentType: 'article',
    contentUrl: 'https://swachhbharatmission.gov.in',
    pointsReward: 25,
    durationMins: 8,
    sortOrder: 1,
    description: 'Turn kitchen waste into rich compost in 3 simple steps.',
  },
  {
    title: 'Plastic Recycling Quiz',
    category: 'recycling',
    contentType: 'quiz',
    pointsReward: 100,
    durationMins: 3,
    sortOrder: 2,
    description: 'Test your knowledge on plastic recycling categories and codes.',
    quizQuestions: [
      {
        question: 'Which bin should you use for clean plastic bottles?',
        options: ['Wet bin', 'Dry/Recyclable bin', 'Hazardous bin', 'Do not dispose'],
        answerIndex: 1,
      },
      {
        question: 'What should you do before recycling food containers?',
        options: ['Leave food residue', 'Rinse and dry the container', 'Burn it', 'Crush and bury it'],
        answerIndex: 1,
      },
      {
        question: 'Which item is generally not recyclable in home collection?',
        options: ['Newspaper', 'Glass bottle', 'Used battery', 'Cardboard box'],
        answerIndex: 2,
      },
    ],
  },
  {
    title: 'E-Waste Disposal Rules',
    category: 'awareness',
    contentType: 'infographic',
    contentUrl: 'https://cpcb.nic.in/e-waste',
    pointsReward: 20,
    durationMins: 4,
    sortOrder: 3,
    description: 'Understand how to safely dispose of electronics and batteries.',
  },
  {
    title: 'Dry Waste and Recycling',
    category: 'recycling',
    contentType: 'video',
    contentUrl: 'https://www.youtube.com/watch?v=sQkHf4lkrxQ',
    pointsReward: 30,
    durationMins: 6,
    sortOrder: 4,
    description: 'Complete guide to sorting paper, glass, metal, and plastic.',
  },
  {
    title: 'Wet Waste to Compost Quiz',
    category: 'composting',
    contentType: 'quiz',
    pointsReward: 90,
    durationMins: 4,
    sortOrder: 5,
    description: 'Test your understanding of home composting methods.',
    quizQuestions: [
      {
        question: 'Which material is best for balancing wet kitchen waste in compost?',
        options: ['Dry leaves', 'Plastic wrappers', 'Glass pieces', 'Aluminium foil'],
        answerIndex: 0,
      },
      {
        question: 'How often should compost be turned for aeration?',
        options: ['Never', 'Once every 1-2 days', 'Once every 2-3 weeks', 'Every month'],
        answerIndex: 1,
      },
      {
        question: 'Which waste should NOT go into home compost?',
        options: ['Fruit peels', 'Tea leaves', 'Cooked oily food in excess', 'Vegetable scraps'],
        answerIndex: 2,
      },
    ],
  },
  {
    title: 'Community Cleanliness Awareness',
    category: 'awareness',
    contentType: 'article',
    contentUrl: 'https://www.mygov.in/campaigns/swachh-bharat',
    pointsReward: 20,
    durationMins: 5,
    sortOrder: 6,
    description: 'Best practices for maintaining cleaner streets and public spaces.',
  },
  {
    title: 'Segregation Master Quiz',
    category: 'segregation',
    contentType: 'quiz',
    pointsReward: 120,
    durationMins: 5,
    sortOrder: 7,
    description: 'Advanced segregation scenarios for daily household waste.',
    quizQuestions: [
      {
        question: 'Milk packets after rinsing should be disposed in which bin?',
        options: ['Wet bin', 'Dry bin', 'Hazardous bin', 'Sanitary bin'],
        answerIndex: 1,
      },
      {
        question: 'Broken CFL bulbs should be disposed as:',
        options: ['Regular dry waste', 'Wet waste', 'Hazardous/e-waste', 'Compost'],
        answerIndex: 2,
      },
      {
        question: 'Used tissue paper is generally categorized as:',
        options: ['Wet waste', 'Dry recyclable waste', 'E-waste', 'Metal scrap'],
        answerIndex: 0,
      },
    ],
  },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // Count existing modules
    const existingCount = await TrainingModule.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing modules. Skipping seed to avoid duplicates.`);
      console.log('Use --force if you want to clear and re-seed.');
      if (!process.argv.includes('--force')) {
        process.exit(0);
      }
      console.log('Clearing existing modules due to --force flag...');
      await TrainingModule.deleteMany({});
    }

    console.log(`Seeding ${modules.length} modules...`);
    await TrainingModule.insertMany(modules);
    console.log('Successfully seeded training modules!');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
