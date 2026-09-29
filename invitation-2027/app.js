const portalStage = document.querySelector('#portalStage');
const enterExperience = document.querySelector('#enterExperience');
const guestName = document.querySelector('#guestName');
const voiceButton = document.querySelector('#voiceButton');
const voiceButtonText = document.querySelector('#voiceButtonText');
const voiceStatus = document.querySelector('#voiceStatus');
const voiceWave = document.querySelector('#voiceWave');
const voiceExperience = document.querySelector('#voiceExperience');
const sharePersonal = document.querySelector('#sharePersonal');
const shareWebsite = document.querySelector('#shareWebsite');
const openCamera = document.querySelector('#openCamera');
const cameraDialog = document.querySelector('#cameraDialog');
const closeCamera = document.querySelector('#closeCamera');
const cameraVideo = document.querySelector('#cameraVideo');
const capturedPhoto = document.querySelector('#capturedPhoto');
const photoCanvas = document.querySelector('#photoCanvas');
const cameraStatus = document.querySelector('#cameraStatus');
const capturePhoto = document.querySelector('#capturePhoto');
const retakePhoto = document.querySelector('#retakePhoto');
const savePhoto = document.querySelector('#savePhoto');
const sharePhoto = document.querySelector('#sharePhoto');
const liveFrame = document.querySelector('.live-frame');
const blessing = document.querySelector('#blessing');
const diyaProgress = document.querySelector('#diyaProgress');
const diyas = [...document.querySelectorAll('.diya')];
const searchParams = new URLSearchParams(window.location.search);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const marathiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const cleanName = (value = '') => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
const toMarathiNumber = (value) => String(value).replace(/\d/g, (digit) => marathiDigits[Number(digit)]);

let audioContext;
let isSpeaking = false;
let cameraStream = null;
let capturedBlob = null;
let capturedPhotoUrl = '';

document.body.classList.add('portal-active');

const playBell = () => {
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    [523.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11 / (index + 1), now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5 + index * 0.22);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 1.8 + index * 0.22);
    });
  } catch {
    // The visual experience remains fully usable if Web Audio is unavailable.
  }
};

enterExperience.addEventListener('click', () => {
  playBell();
  portalStage.classList.add('leaving');
  window.setTimeout(() => {
    portalStage.hidden = true;
    document.body.classList.remove('portal-active');
    document.querySelector('#heroTitle').focus({ preventScroll: true });
  }, reducedMotion ? 20 : 720);
});

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
  voiceExperience.classList.toggle('is-speaking', speaking);
  voiceWave.classList.toggle('speaking', speaking);
  voiceButton.setAttribute('aria-pressed', String(speaking));
  voiceButtonText.textContent = speaking ? 'आवाज थांबवा' : 'माझे आमंत्रण ऐका';
  if (message) voiceStatus.textContent = message;
};

const invitationScript = (name) => {
  const welcome = name ? `नमस्कार, ${name}. ` : '';
  return `${welcome}गणपती बाप्पा मोरया! नवयुवक गणेश उत्सव मंडळ, म्हाडा कॉलनी यांच्या गणेशोत्सव दोन हजार सत्तावीस सोहळ्यासाठी, आपणास व आपल्या परिवारास मनःपूर्वक आमंत्रण. बाप्पांच्या दर्शनासाठी नक्की या.`;
};

const speakInvitation = () => {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    voiceStatus.textContent = 'या ब्राउझरमध्ये आवाजाची सुविधा उपलब्ध नाही.';
    voiceButton.disabled = true;
    return;
  }

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    setSpeakingState(false, 'आवाज थांबवला आहे. पुन्हा ऐकण्यासाठी बटण दाबा.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(invitationScript(cleanName(guestName.value)));
  const selectedVoice = findIndianVoice();
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.lang = selectedVoice?.lang || 'mr-IN';
  utterance.rate = 0.88;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  utterance.onstart = () => setSpeakingState(true, 'तुमच्यासाठी मराठीत आमंत्रण वाचले जात आहे…');
  utterance.onend = () => setSpeakingState(false, 'आपले वैयक्तिक आमंत्रण पूर्ण झाले. गणपती बाप्पा मोरया!');
  utterance.onerror = (event) => {
    if (event.error === 'canceled' || event.error === 'interrupted') return;
    setSpeakingState(false, 'आवाज सुरू झाला नाही. कृपया पुन्हा प्रयत्न करा.');
  };
  window.speechSynthesis.speak(utterance);
};

voiceButton.addEventListener('click', speakInvitation);
guestName.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    speakInvitation();
  }
});

if ('speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', findIndianVoice, { once: true });
}

const personalUrl = () => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  const name = cleanName(guestName.value);
  if (name) url.searchParams.set('name', name);
  return url.toString();
};

