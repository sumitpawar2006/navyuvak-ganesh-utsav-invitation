import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { get, put } from '@vercel/blob';

type RsvpStatus = 'attending' | 'not-attending';

interface RsvpPayload {
  fullName?: unknown;
  rsvpStatus?: unknown;
  guestCount?: unknown;
  phone?: unknown;
  email?: unknown;
  instagram?: unknown;
  contactConsent?: unknown;
  privacyConsent?: unknown;
  clientId?: unknown;
  website?: unknown;
}

interface StoredRsvp {
  id: string;
  fullName: string;
  rsvpStatus: RsvpStatus;
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
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

const json = (response: ServerResponse, body: object, status = 200) => {
  response.writeHead(status, responseHeaders);
  response.end(JSON.stringify(body));
};

const textValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeDigits = (value: string) =>
  value.replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));

const getExistingRsvp = async (pathname: string): Promise<StoredRsvp | null> => {
  try {
    const result = await get(pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return (await new Response(result.stream).json()) as StoredRsvp;
  } catch {
    return null;
  }
};

const headerValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'POST') {
    return json(response, { ok: false, message: 'ही विनंती मान्य नाही.' }, 405);
  }

  const origin = headerValue(request.headers.origin);
  const forwardedHost = headerValue(request.headers['x-forwarded-host']) ?? request.headers.host;
  if (origin && forwardedHost) {
    try {
      if (new URL(origin).host !== forwardedHost) return json(response, { ok: false, message: 'ही विनंती सुरक्षित नाही.' }, 403);
    } catch {
      return json(response, { ok: false, message: 'ही विनंती सुरक्षित नाही.' }, 403);
    }
  }

  const contentLength = Number(request.headers['content-length'] ?? 0);
  if (contentLength > 12_000) return json(response, { ok: false, message: 'माहितीचा आकार खूप मोठा आहे.' }, 413);

  let payload: RsvpPayload;
  try {
    const parsedBody = (request as IncomingMessage & { body?: unknown }).body;
    if (parsedBody && typeof parsedBody === 'object') {
      payload = parsedBody as RsvpPayload;
    } else {
      let rawBody = '';
      for await (const chunk of request) {
        rawBody += chunk.toString();
        if (Buffer.byteLength(rawBody) > 12_000) return json(response, { ok: false, message: 'माहितीचा आकार खूप मोठा आहे.' }, 413);
      }
      payload = JSON.parse(rawBody) as RsvpPayload;
    }
  } catch {
    return json(response, { ok: false, message: 'कृपया योग्य माहिती पाठवा.' }, 400);
  }

  if (textValue(payload.website)) return json(response, { ok: true });

  const fullName = textValue(payload.fullName).replace(/\s+/g, ' ');
  const rsvpStatus = payload.rsvpStatus as RsvpStatus;
  const guestCount = rsvpStatus === 'attending' ? Number(payload.guestCount) : 0;
  const phone = normalizeDigits(textValue(payload.phone)).replace(/[^\d+]/g, '').replace(/^00/, '+');
  const email = textValue(payload.email).toLowerCase();
  const instagram = textValue(payload.instagram).replace(/^@+/, '');
  const clientId = textValue(payload.clientId);

  if (fullName.length < 2 || fullName.length > 80) {
    return json(response, { ok: false, message: 'कृपया आपले पूर्ण नाव लिहा.' }, 400);
  }
  if (rsvpStatus !== 'attending' && rsvpStatus !== 'not-attending') {
    return json(response, { ok: false, message: 'कृपया उपस्थितीचा योग्य पर्याय निवडा.' }, 400);
  }
  if (rsvpStatus === 'attending' && (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20)) {
    return json(response, { ok: false, message: 'एकूण व्यक्तींची संख्या १ ते २० दरम्यान लिहा.' }, 400);
  }
  if (phone && !/^\+?\d{10,15}$/.test(phone)) {
    return json(response, { ok: false, message: 'मोबाइल नंबर योग्य स्वरूपात लिहा.' }, 400);
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return json(response, { ok: false, message: 'Email / Gmail पत्ता योग्य स्वरूपात लिहा.' }, 400);
  }
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    return json(response, { ok: false, message: 'Instagram ID मध्ये फक्त अक्षरे, अंक, dot किंवा underscore वापरा.' }, 400);
  }
  if (payload.privacyConsent !== true) {
    return json(response, { ok: false, message: 'RSVP साठवण्यासाठी आपली संमती आवश्यक आहे.' }, 400);
  }
  if (!clientId || clientId.length > 100 || !/^[A-Za-z0-9._:-]+$/.test(clientId)) {
    return json(response, { ok: false, message: 'कृपया page refresh करून पुन्हा प्रयत्न करा.' }, 400);
  }

  const identity = phone ? `phone:${phone}` : email ? `email:${email}` : instagram ? `instagram:${instagram.toLowerCase()}` : `client:${clientId}`;
  const hash = createHash('sha256').update(identity).digest('hex');
  const pathname = `rsvps/${hash}.json`;
  const existing = await getExistingRsvp(pathname);
  const now = new Date().toISOString();
  const entry: StoredRsvp = {
    id: hash.slice(0, 12),
    fullName,
    rsvpStatus,
    guestCount,
    phone,
    email,
    instagram,
    contactConsent: payload.contactConsent === true,
    privacyConsent: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  try {
    await put(pathname, JSON.stringify(entry), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 60,
    });
  } catch (error) {
    console.error('Unable to store RSVP', error);
    return json(response, { ok: false, message: 'प्रतिसाद जतन झाला नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.' }, 500);
  }

  return json(response, { ok: true, updated: Boolean(existing) });
}
