import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { createSessionToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login - check credentials against login_users collection
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with that email.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: { email: user.email, name: user.name, role: user.role },
      token: createSessionToken(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/register - create a login user (helper for seeding accounts)
router.post('/auth/register', async (req, res) => {
  if (process.env.ALLOW_REGISTRATION !== 'true' || process.env.SERVE_FRONTEND === 'true') {
    return res.status(403).json({ success: false, message: 'Public registration is disabled. Contact your team administrator.' });
  }
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email: String(email).toLowerCase().trim(), password: hashedPassword, name, role });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
