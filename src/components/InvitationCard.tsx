import { useRef, useState } from 'react';
import { motion } from 'motion/react';
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
  URL.revokeObjectURL(url);
};

export default function InvitationCard({ guestName, rsvp, onRsvp }: InvitationCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}?guest=${encodeURIComponent(guestName)}`;
  const shareText = buildShareText(guestName);

  const addToCalendar = () => {
    saveBlob(buildCalendarFile(guestName), 'text/calendar;charset=utf-8', 'Ganesh_Utsav_2026.ics');
  };

  const shareInvitation = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${EVENT.title} Invitation`, text: shareText, url: shareUrl });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') return;
      }
    }

    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
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
      const safeName = guestName.replace(/[^a-z0-9]+/gi, '_');
      anchor.download = `Ganesh_Utsav_Invitation_${safeName}.png`;
      anchor.href = dataUrl;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setIsDownloading(false);
    }
  };

  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;

  return (
    <div className="invitation-card-layout">
      <motion.div
        ref={cardRef}
        id="printable-invitation"
        className="formal-invitation"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="card-ornament card-ornament-top" aria-hidden="true" />
        <div className="card-ornament card-ornament-bottom" aria-hidden="true" />
        <div className="card-inner-border" aria-hidden="true" />

        <div className="invitation-emblem">
          <img src={EVENT.logoPath} alt="" width="108" height="108" />
        </div>

        <p className="invitation-overline">With the blessings of Lord Ganesha</p>
        <h1>{EVENT.mandalName}</h1>
        <p className="invitation-locality">{EVENT.locality} • Nagpur</p>

        <div className="ornamental-divider" aria-hidden="true">
          <span />
          <i />
          <span />
        </div>

        <p className="invitation-copy">cordially invites you and your family to celebrate</p>
        <h2>{EVENT.title}</h2>
        <p className="morya-line">Ganpati Bappa Morya</p>

        <div className="guest-ribbon">
          <span>Especially for</span>
          <strong>{guestName}</strong>
        </div>

        <div className="invitation-detail-grid">
          <div>
            <CalendarPlus aria-hidden="true" />
            <span>Date</span>
            <strong>{EVENT.dateDisplay}</strong>
          </div>
          <div>
            <Clock3 aria-hidden="true" />
            <span>Time</span>
            <strong>{EVENT.timeDisplay}</strong>
          </div>
        </div>

        <div className="venue-panel">
          <MapPin aria-hidden="true" />
          <span>
            <small>Venue</small>
            <strong>{EVENT.venueName}</strong>
            <p>{EVENT.address}</p>
          </span>
        </div>

        <p className="blessing-copy">
          Come, share in the devotion, joy and togetherness. Your gracious presence will make our celebration
          memorable.
        </p>

        <div className="coordinator-line">
          <span>Coordinator</span>
          <strong>{EVENT.coordinator}</strong>
          <small>{EVENT.phoneDisplay}</small>
        </div>

        {rsvp !== 'pending' && (
          <div className={rsvp === 'attending' ? 'rsvp-stamp attending' : 'rsvp-stamp'}>
            {rsvp === 'attending' ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            {rsvp === 'attending' ? 'Presence confirmed' : 'Response received'}
          </div>
        )}
      </motion.div>

      <aside className="invitation-actions" aria-label="Invitation actions">
        <div className="action-panel">
          <span className="panel-label">Your response</span>
          <h3>Will you join the celebration?</h3>
          <p>Your response is stored only on this device.</p>

          <div className="rsvp-buttons">
            <button
              className={rsvp === 'attending' ? 'rsvp-button yes selected' : 'rsvp-button yes'}
              onClick={() => onRsvp('attending')}
              aria-pressed={rsvp === 'attending'}
            >
              <CheckCircle2 aria-hidden="true" /> I will join
            </button>
            <button
              className={rsvp === 'not-attending' ? 'rsvp-button no selected' : 'rsvp-button no'}
              onClick={() => onRsvp('not-attending')}
              aria-pressed={rsvp === 'not-attending'}
            >
              <XCircle aria-hidden="true" /> Unable to attend
            </button>
          </div>

          {rsvp === 'attending' && (
            <div className="response-message success" role="status">
              <Check aria-hidden="true" /> We look forward to welcoming you and your family.
            </div>
          )}
          {rsvp === 'not-attending' && (
            <div className="response-message" role="status">Thank you for letting the mandal know.</div>
          )}
        </div>

        <div className="action-panel compact">
          <span className="panel-label">Save & share</span>
          <div className="action-list">
            <button onClick={addToCalendar}>
              <CalendarPlus aria-hidden="true" /> Add to calendar
            </button>
            <a href={EVENT.mapUrl} target="_blank" rel="noreferrer">
              <Navigation aria-hidden="true" /> Get directions
            </a>
            <button onClick={shareInvitation}>
              {copied ? <Copy aria-hidden="true" /> : <Share2 aria-hidden="true" />}
              {copied ? 'Link copied' : 'Share invitation'}
            </button>
            <a href={whatsAppUrl} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden="true" /> Share on WhatsApp
            </a>
            <button onClick={downloadInvitation} disabled={isDownloading}>
              <Download aria-hidden="true" /> {isDownloading ? 'Creating image…' : 'Download invitation'}
            </button>
            <a href={`tel:${EVENT.phone}`}>
              <Phone aria-hidden="true" /> Call {EVENT.phoneDisplay}
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
