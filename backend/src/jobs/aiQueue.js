const Bull      = require('bull');
const axios     = require('axios');
const Complaint = require('../models/Complaint');
const logger    = require('../utils/logger');

const aiQueue = new Bull('ai-classification', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
});

aiQueue.process('classify_waste', 5, async (job) => {
  const { complaintId, imageUrl } = job.data;
  logger.info(`Processing AI classification for complaint ${complaintId}`);

  const res = await axios.post(
    `${process.env.AI_SERVICE_URL}/api/v1/classify-url`,
    { image_url: imageUrl },
    { timeout: 20000 }
  );

  const { label, confidence, all_scores, model_version } = res.data.result;

  await Complaint.findByIdAndUpdate(complaintId, {
    aiResult: {
      wasteType:    label,
      confidence,
      modelVersion: model_version || 'v1.0',
      allScores:    all_scores,
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
