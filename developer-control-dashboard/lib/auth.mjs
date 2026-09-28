import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'invitation_admin';
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

const encode = (value) => Buffer.from(value).toString('base64url');
const sign = (value) => createHmac('sha256', requireEnvironment('SESSION_SECRET')).update(value).digest('base64url');

const requireEnvironment = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const safelyEqual = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const readCookies = (request) => Object.fromEntries(
  String(request.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [part, ''];
      return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    }),
);

export const verifyPassword = (password) => {
  const [salt, expected] = requireEnvironment('ADMIN_PASSWORD_HASH').split(':');
  if (!salt || !expected || typeof password !== 'string') return false;
  const actual = scryptSync(password, salt, 64).toString('hex');
  return safelyEqual(actual, expected);
};

export const createSessionCookie = () => {
  const payload = encode(JSON.stringify({ exp: Date.now() + SESSION_DURATION_SECONDS * 1000 }));
  const session = `${payload}.${sign(payload)}`;
  return `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}`;
};

export const clearSessionCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export const isAuthenticated = (request) => {
  try {
    const session = readCookies(request)[SESSION_COOKIE];
    if (!session) return false;
    const [payload, signature] = session.split('.');
    if (!payload || !signature || !safelyEqual(signature, sign(payload))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(data.exp) && data.exp > Date.now();
  } catch {
    return false;
  }
};

export const hasSameOrigin = (request) => {
  const origin = request.headers.origin;
  const host = request.headers['x-forwarded-host'] ?? request.headers.host;
  if (!origin || !host) return false;
  return origin === `https://${host}` || origin === `http://${host}`;
};

export const sendJson = (response, status, body) => {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).json(body);
};
