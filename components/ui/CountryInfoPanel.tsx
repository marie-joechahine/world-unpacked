"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMapInteractionStore } from "@/hooks/useMapInteractionStore";

export function CountryInfoPanel() {
  const country = useMapInteractionStore((state) => state.hoveredCountry);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-7 z-30 flex justify-center px-4 sm:bottom-9">
      <AnimatePresence mode="wait">
        {country ? (
          <motion.div
            key={country.iso3}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="max-w-[92vw] rounded-3xl border border-white/75 bg-white/70 px-6 py-4 text-center shadow-[0_18px_60px_rgba(13,79,107,0.16)] backdrop-blur-xl sm:px-8"
          >
            <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.36em] text-[#00a896]">
              {country.region ?? "Country"}
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#12323f] sm:text-5xl">
              {country.name}
            </h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-[#6b3f0f]/55">
              {country.iso3} · {country.iso2.toUpperCase()}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-full border border-white/70 bg-white/55 px-5 py-3 text-sm font-medium text-[#4c666c] shadow-[0_12px_40px_rgba(13,79,107,0.12)] backdrop-blur-md"
          >
            Hover, tap, or tab through countries to reveal their identity.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
