import type { PropsWithChildren } from "react";
import { motion, useReducedMotion } from "motion/react";

interface MotionRevealProps extends PropsWithChildren {
  delay?: number;
  className?: string;
}

export function MotionReveal({ children, delay = 0, className }: MotionRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

