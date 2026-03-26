const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User          = require('../models/User');
const Gamification  = require('../models/Gamification');
const { RefreshToken } = require('../models/Notification');
const { authenticate } = require('../middleware/auth');
const logger        = require('../utils/logger');
const { ok, fail } = require('../utils/response');

const generateTokens = (userId, role) => ({
  accessToken: jwt.sign({ userId, role }, process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }),
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
async function sendOTP(phone, otp) {
  // Terminal-only OTP delivery for local/dev use.
  // No SMS/email provider call is made here.
  const line = `[OTP-TERMINAL] phone=${phone} otp=${otp}`;
  console.log(line);
  logger.info(line);
}

// POST /auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 150 }),
  body('phone').isMobilePhone(),
  body('password').isLength({ min: 6 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'Validation failed', { errors: errors.array() });

    const { name, phone, email, password, role = 'citizen' } = req.body;
    const exists = await User.findOne({ $or: [{ phone }, ...(email ? [{ email }] : [])] });
    if (exists) return fail(res, 409, 'User with this phone/email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const user = await User.create({
      name, phone, email: email || undefined, passwordHash,
      role, otpSecret: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await Gamification.create({ userId: user._id });
    await sendOTP(phone, otp);

    return ok(
      res,
      { user: { id: user._id, name: user.name, phone: user.phone, role: user.role } },
      'Registration successful. Please verify your phone.',
      201
    );
  } catch (err) { next(err); }
});

// POST /auth/otp/send
router.post('/otp/send', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return fail(res, 400, 'Phone required');
    const otp = generateOTP();
    await User.findOneAndUpdate({ phone }, { otpSecret: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    await sendOTP(phone, otp);
    return ok(res, {}, 'OTP sent successfully');
  } catch (err) { next(err); }
});

// POST /auth/otp/verify
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return fail(res, 400, 'Phone and OTP required');
    const user = await User.findOne({ phone });
    if (!user) return fail(res, 404, 'User not found');
    if (user.otpSecret !== otp || new Date(user.otpExpiresAt) < new Date()) {
      return fail(res, 400, 'Invalid or expired OTP');
    }
    user.isVerified = true;
    user.otpSecret = undefined;
    await user.save();
    const tokens = generateTokens(user._id, user.role);
    await RefreshToken.create({ userId: user._id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
    return ok(res, tokens, 'Phone verified successfully');
  } catch (err) { next(err); }
});

// POST /auth/login
router.post('/login', [body('phone').notEmpty(), body('password').notEmpty()], async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone }).populate('wardId', 'name city');
    if (!user) return fail(res, 401, 'Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return fail(res, 401, 'Invalid credentials');
    if (!user.isVerified) return fail(res, 403, 'Phone not verified', { code: 'UNVERIFIED' });
    const tokens = generateTokens(user._id, user.role);
    await RefreshToken.create({ userId: user._id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
    const payload = {
      user: { id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role,
              wardId: user.wardId?._id, wardName: user.wardId?.name, city: user.wardId?.city },
      ...tokens,
    };
    return ok(res, payload, 'Login successful');
  } catch (err) { next(err); }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return fail(res, 400, 'Refresh token required');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const stored = await RefreshToken.findOne({ token: refreshToken, expiresAt: { $gt: new Date() } });
    if (!stored) return fail(res, 401, 'Invalid refresh token');
    const user = await User.findById(decoded.userId);
    if (!user) return fail(res, 401, 'User not found');
    const tokens = generateTokens(user._id, user.role);
    await RefreshToken.deleteOne({ token: refreshToken });
    await RefreshToken.create({ userId: user._id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
    return ok(res, tokens, 'Token refreshed');
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return fail(res, 401, 'Invalid token');
    next(err);
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await RefreshToken.deleteOne({ token: refreshToken, userId: req.user._id });
    return ok(res, {}, 'Logged out successfully');
  } catch (err) { next(err); }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [user, g] = await Promise.all([
      User.findById(req.user._id).populate('wardId', 'name city'),
      Gamification.findOne({ userId: req.user._id }),
    ]);
    const payload = {
      id: user._id, name: user.name, phone: user.phone, email: user.email,
      role: user.role, wardId: user.wardId?._id, wardName: user.wardId?.name,
      city: user.wardId?.city, avatarUrl: user.avatarUrl,
      profile: user.profile || {},
      notificationPrefs: user.notificationPrefs || {},
      totalPoints: g?.totalPoints || 0, badges: g?.badges || [],
      level: g?.level || 1, streakDays: g?.streakDays || 0,
    };
    return ok(res, payload, 'Profile fetched');
  } catch (err) { next(err); }
});

