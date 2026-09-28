import { isAuthenticated, sendJson } from '../lib/auth.mjs';

const PUBLIC_SITE = 'https://navyuvak-ganesh-utsav-2026.vercel.app/';

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' });
  if (!isAuthenticated(request)) return sendJson(response, 401, { error: 'Authentication required.' });

  try {
    const siteResponse = await fetch(`${PUBLIC_SITE}?controlCheck=${Date.now()}`, { method: 'GET', cache: 'no-store', redirect: 'manual' });
    const invitationState = siteResponse.headers.get('x-invitation-state');
    const vercelError = siteResponse.headers.get('x-vercel-error');
    const page = siteResponse.ok ? await siteResponse.text() : '';
    if (invitationState === 'offline' || page.includes('data-invitation-state="closed"') || page.includes('मनःपूर्वक धन्यवाद | नवयुवक गणेश उत्सव मंडळ')) {
      return sendJson(response, 200, { status: 'offline' });
    }
    if (siteResponse.status === 503 && vercelError === 'DEPLOYMENT_PAUSED') {
      return sendJson(response, 200, { status: 'unknown' });
    }
    if (siteResponse.ok || (siteResponse.status >= 300 && siteResponse.status < 400)) {
      return sendJson(response, 200, { status: 'online' });
    }
    return sendJson(response, 200, { status: 'unknown' });
  } catch {
    return sendJson(response, 502, { error: 'Unable to read the invitation website status.' });
  }
}
