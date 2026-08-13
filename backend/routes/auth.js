const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Single shared scorer account — credentials from environment variables
router.post('/login', async (req, res) => {
  try {
    const userEmail = req.body.email || req.body.username;
    const { password } = req.body;

    if (!userEmail || !password) {
      return res.status(400).json({ error: 'Email/Username and password required', code: 'MISSING_FIELDS' });
    }

    const expectedEmail = process.env.SCORER_EMAIL;
    const expectedPassword = process.env.SCORER_PASSWORD;

    if (!expectedEmail || !expectedPassword) {
      return res.status(500).json({ error: 'Server not configured', code: 'SERVER_ERROR' });
    }

    if (userEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Support both plain text password (for simplicity) and bcrypt hash
    let passwordValid = false;
    if (expectedPassword.startsWith('$2')) {
      // Bcrypt hash
      passwordValid = await bcrypt.compare(password, expectedPassword);
    } else {
      // Plain text comparison (simpler for apartment setup)
      passwordValid = password === expectedPassword;
    }

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const token = jwt.sign(
      { email: expectedEmail, role: 'scorer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      expiresIn: '7d',
      user: { email: expectedEmail, role: 'scorer' },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
