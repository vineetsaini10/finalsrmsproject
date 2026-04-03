const { Schema, model } = require('mongoose');

const FALLBACK_QUIZZES = {
  segregation: [
    { question: 'Which bin is for fruit peels?', options: ['Green (Wet)', 'Blue (Dry)', 'Red (Hazardous)', 'Yellow (Medical)'], answerIndex: 0 },
    { question: 'Where do biscuit wrappers go?', options: ['Green', 'Blue', 'Red', 'Yellow'], answerIndex: 1 },
    { question: 'Is it okay to mix wet and dry waste?', options: ['Yes', 'No', 'Sometimes', 'Only on weekends'], answerIndex: 1 },
    { question: 'How should you dispose of glass bottles?', options: ['Throw in Green bin', 'Rinse and put in Blue bin', 'Bury it', 'Break it and leave'], answerIndex: 1 }
  ],
  composting: [
    { question: 'What are "Browns" in composting?', options: ['Food scraps', 'Dried leaves & Cardboard', 'Plastic bottles', 'Metal cans'], answerIndex: 1 },
    { question: 'How often should you turn a compost pile?', options: ['Every hour', 'Every 15 days', 'Once a year', 'Never'], answerIndex: 1 },
    { question: 'Can you add dairy products to compost?', options: ['Yes', 'No, it attracts pests', 'Only milk', 'Only cheese'], answerIndex: 1 }
  ],
  plastic: [
    { question: 'What is "Single-Use Plastic"?', options: ['Plastic you use forever', 'Plastic used once and thrown', 'Recycled plastic', 'Metal-plastic hybrid'], answerIndex: 1 },
    { question: 'Which of these is a great alternative to plastic bags?', options: ['More plastic bags', 'Cloth bags', 'Paper only', 'Nothing'], answerIndex: 1 },
    { question: 'Does plastic fully decompose?', options: ['Yes, in 1 month', 'No, it turns into microplastics', 'Yes, in 1 year', 'Yes, in 10 years'], answerIndex: 1 }
  ],
  recycling: [
    { question: 'Can you recycle a greasy pizza box?', options: ['Yes', 'No, oil contaminates paper', 'Only if it is hot', 'Always'], answerIndex: 1 },
    { question: 'What is the first step of recycling?', options: ['Burning', 'Sorting', 'Melting', 'Burying'], answerIndex: 1 },
    { question: 'Which symbol represents recycling?', options: ['A square', 'Three chasing arrows', 'A circle', 'A star'], answerIndex: 1 }
  ],
  ewaste: [
    { question: 'What is E-Waste?', options: ['Electronic waste like old phones', 'Environment-friendly waste', 'Extra waste', 'Everyday waste'], answerIndex: 0 },
    { question: 'Can you throw batteries in the regular trash?', options: ['Yes', 'No, they leak chemicals', 'Only AA batteries', 'Only if they are dead'], answerIndex: 1 },
    { question: 'What should you do before recycling a phone?', options: ['Nothing', 'Delete all personal data', 'Charge it', 'Paint it'], answerIndex: 1 }
  ],
  default: [
    { question: 'What is the goal of SwachhaNet?', options: ['More waste', 'Clean & Green city', 'Selling waste', 'Ignoring litter'], answerIndex: 1 },
    { question: 'Who is responsible for waste segregation?', options: ['Only the government', 'Every citizen', 'Only children', 'Nobody'], answerIndex: 1 },
    { question: 'Where should you report a waste dumping site?', options: ['On Instagram', 'Via SwachhaNet App', 'To a friend', 'Ignore it'], answerIndex: 1 }
  ]
};

