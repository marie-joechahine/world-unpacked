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
      className="relative z-10 mt-32 w-full max-w-7xl rounded-[2.5rem] border border-white/65 bg-white/45 p-2 shadow-[0_34px_110px_rgba(13,79,107,0.16)] backdrop-blur-xl sm:mt-36 sm:p-5"
      onMouseEnter={() => setPointerInsideMap(true)}
      onMouseLeave={clearInteraction}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(221,244,239,0.42)_42%,rgba(248,201,106,0.16))]" />
      <div className="relative aspect-[1.75/1] w-full overflow-hidden rounded-[2rem] border border-white/75 bg-[radial-gradient(circle_at_50%_44%,rgba(77,196,191,0.5),rgba(152,217,211,0.34)_42%,rgba(247,228,191,0.36)_78%),linear-gradient(180deg,#dff6f8_0%,#ccefe8_48%,#f4dfb9_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-white/55" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-[#0d4f6b]/[0.025] shadow-[inset_0_0_90px_rgba(255,255,255,0.45)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.62),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(248,201,106,0.22),transparent_25%)]" />

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
              <stop offset="0%" stopColor="#fff5d6" />
              <stop offset="46%" stopColor="#f8c96a" />
              <stop offset="100%" stopColor="#00a896" />
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
