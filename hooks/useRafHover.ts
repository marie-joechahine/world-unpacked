"use client";

import { useCallback, useRef } from "react";
import type { CountryMetadata } from "@/lib/countries";

export function useRafHover(onHover: (country: CountryMetadata | null) => void) {
  const frameRef = useRef<number | null>(null);
  const nextCountryRef = useRef<CountryMetadata | null>(null);

  const scheduleHover = useCallback(
    (country: CountryMetadata | null) => {
      nextCountryRef.current = country;

      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        onHover(nextCountryRef.current);
        frameRef.current = null;
      });
    },
    [onHover]
  );

  return scheduleHover;
}
