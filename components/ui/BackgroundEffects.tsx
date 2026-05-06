"use client";

import { motion } from "framer-motion";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";

const stars = Array.from({ length: 44 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  delay: (index % 9) * 0.35,
  size: index % 5 === 0 ? 2 : 1
}));

export function BackgroundEffects() {
  const reducedMotion = useReducedMotionPreference();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(8,145,178,0.18),transparent_26%),radial-gradient(circle_at_78%_14%,rgba(59,130,246,0.16),transparent_22%),linear-gradient(180deg,#020617_0%,#030712_50%,#000_100%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(125,211,252,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.25)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />

      {!reducedMotion && (
        <motion.div
          className="absolute left-1/2 top-1/2 h-[72rem] w-[72rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 90, ease: "linear", repeat: Infinity }}
        />
      )}

      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="absolute rounded-full bg-cyan-100/80 shadow-[0_0_14px_rgba(125,211,252,0.8)]"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
          animate={reducedMotion ? undefined : { opacity: [0.18, 0.9, 0.18], scale: [1, 1.6, 1] }}
          transition={{ duration: 4.5, delay: star.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
