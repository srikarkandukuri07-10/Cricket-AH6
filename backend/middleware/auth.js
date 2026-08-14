const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required', code: 'UNAUTHORIZED' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'ah6_cricket_secret_key_2026_tulasi';

  try {
    const decoded = jwt.verify(token, secret);
    
    // Strict Server-Side Scorer Authorization Check
    if (!decoded.is_scorer && decoded.role !== 'scorer') {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}

module.exports = { authMiddleware };
