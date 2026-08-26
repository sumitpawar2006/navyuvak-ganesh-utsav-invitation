const createAudioContext = () => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
};

const playTone = (
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine'
) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
};

export const playTempleChime = () => {
  try {
    const context = createAudioContext();
    if (!context) return;
    const now = context.currentTime;
    playTone(context, 523.25, now, 1.4, 0.12, 'sine');
    playTone(context, 783.99, now + 0.08, 1.7, 0.08, 'sine');
    playTone(context, 1046.5, now + 0.16, 2, 0.055, 'triangle');
  } catch (error) {
    console.warn('Invitation chime could not play.', error);
  }
};

export const playCelebrationFanfare = () => {
  try {
    const context = createAudioContext();
    if (!context) return;
    const now = context.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      playTone(context, frequency, now + index * 0.1, 0.9 + index * 0.12, 0.08, index < 2 ? 'triangle' : 'sine');
    });
  } catch (error) {
    console.warn('Celebration chime could not play.', error);
  }
};
