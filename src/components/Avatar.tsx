import { motion } from 'motion/react';
import { Headphones, Mic, Sparkles } from 'lucide-react';
import { EVENT } from '../event';

interface AvatarProps {
  expression: 'idle' | 'talking' | 'listening' | 'happy';
  isSpeaking: boolean;
  isListening: boolean;
}

export default function Avatar({ isSpeaking, isListening }: AvatarProps) {
  const status = isListening ? 'आपले नाव ऐकत आहे' : isSpeaking ? 'आमंत्रणाचा आवाज सुरू आहे' : 'मंडळाचे आमंत्रण';

  return (
    <div className="devotional-host">
      <div className="host-aura" aria-hidden="true" />
      <motion.div
        className="host-emblem"
        animate={isListening || isSpeaking ? { scale: [1, 1.025, 1] } : { y: [0, -4, 0] }}
        transition={{ duration: isListening ? 1.1 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img src={EVENT.logoPath} alt="" width="156" height="156" />
        <span className={isListening ? 'host-state listening' : isSpeaking ? 'host-state speaking' : 'host-state'}>
          {isListening ? <Mic aria-hidden="true" /> : isSpeaking ? <Headphones aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        </span>
      </motion.div>
      <span className="host-status" aria-live="polite">
        <i className={isListening || isSpeaking ? 'active' : ''} aria-hidden="true" />
        {status}
      </span>
    </div>
  );
}
