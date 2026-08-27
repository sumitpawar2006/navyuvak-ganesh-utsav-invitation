import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
import { toMarathiName } from './utils/marathiName';
import { cancelNaturalSpeech, primeNaturalVoices, speakNaturalText } from './utils/naturalVoiceEngine';

type AppStep = 'welcome' | 'personalize' | 'invitation';

const NARRATION_AUDIO = {
  welcome: '/audio/welcome-marathi.mp3',
  invitation: '/audio/invitation-marathi.mp3',
  attending: '/audio/attending-marathi.mp3',
  notAttending: '/audio/not-attending-marathi.mp3',
} as const;

const WELCOME_SPEECH = `गणपती बाप्पा मोरया! ${EVENT.mandalName}, ${EVENT.locality} तर्फे आपले हार्दिक स्वागत आहे। आपले वैयक्तिक आमंत्रण तयार करण्यासाठी कृपया आपले नाव सांगा।`;

const INDIAN_NAME_LANGUAGES = [
  { language: 'mr-IN', label: 'मराठीत' },
  { language: 'hi-IN', label: 'हिंदीत' },
  { language: 'en-IN', label: 'भारतीय इंग्रजीत' },
  { language: 'gu-IN', label: 'ગુજરાતીમાં' },
  { language: 'bn-IN', label: 'বাংলায়' },
  { language: 'pa-IN', label: 'ਪੰਜਾਬੀ ਵਿੱਚ' },
  { language: 'ta-IN', label: 'தமிழில்' },
  { language: 'te-IN', label: 'తెలుగులో' },
  { language: 'kn-IN', label: 'ಕನ್ನಡದಲ್ಲಿ' },
  { language: 'ml-IN', label: 'മലയാളത്തിൽ' },
  { language: 'ur-IN', label: 'اردو میں' },
] as const;

