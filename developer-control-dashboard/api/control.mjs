import { hasSameOrigin, isAuthenticated, sendJson } from '../lib/auth.mjs';

const TEAM_ID = 'team_0PlzbptZgdyMAWWrlM9BEplm';
const ACTIVE_DEPLOYMENT_ID = process.env.INVITATION_ACTIVE_DEPLOYMENT_ID ?? 'dpl_CcbvzwQnzNh3eS894k6Jki1GHCiV';
const PUBLIC_ALIAS = 'navyuvak-ganesh-utsav-2026.vercel.app';

export default async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  if (!hasSameOrigin(request)) return sendJson(response, 403, { error: 'Invalid request origin.' });
  if (!isAuthenticated(request)) return sendJson(response, 401, { error: 'Authentication required.' });

  const action = typeof request.body === 'object' ? request.body?.action : undefined;
  if (!['pause', 'resume'].includes(action)) return sendJson(response, 400, { error: 'Invalid website action.' });

  const deploymentId = action === 'resume' ? ACTIVE_DEPLOYMENT_ID : process.env.INVITATION_CLOSED_DEPLOYMENT_ID;
  if (!deploymentId) return sendJson(response, 503, { error: 'The professional closing page is not configured yet.' });

  try {
    const vercelResponse = await fetch(`https://api.vercel.com/now/deployments/${deploymentId}/aliases?teamId=${TEAM_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alias: PUBLIC_ALIAS }),
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
