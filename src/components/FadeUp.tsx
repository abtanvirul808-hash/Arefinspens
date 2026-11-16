import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useStore } from '../context/StoreContext';

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  yOffset?: number;
  className?: string;
}

export const FadeUp: React.FC<FadeUpProps> = ({
  children,
  delay = 0,
  yOffset = 24,
  className = '',
}) => {
  const { preferences } = useStore();
  const osReducedMotion = useReducedMotion();
  const disableMotion = preferences.reducedMotion || Boolean(osReducedMotion);

  if (disableMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.1 }}
      transition={{
        duration: 0.48,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