const cleanGuestName = (value: string) =>
  value
    .trim()
    .replace(/^(नमस्कार|हॅलो|हाय|नमस्ते)\s+/u, '')
    .replace(/^(hello|hi|hey)\s+/i, '')
    .replace(/^(माझे नाव आहे|माझं नाव आहे|माझे नाव|माझं नाव|मी)\s+/u, '')
    .replace(/^(मेरा नाम है|मेरा नाम|मैं)\s+/u, '')
    .replace(/^(my name is|i am|i'm|this is)\s+/i, '')
    .replace(/[!?.,।]+$/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => (/^[a-z]/i.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ');

const formatGuestName = (value: string) => toMarathiName(cleanGuestName(value));

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
  const prefersReducedMotion = useReducedMotion();
  const sharedGuest = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('guest');
    return value ? formatGuestName(value) : '';
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
  const [showCurtain, setShowCurtain] = useState(!sharedGuest);
  const [supportsVoiceName] = useState(
    () => Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
  const recognitionRef = useRef<any>(null);
  const recognitionSessionRef = useRef(0);

  useEffect(() => {
    primeNaturalVoices();

    return () => {
      recognitionSessionRef.current += 1;
      recognitionRef.current?.abort?.();
      cancelNaturalSpeech();
    };
  }, []);

  useEffect(() => {
    if (!showCurtain) return;
    const timer = window.setTimeout(
      () => setShowCurtain(false),
      prefersReducedMotion ? 1050 : 2250
    );
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion, showCurtain]);

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

  const speak = (
    text: string,
    startDelayMs = 80,
    audioUrl?: string,
    forceSound = false,
    onComplete?: () => void
  ) => {
    recognitionSessionRef.current += 1;
    recognitionRef.current?.abort?.();
    setIsListening(false);
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
      onComplete,
      onError: () => {
        setIsSpeaking(false);
        setSubtitle('आवाज सुरू झाला नाही. फोनचा मीडिया आवाज वाढवा आणि “पुन्हा ऐका” दाबा.');
      },
    });
  };

  const openInvitation = () => {
    setStep('personalize');
    speak(WELCOME_SPEECH, 80, NARRATION_AUDIO.welcome, false, startListening);
  };

  const startListening = () => {
    setSpeechError('');
    cancelNaturalSpeech();
    setIsSpeaking(false);
    recognitionSessionRef.current += 1;
    recognitionRef.current?.abort?.();
    const sessionId = recognitionSessionRef.current;

    if (!supportsVoiceName) {
      setSpeechError('आवाजातून नाव देण्यासाठी हा दुवा Chrome किंवा Edge मध्ये उघडा. येथे नाव टाइप करूनही पुढे जाता येईल.');
      setSubtitle('मायक्रोफोन उपलब्ध नाही. कृपया आपले नाव खाली टाइप करा.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const deviceLanguages = (window.navigator.languages?.length
      ? window.navigator.languages
      : [window.navigator.language]
    ).filter(Boolean);
    const deviceModes = deviceLanguages.map((language) => ({ language, label: 'फोनच्या भाषेत' }));
    const recognitionModes = [INDIAN_NAME_LANGUAGES[0], ...deviceModes, ...INDIAN_NAME_LANGUAGES.slice(1)].filter(
      (mode, index, modes) => modes.findIndex(
        (candidate) => candidate.language.toLowerCase() === mode.language.toLowerCase()
      ) === index
    );
    let modeIndex = 0;
    let recognizedName = '';
    let latestName = '';
    let retryAfterEnd = false;
    let finalError = '';
    let invitationOpened = false;

    const openDetectedInvitation = (name: string) => {
      if (invitationOpened || recognitionSessionRef.current !== sessionId) return;
      invitationOpened = true;
      setIsListening(false);
      setTypedName(name);
      setSubtitle(`${name} हे नाव मिळाले. आपले आमंत्रण तयार करत आहे…`);
      window.setTimeout(() => {
        if (recognitionSessionRef.current === sessionId) revealInvitation(name);
      }, 650);
    };

    const startRecognitionAttempt = () => {
      if (recognitionSessionRef.current !== sessionId) return;

      const currentMode = recognitionModes[modeIndex];
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = currentMode.language;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 5;
      if ('processLocally' in recognition) recognition.processLocally = false;

      recognition.onstart = () => {
        if (recognitionSessionRef.current !== sessionId) return;
        setIsListening(true);
        setSpeechError('');
        setSubtitle(`मायक्रोफोन सुरू आहे. आता आपले नाव ${currentMode.label} स्पष्ट बोला…`);
      };

      recognition.onresult = (event: any) => {
        if (recognitionSessionRef.current !== sessionId) return;
        let transcript = '';
        let hasFinalResult = false;

        for (let index = 0; index < event.results.length; index += 1) {
          transcript += ` ${event.results[index][0].transcript}`;
          if (event.results[index].isFinal) hasFinalResult = true;
        }

        const name = formatGuestName(transcript);
        if (!name) return;
        latestName = name;
        if (hasFinalResult) recognizedName = name;
        setTypedName(name);
        setSpeechError('');
        setSubtitle(hasFinalResult ? `${name} हे नाव ऐकले आहे…` : `${name} असे ऐकू येत आहे…`);
        if (hasFinalResult) recognition.stop();
      };

      recognition.onerror = (event: any) => {
        if (recognitionSessionRef.current !== sessionId) return;
        setIsListening(false);
        const errorCode = String(event.error ?? 'unknown');
        const canTryAnotherLanguage = ['language-not-supported', 'language-unavailable'].includes(errorCode)
          && modeIndex < recognitionModes.length - 1;
        const canRetryListening = ['network', 'no-speech'].includes(errorCode)
          && modeIndex < Math.min(2, recognitionModes.length - 1);
        const canRetry = canTryAnotherLanguage || canRetryListening;

        if (canRetry) {
          modeIndex += 1;
          retryAfterEnd = true;
          finalError = '';
          setSpeechError('');
          setSubtitle(`${recognitionModes[modeIndex].label} पुन्हा नाव ऐकण्याचा प्रयत्न करत आहे…`);
          return;
        }

        const messages: Record<string, string> = {
          'not-allowed': 'मायक्रोफोनची परवानगी मिळाली नाही. ब्राउझर सेटिंगमध्ये मायक्रोफोन सुरू करा किंवा नाव टाइप करा.',
          'service-not-allowed': 'या ब्राउझरने आवाज ओळख सेवा रोखली आहे. Chrome मध्ये दुवा उघडा किंवा नाव टाइप करा.',
          'audio-capture': 'फोनचा मायक्रोफोन उपलब्ध नाही. दुसरे अॅप बंद करून पुन्हा प्रयत्न करा किंवा नाव टाइप करा.',
          network: 'मोबाइलवरील आवाज ओळख सेवेशी संपर्क झाला नाही. पुन्हा “नाव बोला” दाबा किंवा नाव टाइप करा.',
          'no-speech': 'नाव ऐकू आले नाही. माइकजवळ स्पष्ट बोला किंवा नाव टाइप करा.',
          'language-not-supported': 'या फोनवर मराठी, हिंदी किंवा भारतीय इंग्रजी आवाज ओळख उपलब्ध नाही. कृपया नाव टाइप करा.',
        };
        finalError = messages[errorCode] ?? 'नाव स्पष्ट ऐकू आले नाही. पुन्हा प्रयत्न करा किंवा नाव टाइप करा.';
        setSpeechError(finalError);
        setSubtitle('नाव मिळाले नाही. कृपया पुन्हा “नाव बोला” दाबा.');
      };

      recognition.onnomatch = () => {
        if (recognitionSessionRef.current !== sessionId) return;
        finalError = 'नाव ओळखता आले नाही. कृपया पुन्हा स्पष्ट बोला किंवा नाव टाइप करा.';
        setSpeechError(finalError);
        setIsListening(false);
        setSubtitle('नाव ओळखता आले नाही. कृपया पुन्हा “नाव बोला” दाबा.');
      };

      recognition.onend = () => {
        if (recognitionSessionRef.current !== sessionId) return;
        setIsListening(false);

        const detectedName = recognizedName || latestName;
        if (detectedName) {
          openDetectedInvitation(detectedName);
          return;
        }

        if (retryAfterEnd) {
          retryAfterEnd = false;
          window.setTimeout(startRecognitionAttempt, 300);
          return;
        }

        if (!finalError) {
          finalError = 'नाव ऐकू आले नाही. पुन्हा “नाव बोला” दाबा किंवा नाव टाइप करा.';
          setSpeechError(finalError);
          setSubtitle('नाव मिळाले नाही. कृपया पुन्हा प्रयत्न करा.');
        }
      };

      try {
        recognition.start();
      } catch {
        setIsListening(false);
        finalError = 'मायक्रोफोन सुरू करता आला नाही. पुन्हा “नाव बोला” दाबा किंवा नाव टाइप करा.';
        setSpeechError(finalError);
        setSubtitle('मायक्रोफोन सुरू झाला नाही. कृपया पुन्हा प्रयत्न करा.');
      }
    };

    setSubtitle('निवेदन पूर्ण झाले. मायक्रोफोन सुरू करत आहे…');
    startRecognitionAttempt();
  };

  const revealInvitation = (name: string) => {
    recognitionSessionRef.current += 1;
    recognitionRef.current?.abort?.();
    const formattedName = formatGuestName(name) || 'प्रिय भाविक';
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
    recognitionSessionRef.current += 1;
    recognitionRef.current?.abort?.();
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
    setShowCurtain(true);
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

      <AnimatePresence>
        {showCurtain && step === 'welcome' && (
          <motion.div
            className="curtain-reveal"
            aria-hidden="true"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.18 : 0.24 }}
          >
            <motion.div
              className="curtain-panel curtain-panel-left"
              initial={{ x: 0 }}
              animate={{ x: prefersReducedMotion ? '-12%' : '-102%' }}
              transition={{
                duration: prefersReducedMotion ? 0.35 : 1.55,
                delay: prefersReducedMotion ? 0.45 : 0.5,
                ease: [0.65, 0, 0.2, 1],
              }}
            />
            <motion.div
              className="curtain-panel curtain-panel-right"
              initial={{ x: 0 }}
              animate={{ x: prefersReducedMotion ? '12%' : '102%' }}
              transition={{
                duration: prefersReducedMotion ? 0.35 : 1.55,
                delay: prefersReducedMotion ? 0.45 : 0.5,
                ease: [0.65, 0, 0.2, 1],
              }}
            />
            <motion.div
              className="curtain-seal"
              initial={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              animate={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.82, x: '-50%', y: '-50%' }}
              transition={{
                duration: prefersReducedMotion ? 0.25 : 0.55,
                delay: prefersReducedMotion ? 0.48 : 0.62,
                ease: [0.4, 0, 1, 1],
              }}
            >
              <img src={EVENT.logoPath} alt="" width="96" height="96" />
              <span>श्री गणेशाय नमः</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              if (step === 'personalize') speak(WELCOME_SPEECH, 80, NARRATION_AUDIO.welcome, true, startListening);
              else if (step === 'invitation') {
                speak(buildInvitationSpeech(guestName), 80, NARRATION_AUDIO.invitation, true);
              } else {
                setSubtitle('आवाज सुरू आहे. आमंत्रण उघडल्यानंतर निवेदन ऐकू येईल.');
              }
            } else {
              setIsMuted(true);
              recognitionSessionRef.current += 1;
              recognitionRef.current?.abort?.();
              cancelNaturalSpeech();
              setIsListening(false);
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
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -12 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.45, ease: [0.16, 1, 0.3, 1] }}
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
                    <Phone aria-hidden="true" /> अध्यक्षांशी संपर्क करा
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
              initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -12 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="personalize-card devotional-frame">
                <span className="eyebrow"><ShieldCheck aria-hidden="true" /> आपले आमंत्रण वैयक्तिक करा</span>
                <h1>आपल्याला कोणत्या नावाने संबोधावे?</h1>
                <p>निवेदन पूर्ण होताच मायक्रोफोन आपोआप सुरू होईल. आपले नाव स्पष्ट बोला; नाव मिळताच आमंत्रण तयार होईल.</p>

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
                      speak(WELCOME_SPEECH, 80, NARRATION_AUDIO.welcome, true, startListening);
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
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.45, ease: [0.16, 1, 0.3, 1] }}
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
        <span className="developer-credit">Developed by <strong>Sumit Pawar</strong></span>
        <a href={`tel:${EVENT.phone}`}>{EVENT.president} • {EVENT.phoneDisplay}</a>
      </footer>

      <CelebrationOverlay visible={rsvp === 'attending'} />
    </div>
  );
}
