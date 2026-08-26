import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Headphones,
  Heart,
  MapPin,
  Mic,
  Phone,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import AudioWaveform from './components/AudioWaveform';
import Avatar from './components/Avatar';
import CelebrationOverlay from './components/CelebrationOverlay';
import InvitationCard, { type RsvpStatus } from './components/InvitationCard';
import { EVENT, buildInvitationSpeech } from './event';
import { playCelebrationFanfare, playTempleChime } from './utils/audioEffects';
import { cancelNaturalSpeech, primeNaturalVoices, speakNaturalText } from './utils/naturalVoiceEngine';

type AppStep = 'welcome' | 'personalize' | 'invitation';

const cleanGuestName = (value: string) =>
  value
    .trim()
    .replace(/^(hello|hi|hey|namaste)\s+/i, '')
    .replace(/^(my name is|i am|i'm|this is|myself)\s+/i, '')
    .replace(/[!?.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

function EventCountdown() {
  const eventTime = useMemo(() => new Date(EVENT.dateTimeISO).getTime(), []);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, eventTime - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining / 3_600_000) % 24);
  const minutes = Math.floor((remaining / 60_000) % 60);

  if (remaining === 0) {
    return (
      <div className="countdown-card" aria-label="The celebration date has arrived">
        <Sparkles aria-hidden="true" />
        <span>The celebration has arrived</span>
      </div>
    );
  }

  return (
    <div className="countdown-card" aria-label={`${days} days, ${hours} hours and ${minutes} minutes until the celebration`}>
      {[
        ['Days', days],
        ['Hours', hours],
        ['Minutes', minutes],
      ].map(([label, value]) => (
        <div key={label} className="countdown-unit">
          <strong>{String(value).padStart(2, '0')}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function EventFact({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="event-fact">
      <span className="event-fact-icon" aria-hidden="true">
        <Icon />
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

export default function App() {
  const sharedGuest = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('guest');
    return value ? cleanGuestName(value) : '';
  }, []);

  const [step, setStep] = useState<AppStep>(sharedGuest ? 'invitation' : 'welcome');
  const [typedName, setTypedName] = useState(sharedGuest);
  const [guestName, setGuestName] = useState(sharedGuest || 'Dear Devotee');
  const [subtitle, setSubtitle] = useState(
    sharedGuest ? `A personal invitation has arrived for ${sharedGuest}.` : 'A devotional celebration awaits.'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [rsvp, setRsvp] = useState<RsvpStatus>('pending');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    primeNaturalVoices();

    return () => {
      recognitionRef.current?.stop?.();
      cancelNaturalSpeech();
    };
  }, []);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    const timer = window.setTimeout(() => window.scrollTo(0, 0), 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [step]);

  const speak = (text: string, startDelayMs = 80) => {
    setSubtitle(text);
    speakNaturalText(text, {
      isMuted,
      startDelayMs,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  const openInvitation = () => {
    playTempleChime();
    setStep('personalize');
    speak(
      `Ganpati Bappa Morya! Welcome to ${EVENT.mandalName}, ${EVENT.locality}. Please tell us your name so we can prepare your personal invitation.`,
      900
    );
  };

  const startListening = () => {
    setSpeechError('');
    cancelNaturalSpeech();
    setIsSpeaking(false);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Voice input is not available in this browser. Please type your name instead.');
      return;
    }

    recognitionRef.current?.stop?.();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setSubtitle('Listening for your name…');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      const name = cleanGuestName(transcript);
      if (name) setTypedName(name);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setSpeechError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. You can still type your name below.'
          : 'We could not hear your name clearly. Please try again or type it below.'
      );
    };

    recognition.onend = () => {
      setIsListening(false);
      setSubtitle('Name captured. Review it below and continue.');
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechError('Voice input could not start. Please type your name instead.');
    }
  };

  const revealInvitation = (name: string) => {
    const formattedName = cleanGuestName(name) || 'Dear Devotee';
    setGuestName(formattedName);
    setTypedName(formattedName === 'Dear Devotee' ? '' : formattedName);
    setRsvp('pending');
    setStep('invitation');
    playTempleChime();

    const url = new URL(window.location.href);
    if (formattedName === 'Dear Devotee') url.searchParams.delete('guest');
    else url.searchParams.set('guest', formattedName);
    window.history.replaceState({}, '', url);

    speak(buildInvitationSpeech(formattedName), 900);
  };

  const submitName = (event: FormEvent) => {
    event.preventDefault();
    if (!typedName.trim()) {
      setSpeechError('Please enter your name, or continue as a devotee.');
      return;
    }
    revealInvitation(typedName);
  };

  const reset = () => {
    recognitionRef.current?.stop?.();
    cancelNaturalSpeech();
    window.history.replaceState({}, '', window.location.pathname);
    setStep('welcome');
    setTypedName('');
    setGuestName('Dear Devotee');
    setSubtitle('A devotional celebration awaits.');
    setIsListening(false);
    setIsSpeaking(false);
    setSpeechError('');
    setRsvp('pending');
  };

  const updateRsvp = (status: RsvpStatus) => {
    setRsvp(status);
    const spokenGuest = guestName.replace(/^dear\s+/i, '');
    if (status === 'attending') {
      playCelebrationFanfare();
      speak(`Thank you, ${spokenGuest}. We are delighted that you will join us. Ganpati Bappa Morya!`, 1250);
    } else if (status === 'not-attending') {
      speak(`Thank you for letting us know, ${spokenGuest}. We will miss your presence and send Bappa's blessings to you and your family.`);
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to invitation</a>

      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />
      <div className="mandala mandala-left" aria-hidden="true" />
      <div className="mandala mandala-right" aria-hidden="true" />

      <header className="site-header">
        <button className="brand-lockup" onClick={reset} aria-label="Return to invitation welcome screen">
          <img src={EVENT.logoPath} alt="" width="48" height="48" />
          <span>
            <strong>{EVENT.mandalName}</strong>
            <small>{EVENT.locality} • Nagpur</small>
          </span>
        </button>

        <button
          className="icon-button"
          onClick={() => {
            setIsMuted((current) => !current);
            if (!isMuted) {
              cancelNaturalSpeech();
            }
          }}
          aria-label={isMuted ? 'Turn invitation sound on' : 'Mute invitation sound'}
          aria-pressed={isMuted}
        >
          {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.section
              key="welcome"
              className="welcome-grid"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="hero-copy">
                <span className="eyebrow"><Sparkles aria-hidden="true" /> Ganesh Utsav • 2026</span>
                <p className="sacred-line">Ganpati Bappa Morya</p>
                <h1>{EVENT.invitationHeading}</h1>
                <p className="hero-description">
                  With devotion in our hearts, we invite you and your family to join our community in celebrating
                  Bappa’s arrival.
                </p>

                <div className="hero-actions">
                  <button className="primary-button" onClick={openInvitation}>
                    <Play aria-hidden="true" /> Open your invitation <ArrowRight aria-hidden="true" />
                  </button>
                  <a className="text-link" href={`tel:${EVENT.phone}`}>
                    <Phone aria-hidden="true" /> Contact the coordinator
                  </a>
                </div>

                <div className="event-facts" aria-label="Event details">
                  <EventFact icon={CalendarDays} label="Date" value={EVENT.dateDisplay} />
                  <EventFact icon={Clock3} label="Time" value={EVENT.timeDisplay} />
                  <EventFact icon={MapPin} label="Venue" value={EVENT.venueName} />
                </div>
              </div>

              <div className="emblem-stage">
                <div className="emblem-halo" aria-hidden="true" />
                <div className="emblem-frame">
                  <img src={EVENT.logoPath} alt="Navyuvak Mhada Ganesh Utsav Mandal 2026 emblem" width="1254" height="1254" />
                </div>
                <EventCountdown />
                <div className="host-note">
                  <Heart aria-hidden="true" />
                  <span>Hosted with devotion by<strong>{EVENT.mandalName}</strong></span>
                </div>
              </div>
            </motion.section>
          )}

          {step === 'personalize' && (
            <motion.section
              key="personalize"
              className="personalize-layout"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              <div className="personalize-card devotional-frame">
                <span className="eyebrow"><ShieldCheck aria-hidden="true" /> Personalise your invitation</span>
                <h1>How may we address you?</h1>
                <p>Say or type your name. Voice input is optional and is processed by your browser only.</p>

                <Avatar
                  expression={isListening ? 'listening' : isSpeaking ? 'talking' : 'idle'}
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                />

                <div className="subtitle-box" aria-live="polite">
                  <Headphones aria-hidden="true" />
                  <span>{subtitle}</span>
                </div>

                {isListening && <AudioWaveform isRecording />}

                <form className="name-form" onSubmit={submitName}>
                  <label htmlFor="guest-name">Your name</label>
                  <div className="name-field-row">
                    <input
                      id="guest-name"
                      type="text"
                      autoComplete="name"
                      value={typedName}
                      onChange={(event) => {
                        setTypedName(event.target.value);
                        setSpeechError('');
                      }}
                      placeholder="Enter your full name"
                      aria-describedby={speechError ? 'name-error' : 'name-help'}
                    />
                    <button className="voice-button" type="button" onClick={startListening} disabled={isListening}>
                      <Mic aria-hidden="true" /> {isListening ? 'Listening…' : 'Speak'}
                    </button>
                  </div>
                  <p id="name-help" className="field-help">We use your name only to personalise this invitation.</p>
                  {speechError && <p id="name-error" className="field-error" role="alert">{speechError}</p>}

                  <button className="primary-button" type="submit">
                    Prepare my invitation <ArrowRight aria-hidden="true" />
                  </button>
                  <button className="secondary-button" type="button" onClick={() => revealInvitation('Dear Devotee')}>
                    Continue as a devotee
                  </button>
                </form>
              </div>
            </motion.section>
          )}

          {step === 'invitation' && (
            <motion.section
              key="invitation"
              className="invitation-layout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="invitation-toolbar">
                <div className="narration-status" aria-live="polite">
                  <span className={isSpeaking ? 'status-dot active' : 'status-dot'} aria-hidden="true" />
                  <span>{subtitle}</span>
                </div>
                <div className="toolbar-actions">
                  <button
                    className="compact-button"
                    onClick={() => {
                      if (isSpeaking) {
                        cancelNaturalSpeech();
                        return;
                      }
                      playTempleChime();
                      speak(buildInvitationSpeech(guestName), 900);
                    }}
                    aria-pressed={isSpeaking}
                  >
                    {isSpeaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                    {isSpeaking ? 'Stop narration' : 'Hear invitation'}
                  </button>
                  <button className="compact-button" onClick={reset}>
                    <RotateCcw aria-hidden="true" /> Start over
                  </button>
                </div>
              </div>

              <InvitationCard guestName={guestName} rsvp={rsvp} onRsvp={updateRsvp} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="site-footer">
        <span>{EVENT.mandalName} • {EVENT.locality}</span>
        <a href={`tel:${EVENT.phone}`}>{EVENT.coordinator} • {EVENT.phoneDisplay}</a>
      </footer>

      <CelebrationOverlay visible={rsvp === 'attending'} />
    </div>
  );
}
