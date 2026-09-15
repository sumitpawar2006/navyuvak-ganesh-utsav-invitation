import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { toPng } from 'html-to-image';
import {
  Copy,
  Download,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
} from 'lucide-react';
import { EVENT, buildShareText } from '../event';

interface InvitationCardProps {
  guestName: string;
}

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

export default function InvitationCard({ guestName }: InvitationCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const shareUrl = `${window.location.origin}${window.location.pathname}?guest=${encodeURIComponent(guestName)}`;
  const shareText = buildShareText(guestName);

  const shareInvitation = async () => {
    const invitationText = `${shareText}\n${shareUrl}`;
    const copiedImmediately = copyTextImmediately(invitationText);
    if (copiedImmediately) {
      setCopied(true);
      setActionMessage('आमंत्रणाच्या दुव्याची प्रत तयार झाली. शेअर करण्याचे पर्याय उघडत आहेत…');
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
          setActionMessage(copiedImmediately ? 'शेअर करणे रद्द केले; आमंत्रणाच्या दुव्याची प्रत तयार आहे.' : 'शेअर करणे रद्द केले.');
          return;
        }
      }
    }

    if (copiedImmediately) {
      setActionMessage('आमंत्रणाच्या दुव्याची प्रत तयार झाली. आता तो कुठेही शेअर करा.');
      return;
    }

    try {
      await copyText(invitationText);
      setCopied(true);
      setActionMessage('आमंत्रणाच्या दुव्याची प्रत तयार झाली. आता तो कुठेही शेअर करा.');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setActionMessage('दुवा प्रतिकृत झाला नाही. व्हॉट्सअॅपचे बटण वापरून शेअर करा.');
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
      anchor.download = `Ganesh_Darshan_Invitation_${safeName}.png`;
      anchor.href = dataUrl;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setActionMessage('आमंत्रणाचे चित्र जतन झाले.');
    } catch {
      setActionMessage('आमंत्रणाचे चित्र तयार झाले नाही. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsDownloading(false);
    }
  };

  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;

  return (
    <div className="invitation-experience">
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

        <p className="invitation-copy">आपणास व आपल्या परिवारास</p>
        <h2>{EVENT.invitationHeading}</h2>
        <p className="morya-line">गणपती बाप्पा मोरया</p>

        <div className="guest-ribbon">
          <span>आपले मनःपूर्वक स्वागत आहे</span>
          <strong>{guestName}</strong>
        </div>

        <div className="venue-panel">
          <MapPin aria-hidden="true" />
          <span>
            <small>दर्शन स्थळ</small>
            <strong>{EVENT.venueName}</strong>
            <p>{EVENT.address}</p>
          </span>
        </div>

        <p className="blessing-copy">
          म्हाडा कॉलनी येथे विराजमान गणरायाचे दर्शन व आशीर्वाद घेण्यासाठी सहकुटुंब अवश्य या. आपल्या उपस्थितीने उत्सवाचा आनंद अधिक मंगलमय होईल.
        </p>

        <div className="coordinator-line">
          <span>अध्यक्ष</span>
          <strong>{EVENT.president}</strong>
          <small>{EVENT.presidentMandalName}</small>
          <small>{EVENT.phoneDisplay}</small>
        </div>

      </motion.div>

      <aside className="invitation-actions" aria-label="आमंत्रणासाठी उपलब्ध कृती">
        <div className="action-panel compact">
          <span className="panel-label">जतन करा व शेअर करा</span>
          <div className="action-list">
            <a href={EVENT.mapUrl} onClick={() => setActionMessage('गुगल नकाशामध्ये अचूक स्थळ उघडत आहे…')}>
              <Navigation aria-hidden="true" /> मार्गदर्शन मिळवा
            </a>
            <button type="button" onClick={shareInvitation}>
              {copied ? <Copy aria-hidden="true" /> : <Share2 aria-hidden="true" />}
              {copied ? 'दुव्याची प्रत तयार' : 'आमंत्रण शेअर करा'}
            </button>
            <a href={whatsAppUrl} onClick={() => setActionMessage('व्हॉट्सअॅपमध्ये तयार संदेश उघडत आहे…')}>
              <MessageCircle aria-hidden="true" /> व्हॉट्सअॅपवर शेअर करा
            </a>
            <button type="button" onClick={downloadInvitation} disabled={isDownloading}>
              <Download aria-hidden="true" /> {isDownloading ? 'चित्र तयार होत आहे…' : 'आमंत्रणाचे चित्र जतन करा'}
            </button>
            <a href={`tel:${EVENT.phone}`} onClick={() => setActionMessage('अध्यक्षांना कॉल करण्यासाठी फोन उघडत आहे…')}>
              <Phone aria-hidden="true" /> {EVENT.phoneDisplay} वर संपर्क करा
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
