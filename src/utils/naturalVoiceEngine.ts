const MAX_CHUNK_LENGTH = 120;

type SpeechOptions = {
  isMuted?: boolean;
  startDelayMs?: number;
  audioUrl?: string;
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
let activeAudio: HTMLAudioElement | null = null;
let startTimer: number | null = null;

const formatForSpeech = (value: string) =>
  value
    .replace(/६:००|\b6:00\s*PM\b/gi, 'सायंकाळी सहा वाजता')
    .replace(/१४ सप्टेंबर २०२६|\b14 September 2026\b/gi, 'चौदा सप्टेंबर, दोन हजार सव्वीस')
    .replace(/एमआयडीसी|\bMIDC\b/gi, 'एम आय डी सी')
    .replace(/४४००१६|\b440016\b/g, 'चार चार शून्य शून्य एक सहा')
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
  const sentences = text.match(/[^.!?।]+[.!?।]?/g) ?? [text];
  return sentences.flatMap((sentence) => splitLongSentence(sentence.trim())).filter(Boolean);
};

const voiceScore = (voice: SpeechSynthesisVoice) => {
  const name = voice.name.toLowerCase();
  let score = 0;

  if (/natural|neural|wavenet|online|enhanced|premium/.test(name)) score += 300;
  if (/aarohi/.test(name)) score += 180;
  if (/manohar/.test(name)) score += 160;
  if (/swara|madhur|kalpana|hemant/.test(name)) score += 140;
  if (/google/.test(name)) score += 100;
  if (/microsoft/.test(name)) score += 90;
  if (/marathi|मराठी/.test(name)) score += 70;
  if (!voice.localService) score += 40;
  if (/desktop|compact|espeak/.test(name)) score -= 220;

  return score;
};

const isMarathiVoice = (voice: SpeechSynthesisVoice) => {
  const language = voice.lang.toLowerCase().replace('_', '-');
  const name = voice.name.toLowerCase();
  return language === 'mr-in' || language.startsWith('mr-') || /marathi|मराठी/.test(name);
};

const isHindiVoice = (voice: SpeechSynthesisVoice) => {
  const language = voice.lang.toLowerCase().replace('_', '-');
  const name = voice.name.toLowerCase();
  return language === 'hi-in' || language.startsWith('hi-') || /hindi|हिंदी/.test(name);
};

export const getBestNaturalVoices = () => {
  if (!window.speechSynthesis) return [];
  const voices = [...window.speechSynthesis.getVoices()];
  const marathiVoices = voices
    .filter(isMarathiVoice)
    .sort((first, second) => voiceScore(second) - voiceScore(first));

  if (marathiVoices.length > 0) return marathiVoices;

  return voices
    .filter(isHindiVoice)
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

const releaseActiveAudio = () => {
  if (!activeAudio) return;

  activeAudio.onplay = null;
  activeAudio.onended = null;
  activeAudio.onerror = null;
  activeAudio.pause();
  try {
    activeAudio.currentTime = 0;
  } catch {
    // Some browsers reject seeking before audio metadata is available.
  }
  activeAudio = null;
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
  releaseActiveAudio();
  window.speechSynthesis?.cancel();
  previousSession?.finish();
};

export const speakNaturalText = (rawText: string, options: SpeechOptions) => {
  const { isMuted, startDelayMs = 80, audioUrl, onStart, onEnd } = options;
  cancelNaturalSpeech();

  const sessionId = ++sessionCounter;
  let finished = false;
  let started = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (activeSession?.id === sessionId) {
      activeSession = null;
      if (startTimer !== null) {
        window.clearTimeout(startTimer);
        startTimer = null;
      }
      activeUtterances = [];
      releaseActiveAudio();
    }
    onEnd?.();
  };

  activeSession = { id: sessionId, finish };

  if (isMuted) {
    onStart?.();
    startTimer = window.setTimeout(finish, 450);
    return;
  }

  const startSpeechSynthesis = () => {
    if (activeSession?.id !== sessionId) return;
    if (!window.speechSynthesis) {
      finish();
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
        utterance.lang = selectedVoice?.lang || 'mr-IN';
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
      }, audioUrl ? 80 : Math.max(80, startDelayMs));
    });
  };

  if (!audioUrl) {
    startSpeechSynthesis();
    return;
  }

  const audio = new Audio(audioUrl);
  const requestedStartAt = Date.now() + Math.max(80, startDelayMs);
  let fallingBack = false;
  activeAudio = audio;
  audio.preload = 'auto';

  const fallbackToSpeech = () => {
    if (fallingBack || activeSession?.id !== sessionId) return;
    fallingBack = true;
    releaseActiveAudio();
    startSpeechSynthesis();
  };

  const beginRecordedPlayback = () => {
    startTimer = null;
    if (activeSession?.id !== sessionId) return;

    audio.muted = false;
    audio.volume = 1;
    try {
      audio.currentTime = 0;
    } catch {
      // Playback can still begin normally when seeking is unavailable.
    }

    audio.onplay = () => {
      if (activeSession?.id !== sessionId || started) return;
      started = true;
      onStart?.();
    };
    audio.onended = finish;
    audio.onerror = fallbackToSpeech;
    void audio.play().catch(fallbackToSpeech);
  };

  const scheduleRecordedPlayback = () => {
    if (activeSession?.id !== sessionId) return;
    const remainingDelay = Math.max(0, requestedStartAt - Date.now());
    startTimer = window.setTimeout(beginRecordedPlayback, remainingDelay);
  };

  // Priming the same audio element immediately after the user's click makes
  // delayed playback reliable on stricter mobile browsers.
  audio.muted = true;
  void audio.play()
    .then(() => {
      if (activeSession?.id !== sessionId) return;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // The real playback below will begin from the available position.
      }
      audio.muted = false;
      scheduleRecordedPlayback();
    })
    .catch(() => {
      audio.muted = false;
      scheduleRecordedPlayback();
    });
};
