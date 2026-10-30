import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import express from 'express';

// Keep these database-free checks independent of private local configuration.
process.env.SESSION_SECRET = randomBytes(48).toString('hex');
const { default: authRoutes } = await import('../routes/authRoutes.js');
const { createSessionToken, requireAuth } = await import('../middleware/auth.js');

test('registration stays closed for the public demo and tokens protect requests', async () => {
  const previousFrontend = process.env.SERVE_FRONTEND;
  const previousRegistration = process.env.ALLOW_REGISTRATION;
  process.env.SERVE_FRONTEND = 'true';
  process.env.ALLOW_REGISTRATION = 'true';
  const app = express();
  app.use(express.json());
  app.use('/api', authRoutes);
  app.get('/protected', requireAuth, (req, res) => res.json({ email: req.user.email }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const registration = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(registration.status, 403);
    assert.equal((await registration.json()).success, false);
    delete process.env.SERVE_FRONTEND;
    delete process.env.ALLOW_REGISTRATION;
    assert.equal((await fetch(`${base}/api/auth/register`, { method: 'POST' })).status, 403);
    assert.equal((await fetch(`${base}/protected`)).status, 401);
    const token = createSessionToken({ email: 'demo-test@example.invalid' });
    const authorized = await fetch(`${base}/protected`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(authorized.status, 200);
    assert.equal((await authorized.json()).email, 'demo-test@example.invalid');
    assert.equal((await fetch(`${base}/protected`, { headers: { Authorization: `Bearer ${token}tampered` } })).status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    for (const [key, value] of [['SERVE_FRONTEND', previousFrontend], ['ALLOW_REGISTRATION', previousRegistration]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('weak session secrets fail startup', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import './middleware/auth.js'"], {
    cwd: new URL('../', import.meta.url), env: { ...process.env, SESSION_SECRET: 'weak' }, encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SESSION_SECRET must be/);
});
