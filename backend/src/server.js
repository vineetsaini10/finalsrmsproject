require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');

const { connectDB }  = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger         = require('./utils/logger');
const errorHandler   = require('./middleware/errorHandler');

const authRoutes         = require('./routes/auth');
const complaintRoutes    = require('./routes/complaints');
const aiRoutes           = require('./routes/ai');
const mapRoutes          = require('./routes/map');
const trainingRoutes     = require('./routes/training');
const { gamificationRouter } = require('./routes/training');
const workerRoutes       = require('./routes/workers');
const reportRoutes       = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const wardRoutes         = require('./routes/wards');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(compression());
app.use(cors({
  origin:      process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  message:  { error: 'Too many requests. Please try again later.' },
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'swachhanet-api', db: 'mongodb', timestamp: new Date().toISOString() });
});

const API = '/api/v1';
app.use(`${API}/auth`,          authRoutes);
app.use(`${API}/complaints`,    complaintRoutes);
app.use(`${API}/ai`,            aiRoutes);
app.use(`${API}/map`,           mapRoutes);
app.use(`${API}/training`,      trainingRoutes);
app.use(`${API}/gamification`,  gamificationRouter);
app.use(`${API}/workers`,       workerRoutes);
app.use(`${API}/reports`,       reportRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/wards`,         wardRoutes);

app.use('*', (req, res) => res.status(404).json({ error: `Route ${req.originalUrl} not found` }));
app.use(errorHandler);

async function startServer() {
  try {
    await connectDB();
    await connectRedis();
    app.listen(PORT, () => {
      logger.info(`SwachhaNet API running on port ${PORT} [${process.env.NODE_ENV}] — MongoDB`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
module.exports = app;
