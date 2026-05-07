"use client";

import { motion } from "framer-motion";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";

const lightMotes = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  delay: (index % 9) * 0.35,
  size: index % 5 === 0 ? 3 : 2
}));

export function BackgroundEffects() {
  const reducedMotion = useReducedMotionPreference();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#e8f7fb_0%,#d6f0ed_42%,#f7e4bf_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.92),transparent_26%),radial-gradient(circle_at_78%_18%,rgba(255,214,134,0.58),transparent_24%),radial-gradient(circle_at_50%_84%,rgba(0,168,150,0.22),transparent_34%)]" />
      <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-white/55 blur-3xl" />
      <div className="absolute right-[-8rem] top-12 h-96 w-96 rounded-full bg-[#f8c96a]/35 blur-3xl" />
      <div className="absolute bottom-[-12rem] left-1/2 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-[#00a896]/20 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(13,79,107,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(13,79,107,0.2)_1px,transparent_1px)] [background-size:96px_96px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />

      {!reducedMotion && (
        <motion.div
          className="absolute left-1/2 top-1/2 h-[76rem] w-[76rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45"
          animate={{ rotate: 360 }}
          transition={{ duration: 110, ease: "linear", repeat: Infinity }}
        />
      )}

      {lightMotes.map((mote) => (
        <motion.span
          key={mote.id}
          className="absolute rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.9)]"
          style={{ left: mote.left, top: mote.top, width: mote.size, height: mote.size }}
          animate={reducedMotion ? undefined : { opacity: [0.2, 0.82, 0.2], scale: [1, 1.45, 1] }}
          transition={{ duration: 5.5, delay: mote.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
