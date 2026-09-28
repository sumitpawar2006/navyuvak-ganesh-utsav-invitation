import { createSessionCookie, hasSameOrigin, sendJson, verifyPassword } from '../lib/auth.mjs';

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const clientAddress = (request) => String(request.headers['x-forwarded-for'] ?? request.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();

export default async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  if (!hasSameOrigin(request)) return sendJson(response, 403, { error: 'Invalid request origin.' });

  const address = clientAddress(request);
  const now = Date.now();
  const record = attempts.get(address);
  const activeRecord = record && record.resetAt > now ? record : { count: 0, resetAt: now + WINDOW_MS };
  if (activeRecord.count >= MAX_ATTEMPTS) {
    response.setHeader('Retry-After', Math.ceil((activeRecord.resetAt - now) / 1000));
    return sendJson(response, 429, { error: 'Too many attempts. Please wait ten minutes and try again.' });
  }

  const password = typeof request.body === 'object' ? request.body?.password : undefined;
  if (!verifyPassword(password)) {
    activeRecord.count += 1;
    attempts.set(address, activeRecord);
    return sendJson(response, 401, { error: 'Incorrect password.' });
  }

  attempts.delete(address);
  response.setHeader('Set-Cookie', createSessionCookie());
  return sendJson(response, 200, { ok: true });
}
