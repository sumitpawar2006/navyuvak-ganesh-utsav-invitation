import { hasSameOrigin, isAuthenticated, sendJson } from '../lib/auth.mjs';

const PROJECT_ID = 'prj_8cHQDsorGRcBoY2dGKQfiz9zIV5E';
const TEAM_ID = 'team_0PlzbptZgdyMAWWrlM9BEplm';

export default async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  if (!hasSameOrigin(request)) return sendJson(response, 403, { error: 'Invalid request origin.' });
  if (!isAuthenticated(request)) return sendJson(response, 401, { error: 'Authentication required.' });

  const action = typeof request.body === 'object' ? request.body?.action : undefined;
  if (!['pause', 'resume'].includes(action)) return sendJson(response, 400, { error: 'Invalid website action.' });

  const endpoint = action === 'pause' ? 'pause' : 'unpause';
  try {
    const vercelResponse = await fetch(`https://api.vercel.com/v1/projects/${PROJECT_ID}/${endpoint}?teamId=${TEAM_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const result = await vercelResponse.json().catch(() => ({}));
    if (!vercelResponse.ok) {
      const message = result?.error?.message ?? 'Vercel rejected the website change.';
      return sendJson(response, vercelResponse.status, { error: message });
    }
    return sendJson(response, 200, { ok: true, status: action === 'pause' ? 'offline' : 'online' });
  } catch {
    return sendJson(response, 502, { error: 'Unable to contact Vercel. Please try again.' });
  }
}
