"use client";

import { AnimatePresence, motion } from "framer-motion";

type DreamLoadingOverlayProps = {
  isVisible: boolean;
  message?: string;
};

const particles = Array.from({ length: 12 }, (_, i) => i);

export function DreamLoadingOverlay({
  isVisible,
  message = "Dreaming…",
}: DreamLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          key="dream-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 z-30 flex cursor-default flex-col items-center justify-center gap-6 pointer-events-auto"
          role="status"
          aria-live="polite"
        >
          {/* Backdrop dim */}
          <div className="absolute inset-0 bg-twilight-950/70 backdrop-blur-sm" />

          {/* Orbiting particles */}
          <div className="relative z-10 flex size-20 items-center justify-center">
            {particles.map((i) => {
              const angle = (i / particles.length) * 360;
              const radius = 32;
              return (
                <motion.span
                  key={i}
                  animate={{
                    opacity: [0.15, 0.8, 0.15],
                    scale: [0.6, 1.2, 0.6],
                  }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (i / particles.length) * 2.8,
                  }}
                  className="absolute size-1.5 rounded-full bg-indigo-200/80"
                  style={{
                    left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * radius}px - 3px)`,
                    top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * radius}px - 3px)`,
                  }}
                />
              );
            })}

            {/* Center glow */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute size-3 rounded-full bg-indigo-300/50 shadow-[0_0_20px_8px_rgba(165,180,252,0.25)]"
            />
          </div>

          {/* Message */}
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 select-none font-[family-name:var(--font-playfair)] text-sm tracking-[0.2em] text-indigo-100/80 sm:text-base"
          >
            {message}
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