const trainingModuleSchema = new Schema({
  title:        { type: String, required: true },
  title_hi:     { type: String }, // Hindi title support
  description:  { type: String },
  description_hi: { type: String }, // Hindi description support
  category:     { type: String, enum: ['segregation','composting', 'recycling', 'awareness', 'policy', 'plastic', 'ewaste'] },
  contentType:  { type: String, enum: ['video','infographic','quiz','article','microlearning'], default: 'microlearning' },
  contentUrl:   { type: String },
  thumbnailUrl: { type: String },
  difficulty:   { type: String, enum: ['beginner', 'easy', 'medium', 'hard'], default: 'beginner' },
  pointsReward: { type: Number, default: 10 },
  durationMins: { type: Number, default: 3 },
  isActive:     { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },
  
  // Micro-learning rich content
  visualSteps: [{ 
    title: { type: String },
    text:  { type: String },
    illustration: { type: String } // Text-based simulation/desc
  }],
  realLifeExamples: [{ type: String }],
  dos: [{ type: String }],
  donts: [{ type: String }],
  quickTips: [{ type: String }],
  
  quizQuestions: [{
    question: { type: String, required: true },
    options:  { type: [String], default: [] },
    answerIndex: { type: Number, required: true },
  }],
  
  // Actionable Task
  task: {
    title:      { type: String },
    steps:      [{ type: String }],
    difficulty: { type: String, enum: ['easy','medium', 'hard'], default: 'easy' },
    reward:     { type: Number, default: 20 }
  }
}, { timestamps: true });

// Static helper to retrieve fallback quizzes
trainingModuleSchema.statics.getFallbackQuizzes = function(category) {
  return FALLBACK_QUIZZES[category] || FALLBACK_QUIZZES.default;
};

trainingModuleSchema.pre('save', function(next) {
  // 1. Ensure content_type is set for microlearning if rich fields are present
  if (this.visualSteps?.length > 0) this.contentType = 'microlearning';

  // 2. Strict Quiz Validation Layer
  const currentQuestions = this.quizQuestions || [];
  if (currentQuestions.length < 3) {
    const category = this.category || 'default';
    const fallbacks = FALLBACK_QUIZZES[category] || FALLBACK_QUIZZES.default;
    
    // Inject fallbacks to reach at least 3 questions
    const needed = 3 - currentQuestions.length;
    for (let i = 0; i < needed; i++) {
      if (fallbacks[i]) currentQuestions.push(fallbacks[i]);
    }
    this.quizQuestions = currentQuestions;
  }

  // 3. Ensure every question has EXACTLY 4 options
  this.quizQuestions = this.quizQuestions.map(q => {
    let opts = q.options || [];
    if (opts.length < 4) {
      const fillers = ['I do not know', 'None of these', 'All of these', 'Contact Authority'];
      while (opts.length < 4) {
        opts.push(fillers[opts.length] || `Option ${opts.length + 1}`);
      }
    }
    if (opts.length > 4) opts = opts.slice(0, 4);
    
    // Validate answerIndex
    if (q.answerIndex === undefined || q.answerIndex < 0 || q.answerIndex >= 4) {
      q.answerIndex = 0; // Default to first option if invalid
    }
    
    return { 
      question: q.question,
      options: opts,
      answerIndex: q.answerIndex
    };
  });

  next();
});


trainingModuleSchema.index({ category: 1, isActive: 1 });

const quizAttemptSchema = new Schema({
  userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId:       { type: Schema.Types.ObjectId, ref: 'TrainingModule', required: true },
  quizId:         { type: Schema.Types.ObjectId, ref: 'Quiz' },
  score:          { type: Number },
  totalQuestions: { type: Number },
  passed:         { type: Boolean },
  pointsEarned:   { type: Number, default: 0 },
  answers:        { type: Schema.Types.Mixed },
  completedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

quizAttemptSchema.index({ userId: 1, moduleId: 1 });
quizAttemptSchema.index(
  { userId: 1, quizId: 1 },
  {
    unique: true,
    partialFilterExpression: { quizId: { $exists: true } },
  }
);

const moduleProgressSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId:     { type: Schema.Types.ObjectId, ref: 'TrainingModule', required: true },
  completed:    { type: Boolean, default: true },
  pointsEarned: { type: Number, default: 0 },
  completedAt:  { type: Date, default: Date.now },
}, { timestamps: true });

moduleProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

const TrainingModule = model('TrainingModule', trainingModuleSchema);
const QuizAttempt    = model('QuizAttempt', quizAttemptSchema);
const ModuleProgress = model('ModuleProgress', moduleProgressSchema);

module.exports = { TrainingModule, QuizAttempt, ModuleProgress };
