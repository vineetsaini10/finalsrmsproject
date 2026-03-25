const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User          = require('../models/User');
const Gamification  = require('../models/Gamification');
const { RefreshToken } = require('../models/Notification');
const { authenticate } = require('../middleware/auth');
const logger        = require('../utils/logger');

const generateTokens = (userId, role) => ({
  accessToken: jwt.sign({ userId, role }, process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }),
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const sendOTP = async (phone, otp) => logger.info(`[DEV] OTP for ${phone}: ${otp}`);

// POST /auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 150 }),
  body('phone').isMobilePhone(),
  body('password').isLength({ min: 6 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, phone, email, password, role = 'citizen' } = req.body;
    const exists = await User.findOne({ $or: [{ phone }, ...(email ? [{ email }] : [])] });
    if (exists) return res.status(409).json({ error: 'User with this phone/email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const user = await User.create({
      name, phone, email: email || undefined, passwordHash,
      role, otpSecret: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await Gamification.create({ userId: user._id });
    await sendOTP(phone, otp);

    res.status(201).json({
      message: 'Registration successful. Please verify your phone.',
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
    });
  } catch (err) { next(err); }
});

// POST /auth/otp/send
router.post('/otp/send', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    const otp = generateOTP();
    await User.findOneAndUpdate({ phone }, { otpSecret: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOTP(phone, otp);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) { next(err); }
});

// POST /auth/otp/verify
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.otpSecret !== otp || new Date(user.otpExpiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    user.isVerified = true;
    user.otpSecret = undefined;
    await user.save();
    const tokens = generateTokens(user._id, user.role);
    await RefreshToken.create({ userId: user._id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
    res.json({ message: 'Phone verified successfully', ...tokens });
  } catch (err) { next(err); }
});

// POST /auth/login
router.post('/login', [body('phone').notEmpty(), body('password').notEmpty()], async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone }).populate('wardId', 'name city');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ error: 'Phone not verified', code: 'UNVERIFIED' });
    const tokens = generateTokens(user._id, user.role);
    await RefreshToken.create({ userId: user._id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
    res.json({
      user: { id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role,
              wardId: user.wardId?._id, wardName: user.wardId?.name, city: user.wardId?.city },
      ...tokens,
    });
  } catch (err) { next(err); }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const stored = await RefreshToken.findOne({ token: refreshToken, expiresAt: { $gt: new Date() } });
    if (!stored) return res.status(401).json({ error: 'Invalid refresh token' });
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const tokens = generateTokens(user._id, user.role);
    await RefreshToken.deleteOne({ token: refreshToken });
    await RefreshToken.create({ userId: user._id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
    res.json(tokens);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    next(err);
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await RefreshToken.deleteOne({ token: refreshToken, userId: req.user._id });
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [user, g] = await Promise.all([
      User.findById(req.user._id).populate('wardId', 'name city'),
      Gamification.findOne({ userId: req.user._id }),
    ]);
    res.json({
      id: user._id, name: user.name, phone: user.phone, email: user.email,
      role: user.role, wardId: user.wardId?._id, wardName: user.wardId?.name,
      city: user.wardId?.city, avatarUrl: user.avatarUrl,
      totalPoints: g?.totalPoints || 0, badges: g?.badges || [],
      level: g?.level || 1, streakDays: g?.streakDays || 0,
    });
  } catch (err) { next(err); }
});

module.exports = router;
