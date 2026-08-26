const formatForSpeech = (value: string) =>
  value
    .replace(/\b6:00 PM\b/gi, 'six P M')
    .replace(/\b14 September 2026\b/gi, 'the fourteenth of September, twenty twenty-six')
    .replace(/\bMIDC\b/g, 'M I D C')
    .replace(/\b440016\b/g, 'four four zero zero one six')
    .replace(/\bMhada\b/gi, 'M H A D A')
    .replace(/\bUtsav\b/gi, 'Ootsav')
    .replace(/\bMorya\b/gi, 'Morya')
    .replace(/([.!?])\s+/g, '$1   ');

export const getBestNaturalVoices = () => {
  if (!window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();

  const score = (voice: SpeechSynthesisVoice) => {
    const name = voice.name.toLowerCase();
    const language = voice.lang.toLowerCase();
    let value = 0;
    if (language === 'en-in') value += 100;
    if (/natural|neural|wavenet|online|enhanced/.test(name)) value += 70;
    if (/neerja|shruti|prabhat|ravi|india/.test(name)) value += 45;
    if (language.startsWith('en')) value += 25;
    if (/desktop|compact|espeak/.test(name)) value -= 60;
    return value;
  };

  return [...voices].filter((voice) => voice.lang.toLowerCase().startsWith('en')).sort((a, b) => score(b) - score(a));
};

export const speakNaturalText = (
  rawText: string,
  options: {
    isMuted?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
  }
) => {
  const { isMuted, onStart, onEnd } = options;
  if (!window.speechSynthesis) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  if (isMuted) {
    onStart?.();
    window.setTimeout(() => onEnd?.(), 550);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(formatForSpeech(rawText));
  const voices = getBestNaturalVoices();
  if (voices[0]) utterance.voice = voices[0];
  utterance.lang = voices[0]?.lang || 'en-IN';
  utterance.rate = 0.9;
  utterance.pitch = 1.02;
  utterance.volume = 0.95;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  try {
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
  }
};
