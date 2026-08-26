import { Mic } from 'lucide-react';

interface AudioWaveformProps {
  isRecording: boolean;
}

export default function AudioWaveform({ isRecording }: AudioWaveformProps) {
  if (!isRecording) return null;

  return (
    <div className="listening-indicator" role="status" aria-label="मायक्रोफोन आपले नाव ऐकत आहे">
      <span className="listening-mic" aria-hidden="true"><Mic /></span>
      <span className="voice-bars" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} style={{ animationDelay: `${(index % 6) * 90}ms` }} />
        ))}
      </span>
      <span className="listening-copy"><strong>ऐकत आहे</strong><small>आपले पूर्ण नाव स्पष्टपणे बोला</small></span>
    </div>
  );
}
