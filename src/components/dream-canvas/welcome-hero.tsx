"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";

const taglines = [
  "Close your eyes. Open a world.",
  "Where images learn to breathe.",
  "Drift into the space between.",
  "Your dreams, rendered in sound.",
  "Let the scene whisper to you.",
];

export function WelcomeHero() {
  const [tagline, setTagline] = useState(taglines[0]);

  useEffect(() => {
    setTagline(taglines[Math.floor(Math.random() * taglines.length)]);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-6">
      <motion.h1
        initial={{ opacity: 0, y: 18, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        className="select-none text-center font-[family-name:var(--font-playfair)] text-6xl font-semibold tracking-tight text-white/90 sm:text-7xl md:text-8xl"
      >
        Lucid
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.7, y: 0 }}
        transition={{ duration: 1.6, ease: "easeOut", delay: 0.6 }}
        className="select-none text-center font-[family-name:var(--font-manrope)] text-sm font-normal tracking-[0.14em] text-indigo-100/70 sm:text-base"
      >
        {tagline}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.0, delay: 1.6 }}
        className="mt-4 flex items-center gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
            className="block size-1 rounded-full bg-indigo-200/60"
          />
        ))}
      </motion.div>
    </div>
  );
}
