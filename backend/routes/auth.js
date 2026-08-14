const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

/**
 * Name-Based Access System
 * Single configured authorized scorer name in environment variable (default: "tulasi").
 * Does NOT expose the authorized name or permissions errors to clients.
 */

// POST /api/auth/session — Main entry point when anyone enters their name
router.post('/session', async (req, res) => {
  try {
    const rawName = req.body.name || req.body.username || req.body.email || '';
    const nameClean = String(rawName).trim();

    if (!nameClean) {
      return res.status(400).json({ error: 'Name is required', code: 'NAME_REQUIRED' });
    }

    // Single authorized scorer name configured in backend
    const configuredScorer = (process.env.AUTHORIZED_SCORER_NAME || 'tulasi').trim();

    // Sensible case-insensitive, trimmed comparison
    const isScorer = nameClean.toLowerCase() === configuredScorer.toLowerCase();

    const secret = process.env.JWT_SECRET || 'ah6_cricket_secret_key_2026_tulasi';

    const token = jwt.sign(
      {
        name: nameClean,
        is_scorer: isScorer,
        session_id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      name: nameClean,
      is_scorer: isScorer,
      user: { name: nameClean, is_scorer: isScorer },
    });
  } catch (err) {
    console.error('Session auth error:', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

// Legacy /login endpoint compatibility — maps to session endpoint
router.post('/login', async (req, res) => {
  try {
    const rawName = req.body.name || req.body.username || req.body.email || 'Visitor';
    const nameClean = String(rawName).trim();
    const configuredScorer = (process.env.AUTHORIZED_SCORER_NAME || 'tulasi').trim();
    const password = req.body.password || '';

    // If password provided or username matches, check if scorer
    const isScorer = nameClean.toLowerCase() === configuredScorer.toLowerCase() || password === (process.env.SCORER_PASSWORD || '');
    const secret = process.env.JWT_SECRET || 'ah6_cricket_secret_key_2026_tulasi';

    const token = jwt.sign(
      {
        name: isScorer ? configuredScorer : nameClean,
        is_scorer: isScorer,
        session_id: Date.now().toString(),
      },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      name: isScorer ? configuredScorer : nameClean,
      is_scorer: isScorer,
      user: { name: isScorer ? configuredScorer : nameClean, is_scorer: isScorer },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }
  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'ah6_cricket_secret_key_2026_tulasi';
  try {
    const decoded = jwt.verify(token, secret);
    res.json({
      valid: true,
      name: decoded.name,
      is_scorer: !!decoded.is_scorer,
      user: { name: decoded.name, is_scorer: !!decoded.is_scorer },
    });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
