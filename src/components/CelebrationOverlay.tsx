import { AnimatePresence, motion } from 'motion/react';

interface CelebrationOverlayProps {
  visible: boolean;
}

const petals = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${(index * 17) % 100}%`,
  delay: (index % 7) * 0.18,
  duration: 3.4 + (index % 5) * 0.35,
}));

export default function CelebrationOverlay({ visible }: CelebrationOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="petal-celebration"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {petals.map((petal) => (
            <motion.span
              key={petal.id}
              className={petal.id % 3 === 0 ? 'petal petal-gold' : 'petal'}
              style={{ left: petal.left }}
              initial={{ y: -40, rotate: 0, opacity: 0 }}
              animate={{ y: '105vh', rotate: petal.id % 2 === 0 ? 260 : -260, opacity: [0, 1, 1, 0] }}
              transition={{ duration: petal.duration, delay: petal.delay, ease: 'linear' }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
