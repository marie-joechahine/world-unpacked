"use client";

import { useCallback, useMemo } from "react";
import { ComposableMap, Geographies } from "react-simple-maps";
import { CountryPath } from "@/components/map/CountryPath";
import { useMapInteractionStore } from "@/hooks/useMapInteractionStore";
import { useRafHover } from "@/hooks/useRafHover";
import type { CountryMetadata } from "@/lib/countries";
import { WORLD_GEOJSON_URL } from "@/lib/countries";
import { MAP_HEIGHT, MAP_VIEW_BOX, MAP_WIDTH, projectionConfig } from "@/lib/mapProjection";

export function WorldMap() {
  const hoveredCountry = useMapInteractionStore((state) => state.hoveredCountry);
  const setHoveredCountry = useMapInteractionStore((state) => state.setHoveredCountry);
  const setSelectedCountry = useMapInteractionStore((state) => state.setSelectedCountry);
  const setPointerInsideMap = useMapInteractionStore((state) => state.setPointerInsideMap);
  const clearInteraction = useMapInteractionStore((state) => state.clearInteraction);

  const activeIso3 = hoveredCountry?.iso3;
  const scheduleHover = useRafHover(setHoveredCountry);

  const handleHover = useCallback(
    (country: CountryMetadata | null) => {
      scheduleHover(country);
    },
    [scheduleHover]
  );

  const geographySource = useMemo(() => WORLD_GEOJSON_URL, []);

  return (
    <div
      className="relative z-10 mt-24 w-full max-w-7xl rounded-[2.5rem] border border-cyan-200/10 bg-slate-950/20 p-2 shadow-[0_32px_140px_rgba(8,47,73,0.45)] backdrop-blur-sm sm:mt-32 sm:p-5"
      onMouseEnter={() => setPointerInsideMap(true)}
      onMouseLeave={clearInteraction}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.16),transparent_52%)]" />
      <div className="relative aspect-[1.75/1] w-full overflow-hidden rounded-[2rem] border border-white/5 bg-[radial-gradient(circle_at_50%_52%,rgba(12,74,110,0.5),rgba(2,6,23,0.9)_56%,rgba(0,0,0,0.88))]">
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-cyan-100/10" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 shadow-[inset_0_0_80px_rgba(34,211,238,0.08)]" />

        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={projectionConfig}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          viewBox={MAP_VIEW_BOX}
          className="relative z-10 h-full w-full touch-manipulation"
          aria-label="Interactive world map. Hover, focus, or tap a country to reveal its flag."
        >
          <defs>
            <linearGradient id="countryActiveGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="58%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#155e75" />
            </linearGradient>
          </defs>
          <Geographies geography={geographySource}>
            {({ geographies }) =>
              geographies.map((geography) => (
                <CountryPath
                  key={geography.rsmKey}
                  geography={geography}
                  activeIso3={activeIso3}
                  onHover={handleHover}
                  onSelect={setSelectedCountry}
                />
              ))
            }
          </Geographies>
        </ComposableMap>
      </div>
    </div>
  );
}
