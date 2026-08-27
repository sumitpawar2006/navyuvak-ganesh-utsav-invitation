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
import { cancelNaturalSpeech, primeNaturalVoices, speakNaturalText } from './utils/naturalVoiceEngine';

type AppStep = 'welcome' | 'personalize' | 'invitation';

const NARRATION_AUDIO = {
  welcome: '/audio/welcome-marathi.mp3',
  invitation: '/audio/invitation-marathi.mp3',
  attending: '/audio/attending-marathi.mp3',
  notAttending: '/audio/not-attending-marathi.mp3',
} as const;

const WELCOME_SPEECH = `गणपती बाप्पा मोरया! ${EVENT.mandalName}, ${EVENT.locality} तर्फे आपले हार्दिक स्वागत आहे। आपले वैयक्तिक आमंत्रण तयार करण्यासाठी कृपया आपले नाव सांगा।`;

const cleanGuestName = (value: string) =>
  value
    .trim()
    .replace(/^(नमस्कार|हॅलो|हाय)\s+/u, '')
    .replace(/^(माझे नाव आहे|माझं नाव आहे|माझे नाव|माझं नाव|मी)\s+/u, '')
    .replace(/[!?.,।]+$/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => (/^[a-z]/i.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ');

const formatCount = (value: number) =>
  value.toLocaleString('mr-IN', { minimumIntegerDigits: 2, useGrouping: false });

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
      <div className="countdown-card" aria-label="उत्सवाचा दिवस आला आहे">
        <Sparkles aria-hidden="true" />
        <span>उत्सवाचा दिवस आला आहे</span>
      </div>
    );
  }

  return (
    <div className="countdown-card" aria-label={`उत्सवासाठी ${days} दिवस, ${hours} तास आणि ${minutes} मिनिटे शिल्लक`}>
      {[
        ['दिवस', days],
        ['तास', hours],
        ['मिनिटे', minutes],
      ].map(([label, value]) => (
        <div key={label} className="countdown-unit">
          <strong>{formatCount(value as number)}</strong>
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
  const [guestName, setGuestName] = useState(sharedGuest || 'प्रिय भाविक');
  const [subtitle, setSubtitle] = useState(
    sharedGuest ? `${sharedGuest} यांच्यासाठी वैयक्तिक आमंत्रण आले आहे.` : 'बाप्पाच्या मंगलमय उत्सवाची वाट पाहत आहोत.'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [rsvp, setRsvp] = useState<RsvpStatus>('pending');
  const [supportsVoiceName] = useState(
    () => Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
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

  const speak = (text: string, startDelayMs = 80, audioUrl?: string, forceSound = false) => {
    setSubtitle(text);
    if (isMuted && !forceSound) {
      setIsSpeaking(false);
      setSubtitle('आवाज बंद आहे. वरचे स्पीकर बटण दाबून आवाज सुरू करा.');
      return;
    }

    speakNaturalText(text, {
      isMuted: false,
      startDelayMs,
      audioUrl,
      onStart: () => {
        setIsSpeaking(true);
        setSpeechError('');
      },
      onEnd: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false);
        setSubtitle('आवाज सुरू झाला नाही. फोनचा मीडिया आवाज वाढवा आणि “पुन्हा ऐका” दाबा.');
      },
    });
  };

  const openInvitation = () => {
    setStep('personalize');
    speak(WELCOME_SPEECH, 80, NARRATION_AUDIO.welcome);
  };

  const startListening = () => {
    setSpeechError('');
    cancelNaturalSpeech();
    setIsSpeaking(false);

    if (!supportsVoiceName) {
      setSpeechError('आवाजातून नाव देण्यासाठी हा दुवा Chrome किंवा Edge मध्ये उघडा. येथे नाव टाइप करूनही पुढे जाता येईल.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current?.stop?.();
    const recognition = new SpeechRecognition();
    let recognizedName = '';
    let recognitionFailed = false;
    recognitionRef.current = recognition;
    recognition.lang = 'mr-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setSubtitle('आपले नाव ऐकत आहे…');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      const name = cleanGuestName(transcript);
      if (name) {
        recognizedName = name;
        setTypedName(name);
      }
    };

    recognition.onerror = (event: any) => {
      recognitionFailed = true;
      setIsListening(false);
      const messages: Record<string, string> = {
        'not-allowed': 'मायक्रोफोनची परवानगी मिळाली नाही. ब्राउझर सेटिंगमध्ये मायक्रोफोन सुरू करा किंवा नाव टाइप करा.',
        'audio-capture': 'फोनचा मायक्रोफोन उपलब्ध नाही. दुसरे अॅप बंद करून पुन्हा प्रयत्न करा किंवा नाव टाइप करा.',
        network: 'आवाज ओळख सेवा सध्या उपलब्ध नाही. कृपया नाव टाइप करा.',
        'no-speech': 'नाव ऐकू आले नाही. माइकजवळ स्पष्ट बोला किंवा नाव टाइप करा.',
      };
      setSpeechError(messages[event.error] ?? 'नाव स्पष्ट ऐकू आले नाही. पुन्हा प्रयत्न करा किंवा नाव टाइप करा.');
    };

    recognition.onnomatch = () => {
      recognitionFailed = true;
      setSpeechError('नाव ओळखता आले नाही. कृपया पुन्हा स्पष्ट बोला किंवा नाव टाइप करा.');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (recognitionFailed) return;
      if (recognizedName) {
        setSubtitle(`${recognizedName} हे नाव नोंदवले आहे. कृपया तपासून पुढे जा.`);
      } else {
        setSpeechError('नाव ऐकू आले नाही. पुन्हा “नाव बोला” दाबा किंवा नाव टाइप करा.');
        setSubtitle('नाव ऐकू आले नाही. कृपया पुन्हा प्रयत्न करा.');
      }
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechError('आवाजातून नाव नोंदवता आले नाही. कृपया आपले नाव टाइप करा.');
    }
  };

  const revealInvitation = (name: string) => {
    const formattedName = cleanGuestName(name) || 'प्रिय भाविक';
    setGuestName(formattedName);
    setTypedName(formattedName === 'प्रिय भाविक' ? '' : formattedName);
    setRsvp('pending');
    setStep('invitation');

    const url = new URL(window.location.href);
    if (formattedName === 'प्रिय भाविक') url.searchParams.delete('guest');
    else url.searchParams.set('guest', formattedName);
    window.history.replaceState({}, '', url);

    speak(buildInvitationSpeech(formattedName), 80, NARRATION_AUDIO.invitation);
  };

  const submitName = (event: FormEvent) => {
    event.preventDefault();
    if (!typedName.trim()) {
      setSpeechError('कृपया आपले नाव लिहा किंवा भाविक म्हणून पुढे जा.');
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
    setGuestName('प्रिय भाविक');
    setSubtitle('बाप्पाच्या मंगलमय उत्सवाची वाट पाहत आहोत.');
    setIsListening(false);
    setIsSpeaking(false);
    setSpeechError('');
    setRsvp('pending');
  };

  const updateRsvp = (status: RsvpStatus) => {
    setRsvp(status);
    const spokenGuest = guestName.replace(/^प्रिय\s+/u, '');
    if (status === 'attending') {
      speak(
        `धन्यवाद, ${spokenGuest}। आपण सहकुटुंब येणार असल्याचा आम्हाला आनंद आहे। गणपती बाप्पा मोरया!`,
        80,
        NARRATION_AUDIO.attending
      );
    } else if (status === 'not-attending') {
      speak(
        `कळवल्याबद्दल धन्यवाद, ${spokenGuest}। आपली उपस्थिती आम्हाला नक्कीच उणीव भासेल। बाप्पाचे आशीर्वाद आपणास व आपल्या परिवारास सदैव लाभोत।`,
        80,
        NARRATION_AUDIO.notAttending
      );
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">थेट आमंत्रणाकडे जा</a>

      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />
      <div className="mandala mandala-left" aria-hidden="true" />
      <div className="mandala mandala-right" aria-hidden="true" />

      <header className="site-header">
        <button className="brand-lockup" onClick={reset} aria-label="आमंत्रणाच्या स्वागत पृष्ठावर परत जा">
          <img src={EVENT.logoPath} alt="" width="48" height="48" />
          <span>
            <strong>{EVENT.mandalName}</strong>
            <small>{EVENT.locality} • नागपूर</small>
          </span>
        </button>

        <button
          className="icon-button"
          onClick={() => {
            if (isMuted) {
              setIsMuted(false);
              if (step === 'personalize') speak(WELCOME_SPEECH, 80, NARRATION_AUDIO.welcome, true);
              else if (step === 'invitation') {
                speak(buildInvitationSpeech(guestName), 80, NARRATION_AUDIO.invitation, true);
              } else {
                setSubtitle('आवाज सुरू आहे. आमंत्रण उघडल्यानंतर निवेदन ऐकू येईल.');
              }
            } else {
              setIsMuted(true);
              cancelNaturalSpeech();
              setIsSpeaking(false);
              setSubtitle('आवाज बंद आहे. पुन्हा सुरू करण्यासाठी स्पीकर बटण दाबा.');
            }
          }}
          aria-label={isMuted ? 'आमंत्रणाचा आवाज सुरू करा' : 'आमंत्रणाचा आवाज बंद करा'}
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
                <span className="eyebrow"><Sparkles aria-hidden="true" /> गणेशोत्सव • २०२६</span>
                <p className="sacred-line">गणपती बाप्पा मोरया</p>
                <h1>{EVENT.invitationHeading}</h1>
                <p className="hero-description">
                  भक्तिभावाने बाप्पाच्या आगमनाचा आनंद साजरा करण्यासाठी आपणास व आपल्या परिवारास मनःपूर्वक आमंत्रण.
                </p>

                <div className="hero-actions">
                  <button className="primary-button" onClick={openInvitation}>
                    <Play aria-hidden="true" /> आपले आमंत्रण उघडा <ArrowRight aria-hidden="true" />
                  </button>
                  <a className="text-link" href={`tel:${EVENT.phone}`}>
                    <Phone aria-hidden="true" /> संयोजकाशी संपर्क करा
                  </a>
                </div>

                <div className="event-facts" aria-label="कार्यक्रमाची माहिती">
                  <EventFact icon={CalendarDays} label="दिनांक" value={EVENT.dateDisplay} />
                  <EventFact icon={Clock3} label="वेळ" value={EVENT.timeDisplay} />
                  <EventFact icon={MapPin} label="स्थळ" value={EVENT.venueName} />
                </div>
              </div>

              <div className="emblem-stage">
                <div className="emblem-halo" aria-hidden="true" />
                <div className="emblem-frame">
                  <img src={EVENT.logoPath} alt="नवयुवक म्हाडा गणेश उत्सव मंडळ २०२६ चिन्ह" width="1254" height="1254" />
                </div>
                <EventCountdown />
                <div className="host-note">
                  <Heart aria-hidden="true" />
                  <span>भक्तिभावाने आयोजित<strong>{EVENT.mandalName}</strong></span>
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
                <span className="eyebrow"><ShieldCheck aria-hidden="true" /> आपले आमंत्रण वैयक्तिक करा</span>
                <h1>आपल्याला कोणत्या नावाने संबोधावे?</h1>
                <p>आपले नाव बोला किंवा टाइप करा. आवाजातून नाव देणे ऐच्छिक असून त्याची प्रक्रिया आपल्या ब्राउझरमध्येच होते.</p>

                <Avatar
                  expression={isListening ? 'listening' : isSpeaking ? 'talking' : 'idle'}
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                />

                <div className="subtitle-box" aria-live="polite">
                  <Headphones aria-hidden="true" />
                  <span>{subtitle}</span>
                  <button
                    className="subtitle-replay"
                    type="button"
                    onClick={() => {
                      setIsMuted(false);
                      speak(WELCOME_SPEECH, 80, NARRATION_AUDIO.welcome, true);
                    }}
                  >
                    <Volume2 aria-hidden="true" /> पुन्हा ऐका
                  </button>
                </div>

                {isListening && <AudioWaveform isRecording />}

                <form className="name-form" onSubmit={submitName}>
                  <label htmlFor="guest-name">आपले नाव</label>
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
                      placeholder="आपले पूर्ण नाव लिहा"
                      aria-describedby={
                        speechError ? 'name-help name-error' : supportsVoiceName ? 'name-help' : 'name-help voice-support-help'
                      }
                    />
                    <button
                      className="voice-button"
                      type="button"
                      onClick={startListening}
                      disabled={isListening || !supportsVoiceName}
                      aria-describedby={!supportsVoiceName ? 'voice-support-help' : undefined}
                    >
                      <Mic aria-hidden="true" />
                      {isListening ? 'ऐकत आहे…' : supportsVoiceName ? 'नाव बोला' : 'आवाज उपलब्ध नाही'}
                    </button>
                  </div>
                  <p id="name-help" className="field-help">आपले नाव फक्त हे आमंत्रण वैयक्तिक करण्यासाठी वापरले जाते.</p>
                  {!supportsVoiceName && (
                    <p id="voice-support-help" className="field-help voice-support-note">
                      नाव बोलण्यासाठी हा दुवा Chrome किंवा Edge मध्ये उघडा; किंवा वर आपले नाव टाइप करा.
                    </p>
                  )}
                  {speechError && <p id="name-error" className="field-error" role="alert">{speechError}</p>}

                  <button className="primary-button" type="submit">
                    माझे आमंत्रण तयार करा <ArrowRight aria-hidden="true" />
                  </button>
                  <button className="secondary-button" type="button" onClick={() => revealInvitation('प्रिय भाविक')}>
                    भाविक म्हणून पुढे जा
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
                      speak(buildInvitationSpeech(guestName), 80, NARRATION_AUDIO.invitation);
                    }}
                    aria-pressed={isSpeaking}
                  >
                    {isSpeaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                    {isSpeaking ? 'आवाज थांबवा' : 'आमंत्रण ऐका'}
                  </button>
                  <button className="compact-button" onClick={reset}>
                    <RotateCcw aria-hidden="true" /> पुन्हा सुरुवात करा
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
