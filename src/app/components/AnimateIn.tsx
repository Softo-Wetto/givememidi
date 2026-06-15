"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

type AnimateInProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
  direction?: Direction;
  amount?: number;
};

const OFFSETS: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: 28 },
  right: { x: -28 },
  none: {},
};

export function AnimateIn({
  children,
  className,
  delay = 0,
  duration = 0.55,
  once = true,
  direction = "up",
  amount = 0.12,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, ...OFFSETS[direction] }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
