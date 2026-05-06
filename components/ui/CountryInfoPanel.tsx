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
            className="max-w-[92vw] rounded-3xl border border-cyan-100/15 bg-slate-950/62 px-6 py-4 text-center shadow-[0_18px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-8"
          >
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-cyan-200/65">
              {country.region ?? "Country"}
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              {country.name}
            </h2>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-white/45">
              {country.iso3} · {country.iso2.toUpperCase()}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm text-white/60 backdrop-blur-md"
          >
            Hover, tap, or tab through countries to reveal their identity.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
