const MAX_CHUNK_LENGTH = 120;

type SpeechOptions = {
  isMuted?: boolean;
  startDelayMs?: number;
  onStart?: () => void;
  onEnd?: () => void;
};

type SpeechSession = {
  id: number;
  finish: () => void;
};

let sessionCounter = 0;
let activeSession: SpeechSession | null = null;
let activeUtterances: SpeechSynthesisUtterance[] = [];
let startTimer: number | null = null;

const formatForSpeech = (value: string) =>
  value
    .replace(/\b6:00 PM\b/gi, 'six in the evening')
    .replace(/\b14 September 2026\b/gi, 'the fourteenth of September, twenty twenty-six')
    .replace(/\bMIDC\b/g, 'M I D C')
    .replace(/\b440016\b/g, 'four four zero zero one six')
    .replace(/\bUtsav\b/gi, 'Ootsav')
    .replace(/\s+/g, ' ')
    .trim();

const splitLongSentence = (sentence: string) => {
  if (sentence.length <= MAX_CHUNK_LENGTH) return [sentence];

  const splitByWords = (value: string) => {
    const wordChunks: string[] = [];
    let current = '';

    value.split(' ').forEach((word) => {
      const next = `${current} ${word}`.trim();
      if (current && next.length > MAX_CHUNK_LENGTH) {
        wordChunks.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) wordChunks.push(current);
    return wordChunks;
  };

  const clauses = sentence.match(/[^,]+,?\s*/g) ?? [sentence];
  const chunks: string[] = [];
  let current = '';

  clauses.forEach((clause) => {
    const next = `${current} ${clause.trim()}`.trim();
    if (current && next.length > MAX_CHUNK_LENGTH) {
      chunks.push(current.trim());
      current = clause.trim();
    } else {
      current = next;
    }
  });

  if (current) chunks.push(current.trim());
  return chunks.flatMap((chunk) => (chunk.length > MAX_CHUNK_LENGTH ? splitByWords(chunk) : [chunk]));
};

export const createSpeechChunks = (rawText: string) => {
  const text = formatForSpeech(rawText);
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  return sentences.flatMap((sentence) => splitLongSentence(sentence.trim())).filter(Boolean);
};

const voiceScore = (voice: SpeechSynthesisVoice) => {
  const name = voice.name.toLowerCase();
  let score = 0;

  if (/natural|neural|wavenet|online|enhanced|premium/.test(name)) score += 300;
  if (/neerja/.test(name)) score += 180;
  if (/prabhat/.test(name)) score += 160;
  if (/google/.test(name)) score += 100;
  if (/microsoft/.test(name)) score += 90;
  if (/heera|veena|ravi/.test(name)) score += 70;
  if (!voice.localService) score += 40;
  if (/desktop|compact|espeak/.test(name)) score -= 220;

  return score;
};

const isIndianEnglishVoice = (voice: SpeechSynthesisVoice) => {
  const language = voice.lang.toLowerCase().replace('_', '-');
  const name = voice.name.toLowerCase();
  return language === 'en-in' || /english\s*\(?india\)?|india.*english/.test(name);
};

export const getBestNaturalVoices = () => {
  if (!window.speechSynthesis) return [];
  return [...window.speechSynthesis.getVoices()]
    .filter(isIndianEnglishVoice)
    .sort((first, second) => voiceScore(second) - voiceScore(first));
};

const waitForVoices = () =>
  new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const available = getBestNaturalVoices();
    if (available.length > 0) {
      resolve(available);
      return;
    }

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', settle);
      resolve(getBestNaturalVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', settle, { once: true });
    window.setTimeout(settle, 700);
  });

export const primeNaturalVoices = () => {
  window.speechSynthesis?.getVoices();
};

export const cancelNaturalSpeech = () => {
  sessionCounter += 1;
  if (startTimer !== null) {
    window.clearTimeout(startTimer);
    startTimer = null;
  }

  const previousSession = activeSession;
  activeSession = null;
  activeUtterances = [];
  window.speechSynthesis?.cancel();
  previousSession?.finish();
};

export const speakNaturalText = (rawText: string, options: SpeechOptions) => {
  const { isMuted, startDelayMs = 80, onStart, onEnd } = options;
  cancelNaturalSpeech();

  if (!window.speechSynthesis) {
    onEnd?.();
    return;
  }

  const sessionId = ++sessionCounter;
  let finished = false;
  let started = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (activeSession?.id === sessionId) activeSession = null;
    activeUtterances = [];
    onEnd?.();
  };

  activeSession = { id: sessionId, finish };

  if (isMuted) {
    onStart?.();
    startTimer = window.setTimeout(finish, 450);
    return;
  }

  void waitForVoices().then((voices) => {
    if (activeSession?.id !== sessionId) return;

    const chunks = createSpeechChunks(rawText);
    if (chunks.length === 0) {
      finish();
      return;
    }

    const selectedVoice = voices[0];
    const selectedVoiceName = selectedVoice?.name.toLowerCase() ?? '';
    const hasNaturalVoice = /natural|neural|wavenet|online|enhanced|premium/.test(selectedVoiceName);
    let completedChunks = 0;

    activeUtterances = chunks.map((chunk) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      let chunkCompleted = false;
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.lang = 'en-IN';
      utterance.rate = hasNaturalVoice ? 0.92 : 0.88;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        if (activeSession?.id !== sessionId || started) return;
        started = true;
        onStart?.();
      };

      const markChunkComplete = () => {
        if (activeSession?.id !== sessionId || chunkCompleted) return;
        chunkCompleted = true;
        completedChunks += 1;
        if (completedChunks >= chunks.length) finish();
      };

      utterance.onend = markChunkComplete;
      utterance.onerror = markChunkComplete;
      return utterance;
    });

    startTimer = window.setTimeout(() => {
      startTimer = null;
      if (activeSession?.id !== sessionId) return;

      try {
        window.speechSynthesis.resume();
        activeUtterances.forEach((utterance) => window.speechSynthesis.speak(utterance));
      } catch {
        finish();
      }
    }, Math.max(80, startDelayMs));
  });
};
