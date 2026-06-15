"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [barKey, setBarKey] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setShowBar(true);
    setBarKey((k) => k + 1);
    const t = setTimeout(() => setShowBar(false), 700);
    return () => clearTimeout(t);
  }, [pathname, mounted]);

  if (!mounted) return <>{children}</>;

  return (
    <>
      <AnimatePresence>
        {showBar && !reduceMotion && (
          <motion.div
            key={barKey}
            className="progress-bar"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "left" }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, filter: "blur(3px)" }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
