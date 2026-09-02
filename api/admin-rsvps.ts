import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { del, get, list } from '@vercel/blob';

interface StoredRsvp {
  id: string;
  fullName: string;
  rsvpStatus: 'attending' | 'not-attending';
  guestCount: number;
  phone: string;
  email: string;
  instagram: string;
  contactConsent: boolean;
  privacyConsent: true;
  createdAt: string;
  updatedAt: string;
}

const responseHeaders = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

const json = (response: ServerResponse, body: object, status = 200) => {
  response.writeHead(status, responseHeaders);
  response.end(JSON.stringify(body));
};

const validPassword = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
};

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return json(response, { ok: false, message: 'ही विनंती मान्य नाही.' }, 405);
  }

  const expectedPassword = process.env.ORGANIZER_DASHBOARD_PASSWORD ?? '';
  const rawAuthorization = request.headers.authorization;
  const authorization = Array.isArray(rawAuthorization) ? rawAuthorization[0] : rawAuthorization ?? '';
  const providedPassword = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!expectedPassword || !validPassword(providedPassword, expectedPassword)) {
    return json(response, { ok: false, message: 'Dashboard password चुकीचा आहे.' }, 401);
  }

  if (request.method === 'DELETE') {
    const rawId = request.headers['x-rsvp-id'];
    const id = Array.isArray(rawId) ? rawId[0] : rawId ?? '';
    if (!/^[a-f0-9]{64}$/.test(id)) return json(response, { ok: false, message: 'RSVP ID चुकीचा आहे.' }, 400);
    try {
      await del(`rsvps/${id}.json`);
      return json(response, { ok: true });
    } catch (error) {
      console.error('Unable to delete RSVP', error);
      return json(response, { ok: false, message: 'RSVP delete झाला नाही.' }, 500);
    }
  }

  try {
    const blobPaths: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: 'rsvps/', limit: 1000, cursor });
      blobPaths.push(...page.blobs.map((blob) => blob.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const results = await Promise.all(
      blobPaths.map(async (pathname) => {
        try {
          const blob = await get(pathname, { access: 'private', useCache: false });
          if (!blob || blob.statusCode !== 200) return null;
          return (await new Response(blob.stream).json()) as StoredRsvp;
        } catch {
          return null;
        }
      }),
    );

    const entries = results
      .filter((entry): entry is StoredRsvp => Boolean(entry))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const attending = entries.filter((entry) => entry.rsvpStatus === 'attending');

    return json(response, {
      ok: true,
      summary: {
        uniqueResponses: entries.length,
        attendingResponses: attending.length,
        notAttendingResponses: entries.length - attending.length,
        expectedGuests: attending.reduce((sum, entry) => sum + entry.guestCount, 0),
        contactConsent: entries.filter((entry) => entry.contactConsent).length,
        withPhone: entries.filter((entry) => entry.phone).length,
        withEmail: entries.filter((entry) => entry.email).length,
        withInstagram: entries.filter((entry) => entry.instagram).length,
      },
      entries,
    });
  } catch (error) {
    console.error('Unable to load organizer dashboard', error);
    return json(response, { ok: false, message: 'Dashboard data मिळाला नाही. कृपया पुन्हा प्रयत्न करा.' }, 500);
  }
}