const shareInvitation = async (personal = false) => {
  const name = cleanName(guestName.value);
  if (personal && !name) {
    voiceStatus.textContent = 'वैयक्तिक लिंकसाठी आधी आपले नाव लिहा.';
    guestName.focus();
    return;
  }
  const title = 'गणेशोत्सव २०२७ | डिजिटल दर्शन';
  const text = personal
    ? `${name} यांच्यासाठी नवयुवक गणेश उत्सव मंडळाचे खास डिजिटल आमंत्रण.`
    : 'नवयुवक गणेश उत्सव मंडळ, म्हाडा कॉलनी — गणेशोत्सव २०२७ चे सस्नेह डिजिटल आमंत्रण.';
  const url = personal ? personalUrl() : `${window.location.origin}${window.location.pathname}`;
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
};

sharePersonal.addEventListener('click', () => shareInvitation(true));
shareWebsite.addEventListener('click', () => shareInvitation(false));

const stopCamera = () => {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
  capturePhoto.disabled = true;
};

const resetCameraView = () => {
  capturedPhoto.hidden = true;
  cameraVideo.hidden = false;
  liveFrame.hidden = false;
  capturePhoto.hidden = false;
  retakePhoto.hidden = true;
  savePhoto.hidden = true;
  sharePhoto.hidden = true;
};

const startCamera = async () => {
  resetCameraView();
  cameraStatus.textContent = 'कॅमेरा सुरू होत आहे…';
  capturePhoto.disabled = true;

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = 'या ब्राउझरमध्ये कॅमेरा सुविधा उपलब्ध नाही.';
    return;
  }

  try {
    stopCamera();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 1600 },
      },
      audio: false,
    });
    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    capturePhoto.disabled = false;
    cameraStatus.textContent = 'चौकटीत पाहा आणि फोटो काढा.';
  } catch (error) {
    stopCamera();
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      cameraStatus.textContent = 'कॅमेरा परवानगी मिळाली नाही. तुम्ही आमंत्रणातील इतर सर्व सुविधा वापरू शकता.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      cameraStatus.textContent = 'या डिव्हाइसवर कॅमेरा सापडला नाही.';
    } else {
      cameraStatus.textContent = 'कॅमेरा सुरू झाला नाही. कृपया पुन्हा प्रयत्न करा.';
    }
  }
};

const showCameraDialog = () => {
  if (typeof cameraDialog.showModal === 'function') cameraDialog.showModal();
  else cameraDialog.setAttribute('open', '');
  startCamera();
};

const closeCameraDialog = () => {
  stopCamera();
  if (typeof cameraDialog.close === 'function') cameraDialog.close();
  else cameraDialog.removeAttribute('open');
};

openCamera.addEventListener('click', showCameraDialog);
closeCamera.addEventListener('click', closeCameraDialog);
cameraDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeCameraDialog();
});
cameraDialog.addEventListener('close', stopCamera);

const drawCoverImage = (context, source, targetWidth, targetHeight) => {
  const sourceWidth = source.videoWidth;
  const sourceHeight = source.videoHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    sourceX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / targetRatio;
    sourceY = (sourceHeight - cropHeight) / 2;
  }

  context.save();
  context.translate(targetWidth, 0);
  context.scale(-1, 1);
  context.drawImage(source, sourceX, sourceY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  context.restore();
};

const fitText = (context, text, maximumWidth, startingSize, minimumSize = 30) => {
  let size = startingSize;
  while (size > minimumSize) {
    context.font = `800 ${size}px \"Noto Serif Devanagari\", \"Mukta\", sans-serif`;
    if (context.measureText(text).width <= maximumWidth) break;
    size -= 2;
  }
  return size;
};

