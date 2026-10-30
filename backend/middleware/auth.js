import crypto from 'node:crypto';
import 'dotenv/config';

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32 || SESSION_SECRET === 'fieldstock-development-session-secret') {
  throw new Error('SESSION_SECRET must be a private random value of at least 32 characters.');
}
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

export function createSessionToken(user) {
  const payload = Buffer.from(JSON.stringify({ email: user.email, expiresAt: Date.now() + SESSION_DURATION_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Authentication is required.' });

  const [payload, signature] = token.split('.');
  const suppliedSignature = Buffer.from(signature || '');
  const expectedSignature = Buffer.from(payload ? sign(payload) : '');
  if (!payload || suppliedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(suppliedSignature, expectedSignature)) {
    return res.status(401).json({ success: false, message: 'Invalid session.' });
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!session.email || session.expiresAt < Date.now()) throw new Error('Expired session');
    req.user = { email: session.email };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
  }
}
