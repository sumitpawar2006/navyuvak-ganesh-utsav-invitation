const welcomeScreen = document.querySelector('#welcomeScreen');
const openInvitation = document.querySelector('#openInvitation');
const voiceButton = document.querySelector('#voiceButton');
const voiceButtonText = document.querySelector('#voiceButtonText');
const voiceStatus = document.querySelector('#voiceStatus');
const shareWebsite = document.querySelector('#shareWebsite');
const invitationAudio = document.querySelector('#invitationAudio');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let isSpeaking = false;

document.body.classList.add('welcome-active');

const findIndianVoice = () => {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const languageRank = (voice) => {
    const language = voice.lang.toLowerCase();
    if (language === 'mr-in' || language.startsWith('mr')) return 0;
    if (language === 'hi-in' || language.startsWith('hi')) return 1;
    if (language === 'en-in') return 2;
    if (language.endsWith('-in')) return 3;
    return 4;
  };
  const warmVoice = /(female|woman|heera|swara|kalpana|lekha|veena|raveena|neerja|aditi)/i;
  return voices.filter((voice) => languageRank(voice) < 4).sort((a, b) => {
    const languageDifference = languageRank(a) - languageRank(b);
    if (languageDifference !== 0) return languageDifference;
    return Number(warmVoice.test(b.name)) - Number(warmVoice.test(a.name));
  })[0] ?? null;
};

const setSpeakingState = (speaking, message) => {
  isSpeaking = speaking;
  voiceButton.classList.toggle('is-speaking', speaking);
  voiceButton.setAttribute('aria-pressed', String(speaking));
  voiceButtonText.textContent = speaking ? 'आवाज थांबवा' : 'आमंत्रण पुन्हा ऐका';
  if (message) voiceStatus.textContent = message;
};

const invitationScript = 'गणपती बाप्पा मोरया! नवयुवक गणेश उत्सव मंडळ, म्हाडा कॉलनी यांच्या गणेशोत्सव दोन हजार सत्तावीस सोहळ्यास आपणास व आपल्या परिवारास मनःपूर्वक आमंत्रण. बाप्पांच्या दर्शनासाठी नक्की या. स्थळ, सार्वजनिक मैदान, म्हाडा कॉलनी, इलेक्ट्रॉनिक झोन चौक, नागपूर. कार्यक्रमाची तारीख आणि वेळ लवकरच कळवण्यात येईल.';

const speakWithDeviceVoice = () => {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    setSpeakingState(false, 'आवाज सुरू झाला नाही. कृपया पुन्हा बटण दाबा.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(invitationScript);
  const selectedVoice = findIndianVoice();
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.lang = selectedVoice?.lang || 'mr-IN';
  utterance.rate = 0.86;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  utterance.onstart = () => setSpeakingState(true, 'आमंत्रण मराठीत वाचले जात आहे…');
  utterance.onend = () => setSpeakingState(false, 'आमंत्रण पूर्ण झाले. गणपती बाप्पा मोरया!');
  utterance.onerror = (event) => {
    if (event.error === 'canceled' || event.error === 'interrupted') return;
    setSpeakingState(false, 'आवाज सुरू झाला नाही. पुन्हा बटण दाबा.');
  };
  window.speechSynthesis.speak(utterance);
};

const stopInvitation = () => {
  invitationAudio.pause();
  invitationAudio.currentTime = 0;
  window.speechSynthesis?.cancel();
  setSpeakingState(false, 'आवाज थांबवला आहे.');
};

const playInvitation = async () => {
  if (isSpeaking) {
    stopInvitation();
    return;
  }

  window.speechSynthesis?.cancel();
  invitationAudio.currentTime = 0;
  invitationAudio.volume = 1;
  voiceStatus.textContent = 'आमंत्रण सुरू होत आहे…';

  try {
    await invitationAudio.play();
  } catch (error) {
    speakWithDeviceVoice();
  }
};

invitationAudio.addEventListener('playing', () => {
  setSpeakingState(true, 'आमंत्रण मराठीत वाचले जात आहे…');
});
invitationAudio.addEventListener('ended', () => {
  setSpeakingState(false, 'आमंत्रण पूर्ण झाले. गणपती बाप्पा मोरया!');
});
invitationAudio.addEventListener('error', () => {
  if (!isSpeaking) voiceStatus.textContent = 'आवाज तयार होत आहे. पुन्हा बटण दाबा.';
});

openInvitation.addEventListener('click', () => {
  welcomeScreen.classList.add('leaving');
  playInvitation();
  window.setTimeout(() => {
    welcomeScreen.hidden = true;
    document.body.classList.remove('welcome-active');
    document.querySelector('#mainTitle').focus({ preventScroll: true });
  }, reducedMotion ? 20 : 540);
});

voiceButton.addEventListener('click', playInvitation);
if ('speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', findIndianVoice, { once: true });
}

shareWebsite.addEventListener('click', async () => {
  const title = 'गणेशोत्सव २०२७ | सस्नेह आमंत्रण';
  const text = 'नवयुवक गणेश उत्सव मंडळ, म्हाडा कॉलनी — गणेशोत्सव २०२७ चे सस्नेह आमंत्रण.';
  const url = `${window.location.origin}${window.location.pathname}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text} ${url}`);
      voiceStatus.textContent = 'आमंत्रणाची लिंक कॉपी झाली.';
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer');
    }
  }
});

window.addEventListener('pagehide', () => {
  invitationAudio.pause();
  window.speechSynthesis?.cancel();
});