const captureFestivalPhoto = async () => {
  if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) {
    cameraStatus.textContent = 'कॅमेरा तयार होत आहे. कृपया एक क्षण थांबा.';
    return;
  }

  capturePhoto.disabled = true;
  cameraStatus.textContent = 'तुमचा उत्सव फोटो तयार होत आहे…';
  await document.fonts?.ready;

  const context = photoCanvas.getContext('2d');
  const width = photoCanvas.width;
  const height = photoCanvas.height;
  context.clearRect(0, 0, width, height);
  drawCoverImage(context, cameraVideo, width, height);

  const topShade = context.createLinearGradient(0, 0, 0, 340);
  topShade.addColorStop(0, 'rgba(42, 5, 4, .94)');
  topShade.addColorStop(1, 'rgba(42, 5, 4, 0)');
  context.fillStyle = topShade;
  context.fillRect(0, 0, width, 360);

  const bottomShade = context.createLinearGradient(0, height - 500, 0, height);
  bottomShade.addColorStop(0, 'rgba(42, 5, 4, 0)');
  bottomShade.addColorStop(1, 'rgba(42, 5, 4, .96)');
  context.fillStyle = bottomShade;
  context.fillRect(0, height - 520, width, 520);

  context.strokeStyle = '#f5c15d';
  context.lineWidth = 18;
  context.strokeRect(28, 28, width - 56, height - 56);
  context.strokeStyle = 'rgba(255, 241, 194, .88)';
  context.lineWidth = 3;
  context.strokeRect(52, 52, width - 104, height - 104);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffe6a6';
  context.font = '700 58px \"Noto Serif Devanagari\", \"Mukta\", sans-serif';
  context.fillText('गणपती बाप्पा मोरया!', width / 2, 118);
  context.fillStyle = '#ffffff';
  context.font = '800 82px \"Noto Serif Devanagari\", \"Mukta\", sans-serif';
  context.fillText('गणेशोत्सव २०२७', width / 2, height - 246);
  context.fillStyle = '#ffe6a6';
  context.font = '600 39px \"Mukta\", sans-serif';
  context.fillText('नवयुवक गणेश उत्सव मंडळ · म्हाडा कॉलनी', width / 2, height - 164);

  const name = cleanName(guestName.value);
  if (name) {
    const label = `शुभाशीर्वाद · ${name}`;
    const nameSize = fitText(context, label, width - 180, 45, 28);
    context.fillStyle = '#ffffff';
    context.font = `700 ${nameSize}px \"Noto Serif Devanagari\", \"Mukta\", sans-serif`;
    context.fillText(label, width / 2, height - 94);
  }

  capturedBlob = await new Promise((resolve) => photoCanvas.toBlob(resolve, 'image/jpeg', 0.93));
  if (!capturedBlob) {
    cameraStatus.textContent = 'फोटो तयार झाला नाही. कृपया पुन्हा प्रयत्न करा.';
    capturePhoto.disabled = false;
    return;
  }

  if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
  capturedPhotoUrl = URL.createObjectURL(capturedBlob);
  capturedPhoto.src = capturedPhotoUrl;
  capturedPhoto.hidden = false;
  cameraVideo.hidden = true;
  liveFrame.hidden = true;
  capturePhoto.hidden = true;
  retakePhoto.hidden = false;
  savePhoto.hidden = false;
  sharePhoto.hidden = false;
  stopCamera();
  cameraStatus.textContent = 'तुमचा उत्सव फोटो तयार झाला.';
  navigator.vibrate?.(25);
};

capturePhoto.addEventListener('click', captureFestivalPhoto);
retakePhoto.addEventListener('click', startCamera);

const downloadPhoto = () => {
  if (!capturedBlob) return;
  const link = document.createElement('a');
  const downloadUrl = URL.createObjectURL(capturedBlob);
  link.href = downloadUrl;
  link.download = `ganeshotsav-2027-${Date.now()}.jpg`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  cameraStatus.textContent = 'फोटो फोनमध्ये जतन केला आहे.';
};

savePhoto.addEventListener('click', downloadPhoto);
sharePhoto.addEventListener('click', async () => {
  if (!capturedBlob) return;
  const file = new File([capturedBlob], 'ganeshotsav-2027.jpg', { type: 'image/jpeg' });
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        title: 'माझा गणेशोत्सव २०२७ फोटो',
        text: 'गणपती बाप्पा मोरया! नवयुवक गणेश उत्सव मंडळ · म्हाडा कॉलनी',
        files: [file],
      });
    } else {
      downloadPhoto();
      cameraStatus.textContent = 'या ब्राउझरमध्ये थेट शेअर उपलब्ध नाही; फोटो जतन केला आहे.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') cameraStatus.textContent = 'फोटो शेअर झाला नाही. तुम्ही तो फोनमध्ये जतन करू शकता.';
  }
});

diyas.forEach((diya) => {
  diya.addEventListener('click', () => {
    const lit = diya.classList.toggle('lit');
    diya.setAttribute('aria-pressed', String(lit));
    if (lit) {
      playBell();
      navigator.vibrate?.(15);
    }
    const count = diyas.filter((item) => item.classList.contains('lit')).length;
    diyaProgress.textContent = `${toMarathiNumber(count)} पैकी ३ दीप प्रज्वलित`;
    blessing.hidden = count !== diyas.length;
  });
});

const revealItems = document.querySelectorAll('.reveal-item');
if ('IntersectionObserver' in window && !reducedMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

const invitedName = cleanName(searchParams.get('name'));
if (invitedName) guestName.value = invitedName;

window.addEventListener('pagehide', () => {
  stopCamera();
  window.speechSynthesis?.cancel();
  if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
});
