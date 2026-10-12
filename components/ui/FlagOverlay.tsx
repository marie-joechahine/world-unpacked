"use client";

import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { useMapInteractionStore } from "@/hooks/useMapInteractionStore";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";

export function FlagOverlay() {
  const country = useMapInteractionStore((state) => state.hoveredCountry);
  const reducedMotion = useReducedMotionPreference();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 90, damping: 22, mass: 0.3 });
  const springY = useSpring(pointerY, { stiffness: 90, damping: 22, mass: 0.3 });
  const rotateY = useTransform(springX, [-0.5, 0.5], reducedMotion ? [0, 0] : [-2.8, 2.8]);
  const rotateX = useTransform(springY, [-0.5, 0.5], reducedMotion ? [0, 0] : [2, -2]);

  useEffect(() => {
    if (reducedMotion) return;

    const handlePointerMove = (event: PointerEvent) => {
      pointerX.set(event.clientX / window.innerWidth - 0.5);
      pointerY.set(event.clientY / window.innerHeight - 0.5);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [pointerX, pointerY, reducedMotion]);

  return (
    <AnimatePresence mode="wait">
      {country && (
        <motion.aside
          key={country.iso3}
          className="pointer-events-none fixed left-1/2 top-[18%] z-40 w-[min(78vw,520px)] -translate-x-1/2 sm:top-[15%]"
          initial={{ opacity: 0, y: reducedMotion ? 0 : -26, scale: reducedMotion ? 1 : 0.88, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -16, scale: reducedMotion ? 1 : 0.95, filter: "blur(12px)" }}
          transition={{ type: "spring", stiffness: 190, damping: 24, mass: 0.8 }}
          style={{ rotateX, rotateY, transformPerspective: 900 }}
          aria-live="polite"
        >
          <motion.div
            className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-3 shadow-[0_28px_90px_rgba(13,79,107,0.2)] backdrop-blur-xl"
            animate={reducedMotion ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.92),transparent_38%),linear-gradient(135deg,rgba(232,247,251,0.76),rgba(248,201,106,0.18))]" />
            <div className="relative aspect-[1.55/1] overflow-hidden rounded-[1.45rem] bg-[#f7e4bf]">
              <Image
                src={country.flagUrl}
                alt={`${country.name} flag`}
                fill
                sizes="(max-width: 640px) 78vw, 520px"
                className="object-cover"
                priority
                unoptimized
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/45" />
            </div>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
