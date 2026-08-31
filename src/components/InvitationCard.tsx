import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { toPng } from 'html-to-image';
import {
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  XCircle,
} from 'lucide-react';
import { EVENT, buildCalendarFile, buildShareText } from '../event';

export type RsvpStatus = 'pending' | 'attending' | 'not-attending';

interface InvitationCardProps {
  guestName: string;
  rsvp: RsvpStatus;
  onRsvp: (status: RsvpStatus) => void;
}

const saveBlob = (content: string, type: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Continue to the mobile-browser fallback below.
    }
  }

  if (!copyTextImmediately(value)) throw new Error('Clipboard unavailable');
};

const copyTextImmediately = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
};

export default function InvitationCard({ guestName, rsvp, onRsvp }: InvitationCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const shareUrl = `${window.location.origin}${window.location.pathname}?guest=${encodeURIComponent(guestName)}`;
  const shareText = buildShareText(guestName);

  const addToCalendar = () => {
    try {
      saveBlob(buildCalendarFile(guestName), 'text/calendar;charset=utf-8', 'Ganesh_Utsav_2026.ics');
      setActionMessage('कॅलेंडर फाइल डाउनलोड झाली. ती उघडून कार्यक्रम जतन करा.');
    } catch {
      setActionMessage('कॅलेंडर फाइल तयार झाली नाही. कृपया पुन्हा प्रयत्न करा.');
    }
  };

  const shareInvitation = async () => {
    const invitationText = `${shareText}\n${shareUrl}`;
    const copiedImmediately = copyTextImmediately(invitationText);
    if (copiedImmediately) {
      setCopied(true);
      setActionMessage('आमंत्रणाची लिंक कॉपी झाली. शेअर करण्याचे पर्याय उघडत आहेत…');
      window.setTimeout(() => setCopied(false), 2200);
    } else {
      setActionMessage('शेअर करण्याचे पर्याय उघडत आहेत…');
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: `${EVENT.title} आमंत्रण`, text: shareText, url: shareUrl });
        setActionMessage('आमंत्रण यशस्वीपणे शेअर झाले.');
        return;
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          setActionMessage(copiedImmediately ? 'शेअर करणे रद्द केले; आमंत्रणाची लिंक कॉपी केलेली आहे.' : 'शेअर करणे रद्द केले.');
          return;
        }
      }
    }

    if (copiedImmediately) {
      setActionMessage('आमंत्रणाची लिंक कॉपी झाली. आता ती कुठेही शेअर करा.');
      return;
    }

    try {
      await copyText(invitationText);
      setCopied(true);
      setActionMessage('आमंत्रणाची लिंक कॉपी झाली. आता ती कुठेही शेअर करा.');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setActionMessage('लिंक कॉपी झाली नाही. WhatsApp बटण वापरून शेअर करा.');
    }
  };

  const downloadInvitation = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#170404',
      });
      const anchor = document.createElement('a');
      const safeName = guestName.replace(/[^\p{L}\p{N}]+/gu, '_');
      anchor.download = `Ganeshotsav_Invitation_${safeName}.png`;
      anchor.href = dataUrl;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setActionMessage('आमंत्रणाचे चित्र डाउनलोड झाले.');
    } catch {
      setActionMessage('आमंत्रणाचे चित्र तयार झाले नाही. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsDownloading(false);
    }
  };

  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;

  return (
    <div className="invitation-experience">
      <section className="quick-rsvp-panel" aria-labelledby="quick-rsvp-title">
        <div className="quick-rsvp-copy">
          <span className="panel-label">आपला प्रतिसाद</span>
          <h3 id="quick-rsvp-title">आपण उत्सवात सहभागी होणार का?</h3>
        </div>

        <div className="rsvp-buttons">
          <button
            type="button"
            className={rsvp === 'attending' ? 'rsvp-button yes selected' : 'rsvp-button yes'}
            onClick={() => onRsvp('attending')}
            aria-pressed={rsvp === 'attending'}
          >
            <CheckCircle2 aria-hidden="true" /> हो, मी येणार
          </button>
          <button
            type="button"
            className={rsvp === 'not-attending' ? 'rsvp-button no selected' : 'rsvp-button no'}
            onClick={() => onRsvp('not-attending')}
            aria-pressed={rsvp === 'not-attending'}
          >
            <XCircle aria-hidden="true" /> नाही, शक्य नाही
          </button>
        </div>

        {rsvp === 'attending' && (
          <div className="response-message success" role="status">
            <Check aria-hidden="true" /> आपले व आपल्या परिवाराचे स्वागत करण्यास आम्ही उत्सुक आहोत.
          </div>
        )}
        {rsvp === 'not-attending' && (
          <div className="response-message" role="status">मंडळाला कळवल्याबद्दल धन्यवाद.</div>
        )}
      </section>

      <div className="invitation-card-layout">
      <motion.div
        ref={cardRef}
        id="printable-invitation"
        className="formal-invitation"
        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.68, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="card-ornament card-ornament-top" aria-hidden="true" />
        <div className="card-ornament card-ornament-bottom" aria-hidden="true" />
        <div className="card-inner-border" aria-hidden="true" />

        <div className="invitation-emblem">
          <img src={EVENT.logoPath} alt="" width="108" height="108" />
        </div>

        <p className="invitation-overline">श्री गणेशाच्या कृपाशीर्वादाने</p>
        <h1>{EVENT.mandalName}</h1>
        <p className="invitation-locality">{EVENT.locality} • नागपूर</p>

        <div className="ornamental-divider" aria-hidden="true">
          <span />
          <i />
          <span />
        </div>

        <p className="invitation-copy">आपणास व आपल्या परिवारास सस्नेह आमंत्रित करीत आहोत</p>
        <h2>{EVENT.title}</h2>
        <p className="morya-line">गणपती बाप्पा मोरया</p>

        <div className="guest-ribbon">
          <span>खास आमंत्रण</span>
          <strong>{guestName}</strong>
        </div>

        <div className="invitation-detail-grid">
          <div>
            <CalendarPlus aria-hidden="true" />
            <span>दिनांक</span>
            <strong>{EVENT.dateDisplay}</strong>
          </div>
          <div>
            <Clock3 aria-hidden="true" />
            <span>वेळ</span>
            <strong>{EVENT.timeDisplay}</strong>
          </div>
        </div>

        <div className="venue-panel">
          <MapPin aria-hidden="true" />
          <span>
            <small>स्थळ</small>
            <strong>{EVENT.venueName}</strong>
            <p>{EVENT.address}</p>
          </span>
        </div>

        <p className="blessing-copy">
          भक्ती, आनंद आणि एकोप्याच्या या मंगल सोहळ्यात सहकुटुंब सहभागी व्हा. आपल्या उपस्थितीने उत्सवाची शोभा वाढेल.
        </p>

        <div className="coordinator-line">
          <span>अध्यक्ष</span>
          <strong>{EVENT.president}</strong>
          <small>{EVENT.presidentMandalName}</small>
          <small>{EVENT.phoneDisplay}</small>
        </div>

        {rsvp !== 'pending' && (
          <div className={rsvp === 'attending' ? 'rsvp-stamp attending' : 'rsvp-stamp'}>
            {rsvp === 'attending' ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            {rsvp === 'attending' ? 'उपस्थिती निश्चित' : 'प्रतिसाद मिळाला'}
          </div>
        )}
      </motion.div>

      <aside className="invitation-actions" aria-label="आमंत्रणासाठी उपलब्ध कृती">
        <div className="action-panel compact">
          <span className="panel-label">जतन करा व शेअर करा</span>
          <div className="action-list">
            <button type="button" onClick={addToCalendar}>
              <CalendarPlus aria-hidden="true" /> कॅलेंडरमध्ये जोडा
            </button>
            <a href={EVENT.mapUrl} onClick={() => setActionMessage('Google Maps मध्ये अचूक स्थळ उघडत आहे…')}>
              <Navigation aria-hidden="true" /> मार्गदर्शन मिळवा
            </a>
            <button type="button" onClick={shareInvitation}>
              {copied ? <Copy aria-hidden="true" /> : <Share2 aria-hidden="true" />}
              {copied ? 'लिंक कॉपी झाली' : 'आमंत्रण शेअर करा'}
            </button>
            <a href={whatsAppUrl} onClick={() => setActionMessage('WhatsApp मध्ये तयार संदेश उघडत आहे…')}>
              <MessageCircle aria-hidden="true" /> WhatsApp वर शेअर करा
            </a>
            <button type="button" onClick={downloadInvitation} disabled={isDownloading}>
              <Download aria-hidden="true" /> {isDownloading ? 'चित्र तयार होत आहे…' : 'आमंत्रण डाउनलोड करा'}
            </button>
            <a href={`tel:${EVENT.phone}`} onClick={() => setActionMessage('अध्यक्षांना कॉल करण्यासाठी फोन उघडत आहे…')}>
              <Phone aria-hidden="true" /> {EVENT.phoneDisplay} वर कॉल करा
            </a>
          </div>
          <div className="action-feedback" role="status" aria-live="polite">
            {actionMessage}
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}
