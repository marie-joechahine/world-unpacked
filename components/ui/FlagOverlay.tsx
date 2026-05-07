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
  const rotateY = useTransform(springX, [-0.5, 0.5], reducedMotion ? [0, 0] : [-3.5, 3.5]);
  const rotateX = useTransform(springY, [-0.5, 0.5], reducedMotion ? [0, 0] : [2.5, -2.5]);

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
          className="pointer-events-none fixed left-1/2 top-[18%] z-40 w-[min(78vw,520px)] -translate-x-1/2 sm:top-[16%]"
          initial={{ opacity: 0, y: reducedMotion ? 0 : -28, scale: reducedMotion ? 1 : 0.86, filter: "blur(18px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -18, scale: reducedMotion ? 1 : 0.94, filter: "blur(14px)" }}
          transition={{ type: "spring", stiffness: 190, damping: 24, mass: 0.8 }}
          style={{ rotateX, rotateY, transformPerspective: 900 }}
          aria-live="polite"
        >
          <motion.div
            className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-[0_34px_110px_rgba(8,145,178,0.5)] backdrop-blur-xl"
            animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.42),transparent_36%),linear-gradient(135deg,rgba(34,211,238,0.18),rgba(59,130,246,0.06))]" />
            <div className="relative aspect-[1.55/1] overflow-hidden rounded-[1.45rem] bg-slate-900">
              <Image
                src={country.flagUrl}
                alt={`${country.name} flag`}
                fill
                sizes="(max-width: 640px) 78vw, 520px"
                className="object-cover"
                priority
                unoptimized
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />
            </div>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
