import { clearSessionCookie, hasSameOrigin, sendJson } from '../lib/auth.mjs';

export default function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  if (!hasSameOrigin(request)) return sendJson(response, 403, { error: 'Invalid request origin.' });
  response.setHeader('Set-Cookie', clearSessionCookie());
  return sendJson(response, 200, { ok: true });
}
