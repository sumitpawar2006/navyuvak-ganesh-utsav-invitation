import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const VOICE_NAME = 'mr-IN-AarohiNeural';
const MAX_NAME_LENGTH = 80;

const cleanName = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/^प्रिय\s+/u, '')
    .replace(/[^\p{L}\p{M}\s'’-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);

const buildSpeech = (name) =>
  `गणपती बाप्पा मोरया! प्रिय ${name || 'भाविक'}, नवयुवक गणेश उत्सव मंडळ, म्हाडा कॉलनी येथे विराजमान गणरायाचे दर्शन आणि आशीर्वाद घेण्यासाठी आपणास आणि आपल्या परिवारास सस्नेह आमंत्रण. सार्वजनिक मैदान, म्हाडा कॉलनी, इलेक्ट्रॉनिक झोन चौक, एम आय डी सी, हिंगणा रोड, नागपूर येथे सहकुटुंब अवश्य या. आपल्या उपस्थितीने उत्सवाचा आनंद अधिक मंगलमय होईल. आपले मनःपूर्वक स्वागत आहे. गणपती बाप्पा मोरया!`;

export const config = {
  maxDuration: 20,
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.statusCode = 405;
    response.end('Method not allowed');
    return;
  }

  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const name = cleanName(requestUrl.searchParams.get('name'));
  const tts = new MsEdgeTTS();

  try {
    await tts.setMetadata(
      VOICE_NAME,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(buildSpeech(name), {
      rate: '-5%',
      pitch: '+2Hz',
      volume: '+0%',
    });
    const chunks = [];

    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const audio = Buffer.concat(chunks);
    if (audio.length === 0) throw new Error('Empty narration audio');

    response.statusCode = 200;
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Content-Length', String(audio.length));
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(audio);
  } catch (error) {
    console.error('Marathi narration failed', error);
    response.statusCode = 503;
    response.setHeader('Cache-Control', 'no-store');
    response.end('Narration unavailable');
  } finally {
    tts.close();
  }
}
