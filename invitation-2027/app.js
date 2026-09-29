const curtainStage = document.querySelector('#curtainStage');
const revealButton = document.querySelector('#revealButton');
const soundButton = document.querySelector('#soundButton');
const soundLabel = document.querySelector('#soundLabel');
const nameForm = document.querySelector('#nameForm');
const guestName = document.querySelector('#guestName');
const nameError = document.querySelector('#nameError');
const personalMessage = document.querySelector('#personalMessage');
const guestGreeting = document.querySelector('#guestGreeting');
const sharePersonal = document.querySelector('#sharePersonal');
const shareStatus = document.querySelector('#shareStatus');
const shareWebsite = document.querySelector('#shareWebsite');
const blessing = document.querySelector('#blessing');
const diyaProgress = document.querySelector('#diyaProgress');
const diyas = [...document.querySelectorAll('.diya')];
const searchParams = new URLSearchParams(window.location.search);

document.body.classList.add('curtain-active');
let soundEnabled = true;
let audioContext;
let activeGuestName = '';

const marathiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
const toMarathiNumber = (value) => String(value).replace(/\d/g, (digit) => marathiDigits[Number(digit)]);

const playBell = () => {
  if (!soundEnabled) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    [440, 660, 880].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16 / (index + 1), now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + index * 0.25);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 2.1 + index * 0.25);
    });
  } catch {
    soundEnabled = false;
    updateSoundButton();
  }
};

const updateSoundButton = () => {
  soundButton.setAttribute('aria-pressed', String(!soundEnabled));
  soundButton.setAttribute('aria-label', soundEnabled ? 'मंगल ध्वनी बंद करा' : 'मंगल ध्वनी सुरू करा');
  soundLabel.textContent = soundEnabled ? 'ध्वनी सुरू' : 'ध्वनी बंद';
};

revealButton.addEventListener('click', () => {
  playBell();
  curtainStage.classList.add('opening');
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 2650;
  window.setTimeout(() => {
    curtainStage.hidden = true;
    document.body.classList.remove('curtain-active');
    document.querySelector('#heroTitle').focus({ preventScroll: true });
  }, delay);
});

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  if (soundEnabled) playBell();
});

const cleanName = (value) => value.trim().replace(/\s+/g, ' ').slice(0, 60);

const showPersonalInvitation = (name, scroll = true) => {
  activeGuestName = cleanName(name);
  if (!activeGuestName) return;
  guestName.value = activeGuestName;
  guestGreeting.textContent = `प्रिय ${activeGuestName}, गणपती बाप्पा मोरया!`;
  personalMessage.hidden = false;
  nameError.hidden = true;
  if (scroll) personalMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

nameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = cleanName(guestName.value);
  if (name.length < 2) {
    nameError.textContent = 'कृपया आपले पूर्ण नाव लिहा.';
    nameError.hidden = false;
    guestName.focus();
    return;
  }
  showPersonalInvitation(name);
});

const personalUrl = () => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (activeGuestName) url.searchParams.set('name', activeGuestName);
  return url.toString();
};

const shareInvitation = async (personal = false) => {
  const title = 'भक्तीचा डिजिटल प्रवास २०२७';
  const text = personal && activeGuestName
    ? `${activeGuestName} यांच्यासाठी नवयुवक गणेश उत्सव मंडळाचे खास आमंत्रण.`
    : 'नवयुवक गणेश उत्सव मंडळ — गणेशोत्सव २०२७ सस्नेह आमंत्रण.';
  const url = personal ? personalUrl() : `${window.location.origin}${window.location.pathname}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      shareStatus.textContent = 'आमंत्रणाची लिंक कॉपी झाली.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer');
  }
};

sharePersonal.addEventListener('click', () => shareInvitation(true));
shareWebsite.addEventListener('click', () => shareInvitation(false));

diyas.forEach((diya) => {
  diya.addEventListener('click', () => {
    const lit = diya.classList.toggle('lit');
    diya.setAttribute('aria-pressed', String(lit));
    if (lit) playBell();
    const count = diyas.filter((item) => item.classList.contains('lit')).length;
    diyaProgress.textContent = `${toMarathiNumber(count)} पैकी ३ दीप प्रज्वलित`;
    blessing.hidden = count !== diyas.length;
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal-item').forEach((item) => observer.observe(item));

const invitedName = cleanName(searchParams.get('name') ?? '');
if (invitedName) showPersonalInvitation(invitedName, false);
updateSoundButton();
