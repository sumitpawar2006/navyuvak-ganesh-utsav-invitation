const MAX_NAME_LENGTH = 80;

const cleanName = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/^प्रिय\s+/u, '')
    .replace(/[^\p{L}\p{M}\s'’-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);

const getMarathiSuggestion = async (name) => {
  if (!/[a-z]/i.test(name)) return name;

  const url = new URL('https://inputtools.google.com/request');
  url.searchParams.set('itc', 'mr-t-i0-und');
  url.searchParams.set('text', name);
  url.searchParams.set('num', '3');

  const result = await fetch(url, {
    signal: AbortSignal.timeout(5_000),
    headers: { Accept: 'application/json' },
  }).then((response) => {
    if (!response.ok) throw new Error(`Transliteration returned ${response.status}`);
    return response.json();
  });

  const suggestion = result?.[0] === 'SUCCESS' ? result?.[1]?.[0]?.[1]?.[0] : '';
  return cleanName(suggestion) || name;
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.statusCode = 405;
    response.end('Method not allowed');
    return;
  }

  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const suppliedName = cleanName(requestUrl.searchParams.get('name'));

  if (!suppliedName) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'Name is required' }));
    return;
  }

  try {
    const name = await getMarathiSuggestion(suppliedName);
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.end(JSON.stringify({ name }));
  } catch (error) {
    console.error('Marathi transliteration failed', error);
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ name: suppliedName, fallback: true }));
  }
}
