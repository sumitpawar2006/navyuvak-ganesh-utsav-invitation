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

const setSpeakingState = (speaking, message) => {
  isSpeaking = speaking;
  voiceButton.classList.toggle('is-speaking', speaking);
  voiceButton.setAttribute('aria-pressed', String(speaking));
  voiceButtonText.textContent = speaking ? 'आवाज थांबवा' : 'आमंत्रण पुन्हा ऐका';
  if (message) voiceStatus.textContent = message;
};

const stopInvitation = () => {
  invitationAudio.pause();
  invitationAudio.currentTime = 0;
  setSpeakingState(false, 'आवाज थांबवला आहे.');
};

const playInvitation = async () => {
  if (isSpeaking) {
    stopInvitation();
    return;
  }

  invitationAudio.currentTime = 0;
  invitationAudio.volume = 1;
  voiceStatus.textContent = 'आमंत्रण सुरू होत आहे…';

  try {
    await invitationAudio.play();
  } catch (error) {
    setSpeakingState(false, 'आवाज सुरू झाला नाही. कृपया पुन्हा बटण दाबा.');
  }
};

invitationAudio.addEventListener('playing', () => {
  setSpeakingState(true, 'आमंत्रण मराठीत वाचले जात आहे…');
});
invitationAudio.addEventListener('ended', () => {
  setSpeakingState(false, 'आमंत्रण पूर्ण झाले. गणपती बाप्पा मोरया!');
});
invitationAudio.addEventListener('pause', () => {
  if (!invitationAudio.ended && invitationAudio.currentTime > 0) {
    setSpeakingState(false, 'आवाज थांबवला आहे.');
  }
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
});
