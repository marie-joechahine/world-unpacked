"use client";

import { memo, useMemo } from "react";
import { Geography, type GeographyObject } from "react-simple-maps";
import type { CountryMetadata } from "@/lib/countries";
import { getCountryMetadata } from "@/lib/countries";
import { cn } from "@/lib/utils";

type CountryPathProps = {
  geography: GeographyObject;
  activeIso3?: string;
  onHover: (country: CountryMetadata | null) => void;
  onSelect: (country: CountryMetadata) => void;
};

function CountryPathComponent({ geography, activeIso3, onHover, onSelect }: CountryPathProps) {
  const country = useMemo(() => getCountryMetadata(geography.properties), [geography.properties]);
  const isActive = country?.iso3 === activeIso3;
  const isMuted = Boolean(activeIso3 && !isActive);
  const label = country ? `${country.name}, country` : "Unknown country boundary";

  return (
    <Geography
      geography={geography}
      tabIndex={country ? 0 : -1}
      role="button"
      aria-label={label}
      data-iso3={country?.iso3}
      onMouseEnter={() => onHover(country)}
      onFocus={() => onHover(country)}
      onMouseLeave={() => onHover(null)}
      onBlur={() => onHover(null)}
      onClick={() => country && onSelect(country)}
      onKeyDown={(event) => {
        if (!country) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(country);
        }
      }}
      className={cn(
        "map-country cursor-pointer outline-none transition-[fill,opacity,stroke,stroke-width,filter] duration-300 ease-out",
        "focus-visible:stroke-cyan-100 focus-visible:stroke-[1.45]",
        isActive && "map-country-active",
        isMuted && "map-country-muted"
      )}
      style={{
        fill: isActive ? "rgba(34, 211, 238, 0.94)" : "rgba(46, 92, 124, 0.86)",
        stroke: isActive ? "rgba(240, 253, 250, 0.98)" : "rgba(125, 211, 252, 0.28)",
        strokeWidth: isActive ? 0.95 : 0.42,
        opacity: isMuted ? 0.48 : 1,
        filter: isActive ? "drop-shadow(0 0 12px rgba(34, 211, 238, 0.8))" : "none"
      }}
    />
  );
}

export const CountryPath = memo(CountryPathComponent);
