const mongoose = require('mongoose');
const { TrainingModule } = require('../src/models/Training');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swachhanet';

const MODULES = [
  {
    title: 'Waste Segregation Mastery',
    title_hi: 'कचरा पृथक्करण में महारत',
    description: 'Learn the 3-bin system to ensure a cleaner environment.',
    description_hi: 'स्वच्छ वातावरण सुनिश्चित करने के लिए 3-बिन प्रणाली सीखें।',
    category: 'segregation',
    contentType: 'microlearning',
    pointsReward: 50,
    durationMins: 5,
    visualSteps: [
      { title: 'Green Bin', text: 'For wet waste like food scraps, fruit peels, and leftovers.', illustration: 'Wet Waste Bin Icon' },
      { title: 'Blue Bin', text: 'For dry waste like paper, plastic, and metal.', illustration: 'Dry Waste Bin Icon' },
      { title: 'Red/Black Bin', text: 'For hazardous waste like batteries, bulbs, and medical waste.', illustration: 'Hazardous Bin Icon' }
    ],
    realLifeExamples: ['Kitchen scraps go to Green', 'Biscuit wrappers go to Blue', 'Used batteries go to Red'],
    dos: ['Rinse plastic containers before throwing', 'Wrap sharp objects in paper'],
    donts: ['Do not mix wet and dry waste', 'Do not throw diapers in the blue bin'],
    quickTips: ['Keep two small bins in your kitchen for easy sorting!'],
    quizQuestions: [
      { question: 'Where do fruit peels go?', options: ['Green (Wet)', 'Blue (Dry)', 'Red (Hazardous)', 'Yellow (Medical)'], answerIndex: 0 },
      { question: 'Which bin is for paper and dry cardboard?', options: ['Green', 'Blue', 'Red', 'Yellow'], answerIndex: 1 },
      { question: 'Waste Segregation helps in:', options: ['Increasing litter', 'Better recycling', 'More pollution', 'Wasting time'], answerIndex: 1 },
      { question: 'Where do used batteries go?', options: ['Green', 'Blue', 'Red', 'Yellow'], answerIndex: 2 },
      { question: 'Which color bin is for food scraps?', options: ['Blue', 'Red', 'Green', 'Yellow'], answerIndex: 2 }
    ],
    task: { title: 'Sort your home waste for 1 day', steps: ['Identify wet/dry waste', 'Use separate bins', 'Confirm completion'], difficulty: 'easy', reward: 30 },
    sortOrder: 1
  },
  {
    title: 'Home Composting 101',
    title_hi: 'होम कंपोस्टिंग 101',
    description: 'Turn your kitchen waste into black gold for your plants.',
    description_hi: 'अपने रसोई के कचरे को अपने पौधों के लिए काले सोने में बदलें।',
    category: 'composting',
    contentType: 'microlearning',
    pointsReward: 70,
    durationMins: 8,
    visualSteps: [
      { title: 'The Container', text: 'Choose a bin with holes for aeration.', illustration: 'Compost Bin with Air Holes' },
      { title: 'Layering', text: 'Add brown (dry leaves) and green (food scraps) layers.', illustration: 'Layers of Green and Brown' },
      { title: 'Turning', text: 'Mix every 15 days to speed up decomposition.', illustration: 'Tuning the compost' }
    ],
    realLifeExamples: ['Dried leaves and cardboard as browns', 'Vegetable peels as greens'],
    dos: ['Keep the pile moist', 'Chop scraps into small pieces'],
    donts: ['Do not add dairy or meat', 'Avoid plastic bits'],
    quickTips: ['Add a little jaggery water to speed up the process!'],
    quizQuestions: [
      { question: 'What are "Browns" in composting?', options: ['Food scraps', 'Dried leaves & Cardboard', 'Plastic bottles', 'Metal cans'], answerIndex: 1 },
      { question: 'How often should you turn a compost pile?', options: ['Daily', 'Every 15 days', 'Once a month', 'Never'], answerIndex: 1 },
      { question: 'Which of these CANNOT be composted?', options: ['Banana peels', 'Plastic bags', 'Coffee grounds', 'Egg shells'], answerIndex: 1 },
      { question: 'Composting turns waste into:', options: ['Plastic', 'Fertilizer', 'Metal', 'Glass'], answerIndex: 1 },
      { question: 'Do you need air holes in a compost bin?', options: ['No', 'Yes, for oxygen', 'Only in winter', 'Only for smell'], answerIndex: 1 }
    ],
    task: { title: 'Start a small compost bin', steps: ['Get a bin', 'Add first layer', 'Upload a photo'], difficulty: 'medium', reward: 50 },
    sortOrder: 2
  },
  {
    title: 'Recycling Basics',
    title_hi: 'रीसाइक्लिंग की बुनियादी बातें',
    description: 'Understand what happens after you throw dry waste.',
    description_hi: 'समझें कि आपके सूखे कचरे को फेंकने के बाद क्या होता है।',
    category: 'recycling',
    contentType: 'microlearning',
    pointsReward: 40,
    durationMins: 4,
    visualSteps: [
      { title: 'Sorting', text: 'Facilities sort items by material.', illustration: 'Sorting Conveyor' },
      { title: 'Processing', text: 'Items are cleaned and melted/shredded.', illustration: 'Processing Machine' }
    ],
    realLifeExamples: ['Used bottles become new polyester fabric', 'Newspapers become cardboard boxes'],
    dos: ['Crush plastic bottles to save space', 'Remove caps'],
    donts: ['Do not recycle greasy pizza boxes', 'Avoid mirrors'],
    quickTips: ['Look for the recycling symbol on packages!'],
    quizQuestions: [
      { question: 'Can you recycle a greasy pizza box?', options: ['Yes', 'No, oil ruins paper', 'Only if it is large', 'Always'], answerIndex: 1 },
      { question: 'What is the "3 R" rule?', options: ['Run, Race, Rise', 'Reduce, Reuse, Recycle', 'Read, Relax, React', 'None'], answerIndex: 1 },
      { question: 'Which material is 100% recyclable?', options: ['Plastic', 'Glass', 'Paper', 'Cloth'], answerIndex: 1 },
      { question: 'Recycling helps in:', options: ['Saving resources', 'Wasting energy', 'More landfills', 'Increasing costs'], answerIndex: 0 },
      { question: 'Should you rinse plastic containers?', options: ['No', 'Yes, to remove food', 'Only if they are red', 'Never'], answerIndex: 1 }
    ],
    task: { title: 'Identify 5 recyclable items at home', steps: ['List them down', 'Check for symbols'], difficulty: 'easy', reward: 20 },
    sortOrder: 3
  },
  {
    title: 'Plastic Reduction',
    title_hi: 'प्लास्टिक में कमी',
    description: 'Practical ways to say No to single-use plastic.',
    description_hi: 'सिंगल-यूज़ प्लास्टिक को न कहने के व्यावहारिक तरीके।',
    category: 'plastic',
    contentType: 'microlearning',
    pointsReward: 60,
    durationMins: 5,
    visualSteps: [
      { title: 'The Switch', text: 'Replace plastic bags with cloth bags.', illustration: 'Cloth Bag Switch' },
      { title: 'Reusable Bottles', text: 'Carry your own water bottle.', illustration: 'Refillable Bottle' }
    ],
    realLifeExamples: ['Steel straws instead of plastic ones', 'Glass jars for storage'],
    dos: ['Carry a cloth bag everywhere', 'Use bar soaps instead of liquid'],
    donts: ['Avoid plastic cutlery', 'Say no to thin plastic bags'],
    quickTips: ['Keep a small foldable bag in your pocket!'],
    quizQuestions: [
      { question: 'Which is better for the environment?', options: ['Cloth Bag', 'Plastic Bag', 'Paper Bag (Heavy)', 'Glass Bag'], answerIndex: 0 },
      { question: 'Single-use plastic is harmful because:', options: ['It is cheap', 'It never decomposes', 'It is light', 'It looks bad'], answerIndex: 1 },
      { question: 'Which of these is a plastic-free alternative?', options: ['Plastic Straw', 'Bamboo Brush', 'Plastic Bottle', 'Polythene'], answerIndex: 1 },
      { question: 'Microplastics are:', options: ['Large bags', 'Tiny plastic particles', 'Big containers', 'New toys'], answerIndex: 1 },
      { question: 'Reducing plastic helps:', options: ['Sea animals', 'Only humans', 'Only plants', 'Nobody'], answerIndex: 0 }
    ],
    task: { title: 'Plastic-Free Week Challenge', steps: ['Use zero single-use plastic for 7 days', 'Track progress'], difficulty: 'hard', reward: 100 },
    sortOrder: 4
  },
  {
    title: 'E-waste Disposal',
    title_hi: 'ई-कचरा निपटान',
    description: 'How to safely handle old gadgets and batteries.',
    description_hi: 'पुराने गैजेट्स और बैटरी को सुरक्षित रूप से कैसे संभालें।',
    category: 'ewaste',
    contentType: 'microlearning',
    pointsReward: 50,
    durationMins: 6,
    visualSteps: [
      { title: 'Collection Centers', text: 'Take electronics to authorized centers.', illustration: 'E-waste Drop-off Point' },
      { title: 'Hazardous Metals', text: 'Electronics contain lead and mercury.', illustration: 'Toxic components icon' }
    ],
    realLifeExamples: ['Old phones', 'Dead batteries', 'Broken chargers'],
    dos: ['Remove batteries from old remotes', 'Wipe data before disposal'],
    donts: ['Do not throw batteries in the trash', 'Do not burn wires'],
    quickTips: ['Many brands have take-back policies for old laptops!'],
    quizQuestions: [
      { question: 'Is it safe to burn electronics?', options: ['Yes', 'No, it releases toxins', 'Only in summer', 'Always'], answerIndex: 1 },
      { question: 'E-waste should be given to:', options: ['Local trash', 'Authorized centers', 'River', 'Forest'], answerIndex: 1 },
      { question: 'Which of these is E-waste?', options: ['Banana peel', 'Broken Laptop', 'Glass bottle', 'Old cloth'], answerIndex: 1 },
      { question: 'Dangerous metal in batteries:', options: ['Gold', 'Lead/Mercury', 'Iron', 'Wood'], answerIndex: 1 },
      { question: 'Should you throw phones in normal trash?', options: ['Yes', 'No', 'Only if broken', 'Always'], answerIndex: 1 }
    ],
    task: { title: 'Find a local e-waste collection center', steps: ['Search online', 'Locate nearest point'], difficulty: 'medium', reward: 40 },
    sortOrder: 5
  },
  {
    title: 'Civic Responsibility',
    title_hi: 'नागरिक उत्तरदायित्व',
    description: 'Your role in making India a clean and green nation.',
    description_hi: 'भारत को स्वच्छ और हरा-भरा राष्ट्र बनाने में आपकी भूमिका।',
    category: 'awareness',
    contentType: 'microlearning',
    pointsReward: 30,
    durationMins: 3,
    visualSteps: [
      { title: 'Reporting', text: 'Report dumping via the SwachhaNet app.', illustration: 'App UI screenshot simulation' },
      { title: 'Community', text: 'Encourage neighbors to segregate waste.', illustration: 'People talking' }
    ],
    realLifeExamples: ['Joining a local plogging drive', 'Teaching children about waste'],
    dos: ['Be a green role model', 'Report issues immediately'],
    donts: ['Do not litter in public places', 'Do not ignore open dumping'],
    quickTips: ['One small step by everyone makes a huge impact!'],
    quizQuestions: [
      { question: 'What should you do if you see an open dump?', options: ['Ignore it', 'Report via App', 'Complain to neighbor', 'Take a photo only'], answerIndex: 1 },
      { question: 'Clean India mission is called:', options: ['Digital India', 'Swachh Bharat', 'Make in India', 'Skill India'], answerIndex: 1 },
      { question: 'Who can help keep the city clean?', options: ['Only Sweepers', 'Every Citizen', 'Only Police', 'Nobody'], answerIndex: 1 },
      { question: 'Is littering a fineable offense?', options: ['No', 'Yes', 'Only in USA', 'Only for kids'], answerIndex: 1 },
      { question: 'Best way to inspire others:', options: ['Littering', 'Setting an example', 'Ignoring', 'Shouting'], answerIndex: 1 }
    ],
    task: { title: 'Tell 5 friends about waste segregation', steps: ['Explain the 3-bin system', 'Share the app link'], difficulty: 'medium', reward: 50 },
    sortOrder: 6
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Fully clear all modules for a complete reset
    await TrainingModule.deleteMany({});

    await TrainingModule.insertMany(MODULES);
    console.log(`✅ Successfully seeded ${MODULES.length} micro-learning modules!`);
    
    process.exit();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