// PUT /auth/me
router.put('/me', authenticate, [
  body('name').optional().trim().isLength({ min: 2, max: 150 }),
  body('email').optional({ nullable: true }).isEmail(),
  body('avatarUrl').optional({ nullable: true }).isURL(),
  body('profile.bio').optional().isLength({ max: 500 }),
  body('profile.address').optional().isLength({ max: 300 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, 'Validation failed', { errors: errors.array() });

    const { name, email, avatarUrl, profile = {} } = req.body;
    const update = {};

    if (typeof name === 'string') update.name = name.trim();
    if (email !== undefined) {
      const normalized = email ? String(email).toLowerCase().trim() : undefined;
      if (normalized) {
        const exists = await User.findOne({ email: normalized, _id: { $ne: req.user._id } }).select('_id').lean();
        if (exists) return fail(res, 409, 'Email already in use');
      }
      update.email = normalized;
    }
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl || undefined;
    if (Object.prototype.hasOwnProperty.call(profile, 'bio')) update['profile.bio'] = profile.bio || '';
    if (Object.prototype.hasOwnProperty.call(profile, 'address')) update['profile.address'] = profile.address || '';

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .populate('wardId', 'name city')
      .lean();
    return ok(res, {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      wardId: user.wardId?._id,
      wardName: user.wardId?.name,
      city: user.wardId?.city,
      avatarUrl: user.avatarUrl,
      profile: user.profile || {},
    }, 'Profile updated');
  } catch (err) { next(err); }
});

// GET /auth/settings
router.get('/settings', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPrefs profile.preferences').lean();
    const payload = {
      notificationPrefs: user?.notificationPrefs || {},
      preferences: user?.profile?.preferences || { language: 'en', theme: 'light' },
    };
    return ok(res, payload, 'Settings fetched');
  } catch (err) { next(err); }
});

// PUT /auth/settings
router.put('/settings', authenticate, async (req, res, next) => {
  try {
    const incomingNotif = req.body?.notificationPrefs || {};
    const incomingPrefs = req.body?.preferences || {};

    const sanitizedNotif = {
      urgentComplaints: incomingNotif.urgentComplaints !== undefined ? !!incomingNotif.urgentComplaints : undefined,
      dailyReport: incomingNotif.dailyReport !== undefined ? !!incomingNotif.dailyReport : undefined,
      hotspotAlert: incomingNotif.hotspotAlert !== undefined ? !!incomingNotif.hotspotAlert : undefined,
      weeklyDigest: incomingNotif.weeklyDigest !== undefined ? !!incomingNotif.weeklyDigest : undefined,
      complaintUpdates: incomingNotif.complaintUpdates !== undefined ? !!incomingNotif.complaintUpdates : undefined,
    };
    const sanitizedPrefs = {
      language: typeof incomingPrefs.language === 'string' ? incomingPrefs.language : undefined,
      theme: typeof incomingPrefs.theme === 'string' ? incomingPrefs.theme : undefined,
    };

    const update = {};
    Object.entries(sanitizedNotif).forEach(([key, value]) => {
      if (value !== undefined) update[`notificationPrefs.${key}`] = value;
    });
    Object.entries(sanitizedPrefs).forEach(([key, value]) => {
      if (value !== undefined) update[`profile.preferences.${key}`] = value;
    });

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('notificationPrefs profile.preferences')
      .lean();
    return ok(res, {
      notificationPrefs: user?.notificationPrefs || {},
      preferences: user?.profile?.preferences || {},
    }, 'Settings updated');
  } catch (err) { next(err); }
});

module.exports = router;
