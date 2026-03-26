const Bull      = require('bull');
const Complaint = require('../models/Complaint');
const logger    = require('../utils/logger');
const aiService = require('../services/aiService');

const aiQueue = new Bull('ai-classification', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
});

aiQueue.process('classify_waste', 5, async (job) => {
  const { complaintId, imageUrl } = job.data;
  logger.info(`Processing AI classification for complaint ${complaintId}`);

  const prediction = await aiService.classifyFromUrl(imageUrl);
  const { class: label, confidence, probabilities, model_version } = prediction;

  await Complaint.findByIdAndUpdate(complaintId, {
    aiResult: {
      wasteType:    label,
      confidence,
      modelVersion: model_version || 'v1.0',
      allScores:    probabilities,
      processedAt:  new Date(),
    },
  });

  logger.info(`AI result saved: ${label} (${confidence}) for complaint ${complaintId}`);
});

aiQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

async function queueAIClassification(data) {
  return aiQueue.add('classify_waste', data);
}

module.exports = { aiQueue, queueAIClassification };
