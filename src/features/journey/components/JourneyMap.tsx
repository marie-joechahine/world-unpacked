"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type LngLatBoundsLike,
  type Map,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import {
  CARIBBEAN_COUNTRIES,
  journeyCountryRouteAnchor,
  type JourneyCountry,
} from "../data/caribbeanCountries";
import {
  JOURNEY_REGIONS,
  journeyRegionByName,
  journeyRegionForCountryCode,
  type JourneyMapTarget,
  type JourneyMode,
  type JourneyRegion,
  type SelectedRegion,
} from "../data/regions";
import {
  COUNTRY_LAYER,
  COUNTRY_SOURCE,
  JOURNEY_INTERACTION_LAYER,
  JOURNEY_MAP_STYLE,
  JOURNEY_REGION_FILL_LAYER,
  setJourneyCountryHighlight,
  setJourneyRegionLayersVisible,
  setJourneyRegionSelection,
  setJourneyTransitionRoute,
  type JourneyTransitionRoute,
} from "../map/journeyMapLayers";
import { CountryCapitalOverlay } from "./CountryCapitalOverlay";
import { CountryFlagOverlay } from "./CountryFlagOverlay";
import { CountryIntroOverlay } from "./CountryIntroOverlay";
import { CountryTransitionOverlay } from "./CountryTransitionOverlay";
import styles from "./JourneyMap.module.css";
import { RegionBottomPanel } from "./RegionBottomPanel";

type RegionMarker = {
  marker: maplibregl.Marker;
  element: HTMLButtonElement;
};

type TransitionMarkerSet = {
  cleanup: () => void;
  markers: maplibregl.Marker[];
};

function createCapitalMarkerElement(capitalName: string) {
  const element = document.createElement("div");
  const card = document.createElement("div");
  const iconEl = document.createElement("span");
  const text = document.createElement("span");
  const stem = document.createElement("span");

  element.className = styles.capitalMapCallout;
  element.setAttribute("aria-hidden", "true");
  card.className = styles.capitalMapCalloutCard;

  iconEl.className = styles.capitalMapCalloutIcon;
  iconEl.innerHTML =
    '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 26h24"/>' +
    '<path d="M6 22 4 9l7.5 5.5L16 5l4.5 9.5L28 9l-2 13H6Z"/>' +
    "</svg>";

  text.textContent = capitalName;
  stem.className = styles.capitalMapCalloutStem;

  card.append(iconEl, text);
  element.append(card, stem);

  return element;
}

const REGION_LABEL_OFFSETS: Record<string, [number, number]> = {
  "central-america": [-46, -12],
  caribbean: [42, 16],
  pacific: [-54, 36],
};

const DESKTOP_INITIAL_TARGET: JourneyMapTarget = {
  center: [-28, 12],
  zoom: 1.22,
  pitch: 0,
  bearing: 0,
};

const MOBILE_INITIAL_TARGET: JourneyMapTarget = {
  center: [-54, 10],
  zoom: 0.45,
  pitch: 0,
  bearing: 0,
};

const COUNTRY_INTRO_ZOOM_OUT = 0.28;
const MOBILE_COUNTRY_INTRO_ZOOM_OUT = 0.5;
const DESKTOP_CAPITAL_ZOOM = 11.65;
const MOBILE_CAPITAL_ZOOM = 11.05;
const LARGE_COUNTRY_ZOOM_OUT: Partial<Record<string, number>> = {
  BHS: 0.35,
  CUB: 0.45,
  DOM: 0.25,
  HTI: 0.25,
  JAM: 0.18,
  TTO: 0.18,
  VCT: 0.22,
};

function viewportTarget(target: JourneyMapTarget, viewportWidth: number): JourneyMapTarget {
  if (viewportWidth > 640) {
    return target;
  }

  return {
    ...target,
    zoom: Math.max(target.zoom - 0.58, 0.95),
    pitch: Math.min(target.pitch ?? 0, 30),
  };
}

function initialTarget(viewportWidth: number): JourneyMapTarget {
  return viewportWidth <= 640 ? MOBILE_INITIAL_TARGET : DESKTOP_INITIAL_TARGET;
}

function countryIntroTarget(country: JourneyCountry, viewportWidth: number): JourneyMapTarget {
  const fallbackTarget: JourneyMapTarget = {
    center: [-72.5, 18.4],
    zoom: 6.3,
    pitch: 45,
    bearing: -10,
  };
  const target = country.mapTarget ?? fallbackTarget;
  const zoomOut = COUNTRY_INTRO_ZOOM_OUT + (LARGE_COUNTRY_ZOOM_OUT[country.alpha3] ?? 0);

  if (viewportWidth > 640) {
    return {
      ...target,
      zoom: Math.max(target.zoom - zoomOut, 1),
    };
  }

  return {
    ...target,
    zoom: Math.max(target.zoom - zoomOut - MOBILE_COUNTRY_INTRO_ZOOM_OUT, 4.55),
    pitch: Math.min(target.pitch ?? 45, 48),
  };
}

function countryIntroMaxZoom(country: JourneyCountry, viewportWidth: number) {
  const target = country.mapTarget;
  const baseMaxZoom = target?.zoom ?? 6.3;
  const zoomOut = COUNTRY_INTRO_ZOOM_OUT + (LARGE_COUNTRY_ZOOM_OUT[country.alpha3] ?? 0);

  if (viewportWidth > 640) {
    return Math.max(baseMaxZoom - zoomOut, 1);
  }

  return Math.max(baseMaxZoom - zoomOut - MOBILE_COUNTRY_INTRO_ZOOM_OUT, 4.55);
}

function countryIntroPadding(viewportWidth: number, viewportHeight: number) {
  if (viewportWidth <= 640) {
    return {
      top: 96,
      right: 34,
      bottom: Math.min(Math.round(viewportHeight * 0.42), 340),
      left: 34,
    };
  }

  return {
    top: 100,
    right: 128,
    bottom: Math.min(Math.round(viewportHeight * 0.34), 320),
    left: 128,
  };
}

function capitalStepPadding(viewportWidth: number, viewportHeight: number) {
  if (viewportWidth <= 640) {
    return {
      top: 96,
      right: 44,
      bottom: Math.min(Math.round(viewportHeight * 0.5), 420),
      left: 44,
    };
  }

  return {
    top: 112,
    right: 148,
    bottom: Math.min(Math.round(viewportHeight * 0.42), 420),
    left: 148,
  };
}

function transitionPadding(viewportWidth: number, viewportHeight: number) {
  if (viewportWidth <= 640) {
    return {
      top: 96,
      right: 40,
      bottom: Math.min(Math.round(viewportHeight * 0.54), 520),
      left: 40,
    };
  }

  return {
    top: 124,
    right: 168,
    bottom: Math.min(Math.round(viewportHeight * 0.52), 560),
    left: 168,
  };
}

function mergedCountryBounds(
  fromCountry: JourneyCountry,
  toCountry: JourneyCountry,
): LngLatBoundsLike {
  const [[fromWest, fromSouth], [fromEast, fromNorth]] = fromCountry.boundaryBounds;
  const [[toWest, toSouth], [toEast, toNorth]] = toCountry.boundaryBounds;

  return [
    [Math.min(fromWest, toWest), Math.min(fromSouth, toSouth)],
    [Math.max(fromEast, toEast), Math.max(fromNorth, toNorth)],
  ];
}

function flyToCountryIntro(map: Map, country: JourneyCountry, duration = 1100) {
  if (!country.boundaryBounds) {
    flyToTarget(map, countryIntroTarget(country, window.innerWidth), duration);
    return;
  }

  map.fitBounds(country.boundaryBounds as LngLatBoundsLike, {
    bearing: country.mapTarget?.bearing ?? 0,
    duration,
    essential: true,
    maxZoom: countryIntroMaxZoom(country, window.innerWidth),
    padding: countryIntroPadding(window.innerWidth, window.innerHeight),
    pitch: country.mapTarget?.pitch ?? 42,
  });
}

function flyToCountryCapital(map: Map, country: JourneyCountry, duration = 2200) {
  const isMobile = window.innerWidth <= 640;

  map.easeTo({
    center: country.capitalCoords,
    zoom: isMobile ? MOBILE_CAPITAL_ZOOM : DESKTOP_CAPITAL_ZOOM,
    pitch: isMobile ? 56 : 58,
    bearing: country.mapTarget?.bearing ?? -12,
    duration,
    essential: true,
    padding: capitalStepPadding(window.innerWidth, window.innerHeight),
  });
}

function flyToCountryFlag(map: Map, country: JourneyCountry, duration = 1350) {
  flyToTarget(map, countryIntroTarget(country, window.innerWidth), duration);
}

function flyToCountryTransition(
  map: Map,
  fromCountry: JourneyCountry,
  toCountry: JourneyCountry,
  duration = 1650,
) {
  map.fitBounds(mergedCountryBounds(fromCountry, toCountry), {
    bearing: 0,
    duration,
    essential: true,
    maxZoom: window.innerWidth <= 640 ? 2.7 : 3.2,
    padding: transitionPadding(window.innerWidth, window.innerHeight),
    pitch: 0,
  });
}

function countryCode(properties: maplibregl.GeoJSONFeature["properties"]) {
  return properties?.ADM0_A3 || properties?.ISO_A3 || properties?.iso_a3 || "n/a";
}

function flyToTarget(map: Map, target: JourneyMapTarget, duration = 1100) {
  map.easeTo({
    center: target.center,
    zoom: target.zoom,
    pitch: target.pitch ?? 0,
    bearing: target.bearing ?? 0,
    duration,
    essential: true,
  });
}

function createTransitionCalloutElement(
  country: JourneyCountry,
  label: string,
  side: "from" | "to",
) {
  const element = document.createElement("div");
  const card = document.createElement("div");
  const flag = document.createElement("img");
  const text = document.createElement("span");
  const stem = document.createElement("span");

  element.className = styles.transitionMapCallout;
  element.dataset.side = side;
  element.setAttribute("aria-hidden", "true");
  card.className = styles.transitionMapCalloutCard;
  flag.src = country.flagPath;
  flag.alt = "";
  text.textContent = label;
  stem.className = styles.transitionMapCalloutStem;

  card.append(flag, text);
  element.append(card, stem);

  return element;
}

function createTransitionMarkers(
  map: Map,
  fromCountry: JourneyCountry,
  toCountry: JourneyCountry,
  route: JourneyTransitionRoute,
): TransitionMarkerSet {
  const fromMarker = new maplibregl.Marker({
    anchor: "bottom",
    element: createTransitionCalloutElement(fromCountry, fromCountry.name, "from"),
    offset: [0, 4],
    opacityWhenCovered: 0.72,
  })
    .setLngLat(journeyCountryRouteAnchor(fromCountry))
    .addTo(map);

  const toMarker = new maplibregl.Marker({
    anchor: "bottom",
    element: createTransitionCalloutElement(toCountry, `Next: ${toCountry.name}`, "to"),
    offset: [0, 4],
    opacityWhenCovered: 0.72,
  })
    .setLngLat(journeyCountryRouteAnchor(toCountry))
    .addTo(map);

  const arrowElement = document.createElement("div");
  const arrowShape = document.createElement("span");
  arrowElement.className = styles.transitionRouteArrowMarker;
  arrowElement.setAttribute("aria-hidden", "true");
  arrowElement.append(arrowShape);

  const arrowMarker = new maplibregl.Marker({
    anchor: "center",
    element: arrowElement,
    opacityWhenCovered: 0.8,
  })
    .setLngLat(route.arrowPosition)
    .addTo(map);

  const updateArrowRotation = () => {
    const tail = map.project(route.arrowTail);
    const head = map.project(route.arrowPosition);
    const angle = Math.atan2(head.y - tail.y, head.x - tail.x) * (180 / Math.PI);
    arrowElement.style.setProperty("--route-arrow-rotation", `${angle}deg`);
  };

  updateArrowRotation();
  map.on("render", updateArrowRotation);

  return {
    markers: [fromMarker, toMarker, arrowMarker],
    cleanup: () => {
      map.off("render", updateArrowRotation);
    },
  };
}

export function JourneyMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const hoveredCountryIdRef = useRef<string | number | null>(null);
  const regionMarkersRef = useRef<RegionMarker[]>([]);
  const transitionMarkersRef = useRef<TransitionMarkerSet | null>(null);
  const capitalMarkerRef = useRef<maplibregl.Marker | null>(null);
  const capitalEntryFromTransitionRef = useRef(false);
  const journeyModeRef = useRef<JourneyMode>("select-region");

  const [styleReady, setStyleReady] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [journeyMode, setJourneyMode] = useState<JourneyMode>("select-region");
  const [currentCountryIndex, setCurrentCountryIndex] = useState(0);

  const selectedRegionData = useMemo(
    () => journeyRegionByName(selectedRegion),
    [selectedRegion],
  );
  const currentCountry =
    journeyMode === "country-intro" ||
    journeyMode === "country-capital" ||
    journeyMode === "country-flag"
      ? CARIBBEAN_COUNTRIES[currentCountryIndex]
      : null;
  const transitionFromCountry =
    journeyMode === "country-transition" ? CARIBBEAN_COUNTRIES[currentCountryIndex] : null;
  const transitionToCountry =
    journeyMode === "country-transition"
      ? CARIBBEAN_COUNTRIES[currentCountryIndex + 1]
      : null;

  const setCountryHover = useCallback((id: string | number | null, hover: boolean) => {
    const map = mapRef.current;
    if (!map || id == null) {
      return;
    }

    map.setFeatureState(
      {
        source: COUNTRY_SOURCE,
        sourceLayer: COUNTRY_LAYER,
        id,
      },
      { hover },
    );
  }, []);

  const clearRegionMarkers = useCallback(() => {
    regionMarkersRef.current.forEach(({ marker }) => marker.remove());
    regionMarkersRef.current = [];
  }, []);

  const clearTransitionMarkers = useCallback(() => {
    transitionMarkersRef.current?.cleanup();
    transitionMarkersRef.current?.markers.forEach((marker) => marker.remove());
    transitionMarkersRef.current = null;
  }, []);

  const clearCapitalMarker = useCallback(() => {
    capitalMarkerRef.current?.remove();
    capitalMarkerRef.current = null;
  }, []);

  const clearHoveredCountry = useCallback(() => {
    setCountryHover(hoveredCountryIdRef.current, false);
    hoveredCountryIdRef.current = null;

    const map = mapRef.current;
    if (map) {
      map.getCanvas().style.cursor = "";
    }
  }, [setCountryHover]);

  const selectRegion = useCallback((regionName: SelectedRegion, shouldFly = true) => {
    setSelectedRegion(regionName);

    const map = mapRef.current;
    const region = journeyRegionByName(regionName);
    if (!map || !region || !shouldFly) {
      return;
    }

    const target = viewportTarget(region.mapTarget, window.innerWidth);
    flyToTarget(map, target, 950);
  }, []);

  const startSelectedRegion = useCallback(() => {
    if (selectedRegion !== "Caribbean") {
      return;
    }

    clearHoveredCountry();
    setCurrentCountryIndex(0);
    setJourneyMode("country-intro");
  }, [clearHoveredCountry, selectedRegion]);

  const clearRegion = useCallback(() => {
    setSelectedRegion(null);
    const map = mapRef.current;
    if (map) {
      flyToTarget(map, initialTarget(window.innerWidth), 950);
    }
  }, []);

  const closeCountryIntro = useCallback(() => {
    setJourneyMode("select-region");
    setCurrentCountryIndex(0);
    clearHoveredCountry();
    clearTransitionMarkers();
    clearCapitalMarker();

    const map = mapRef.current;
    const region = journeyRegionByName(selectedRegion);
    if (map) {
      setJourneyCountryHighlight(map, null);
      setJourneyTransitionRoute(map, null);
      if (region) {
        flyToTarget(map, viewportTarget(region.mapTarget, window.innerWidth), 850);
      }
    }
  }, [clearCapitalMarker, clearHoveredCountry, clearTransitionMarkers, selectedRegion]);

  // intro → capital
  const showCapitalFromIntro = useCallback(() => {
    capitalEntryFromTransitionRef.current = false;
    setJourneyMode("country-capital");
  }, []);

  const showPreviousCountry = useCallback(() => {
    setCurrentCountryIndex((index) => Math.max(index - 1, 0));
  }, []);

  // capital → transition (or restart if last country)
  const showFlagFromCapital = useCallback(() => {
    setJourneyMode("country-flag");
  }, []);

  const showTransitionFromFlag = useCallback(() => {
    setCurrentCountryIndex((index) => {
      if (index >= CARIBBEAN_COUNTRIES.length - 1) {
        setJourneyMode("country-intro");
        return 0;
      }
      setJourneyMode("country-transition");
      return index;
    });
  }, []);

  // capital → intro (same country)
  const showIntroFromCapital = useCallback(() => {
    setJourneyMode("country-intro");
  }, []);

  // transition → capital (going back)
  const showCapitalFromFlag = useCallback(() => {
    capitalEntryFromTransitionRef.current = false;
    setJourneyMode("country-capital");
  }, []);

  const showFlagFromTransition = useCallback(() => {
    capitalEntryFromTransitionRef.current = true;
    setJourneyMode("country-flag");
  }, []);

  const continueToTransitionTarget = useCallback(() => {
    setCurrentCountryIndex((index) => Math.min(index + 1, CARIBBEAN_COUNTRIES.length - 1));
    setJourneyMode("country-intro");
  }, []);

  useEffect(() => {
    journeyModeRef.current = journeyMode;
  }, [journeyMode]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const target = initialTarget(window.innerWidth);
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: JOURNEY_MAP_STYLE,
      center: target.center,
      zoom: target.zoom,
      pitch: target.pitch,
      bearing: target.bearing,
      attributionControl: false,
      minZoom: -1.05,
      maxZoom: 18,
      maxPitch: 72,
      renderWorldCopies: false,
      fadeDuration: 180,
    });

    const handleCountryMove = (event: MapLayerMouseEvent) => {
      if (journeyModeRef.current !== "select-region") {
        return;
      }

      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      const nextId = feature.id ?? countryCode(feature.properties);
      if (hoveredCountryIdRef.current !== nextId) {
        setCountryHover(hoveredCountryIdRef.current, false);
        hoveredCountryIdRef.current = nextId;
        setCountryHover(nextId, true);
      }
    };

    const handleCountryLeave = () => {
      clearHoveredCountry();
    };

    const handleRegionClick = (event: MapLayerMouseEvent) => {
      if (journeyModeRef.current !== "select-region") {
        return;
      }

      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      const region = journeyRegionForCountryCode(countryCode(feature.properties));
      if (region) {
        selectRegion(region.name);
      }
    };

    const handleRegionMove = () => {
      if (journeyModeRef.current === "select-region") {
        map.getCanvas().style.cursor = "pointer";
      }
    };

    const handleRegionLeave = () => {
      if (journeyModeRef.current === "select-region") {
        map.getCanvas().style.cursor = "";
      }
    };

    const syncStyleReady = () => {
      if (map.getLayer(JOURNEY_INTERACTION_LAYER)) {
        setStyleReady(true);
      }
    };

    const handleLoad = () => {
      setStyleReady(true);
      setJourneyRegionSelection(map, null);
      setJourneyCountryHighlight(map, null);
    };

    const handleStyleData = syncStyleReady;

    map.on("load", handleLoad);
    map.on("styledata", handleStyleData);
    map.on("mousemove", JOURNEY_INTERACTION_LAYER, handleCountryMove);
    map.on("mouseleave", JOURNEY_INTERACTION_LAYER, handleCountryLeave);
    map.on("click", JOURNEY_REGION_FILL_LAYER, handleRegionClick);
    map.on("mousemove", JOURNEY_REGION_FILL_LAYER, handleRegionMove);
    map.on("mouseleave", JOURNEY_REGION_FILL_LAYER, handleRegionLeave);

    mapRef.current = map;

    return () => {
      clearTransitionMarkers();
      clearRegionMarkers();
      setStyleReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [
    clearHoveredCountry,
    clearRegionMarkers,
    clearTransitionMarkers,
    selectRegion,
    setCountryHover,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) {
      return;
    }

    setJourneyRegionLayersVisible(map, journeyMode === "select-region");
    setJourneyRegionSelection(
      map,
      journeyMode === "select-region" ? selectedRegionData : null,
    );
    const highlightedCountryCodes =
      journeyMode === "country-intro" ||
      journeyMode === "country-capital" ||
      journeyMode === "country-flag"
        ? (currentCountry?.alpha3 ? [currentCountry.alpha3] : null)
        : journeyMode === "country-transition" && transitionFromCountry && transitionToCountry
          ? [transitionFromCountry.alpha3, transitionToCountry.alpha3]
          : null;

    setJourneyCountryHighlight(
      map,
      highlightedCountryCodes,
    );
  }, [
    currentCountry,
    journeyMode,
    selectedRegionData,
    styleReady,
    transitionFromCountry,
    transitionToCountry,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || journeyMode !== "country-intro" || !currentCountry) {
      return;
    }

    map.stop();
    flyToCountryIntro(map, currentCountry, 1650);
  }, [currentCountry, journeyMode, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || journeyMode !== "country-capital" || !currentCountry) {
      return;
    }

    map.stop();
    flyToCountryCapital(map, currentCountry, capitalEntryFromTransitionRef.current ? 2400 : 2200);
  }, [currentCountry, journeyMode, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    clearCapitalMarker();

    if (!map || !styleReady || journeyMode !== "country-capital" || !currentCountry) {
      return;
    }

    const element = createCapitalMarkerElement(currentCountry.capital);
    capitalMarkerRef.current = new maplibregl.Marker({
      anchor: "bottom",
      element,
      offset: [0, 4],
      opacityWhenCovered: 0.72,
    })
      .setLngLat(currentCountry.capitalCoords)
      .addTo(map);

    return () => {
      clearCapitalMarker();
    };
  }, [clearCapitalMarker, currentCountry, journeyMode, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || journeyMode !== "country-flag" || !currentCountry) {
      return;
    }

    map.stop();
    flyToCountryFlag(map, currentCountry, 1350);
  }, [currentCountry, journeyMode, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !styleReady ||
      journeyMode !== "country-transition" ||
      !transitionFromCountry ||
      !transitionToCountry
    ) {
      return;
    }

    map.stop();
    flyToCountryTransition(map, transitionFromCountry, transitionToCountry, 1350);
  }, [journeyMode, styleReady, transitionFromCountry, transitionToCountry]);

  useEffect(() => {
    const map = mapRef.current;

    clearTransitionMarkers();
    if (!map || !styleReady) {
      return;
    }

    if (
      journeyMode !== "country-transition" ||
      !transitionFromCountry ||
      !transitionToCountry
    ) {
      setJourneyTransitionRoute(map, null);
      return;
    }

    const route = setJourneyTransitionRoute(map, [
      journeyCountryRouteAnchor(transitionFromCountry),
      journeyCountryRouteAnchor(transitionToCountry),
    ]);

    if (!route) {
      return;
    }

    transitionMarkersRef.current = createTransitionMarkers(
      map,
      transitionFromCountry,
      transitionToCountry,
      route,
    );

    return () => {
      clearTransitionMarkers();
      setJourneyTransitionRoute(map, null);
    };
  }, [
    clearTransitionMarkers,
    journeyMode,
    styleReady,
    transitionFromCountry,
    transitionToCountry,
  ]);

  useEffect(() => {
    const map = mapRef.current;

    clearRegionMarkers();
    if (!map || journeyMode !== "select-region") {
      return;
    }

    const journeyRegions: readonly JourneyRegion[] = JOURNEY_REGIONS;
    const markers = journeyRegions.map((region) => {
      const element = document.createElement("button");
      const isSelected = selectedRegion === region.name;

      element.type = "button";
      element.className = styles.regionLabel;
      element.dataset.selected = String(isSelected);
      element.dataset.muted = String(Boolean(selectedRegion && !isSelected));
      element.style.setProperty("--journey-region-color", region.color);
      element.setAttribute("aria-label", `Select ${region.name}`);

      const labelText = document.createElement("span");
      labelText.textContent = region.name;
      const labelArrow = document.createElement("span");
      labelArrow.className = styles.regionLabelChevron;
      labelArrow.setAttribute("aria-hidden", "true");
      labelArrow.textContent = "›";
      element.append(labelText, labelArrow);
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectRegion(region.name);
      });

      const markerCoordinates =
        window.innerWidth <= 640
          ? (region.mobileLabelCoordinates ?? region.labelCoordinates)
          : region.labelCoordinates;

      const marker = new maplibregl.Marker({
        anchor: "center",
        element,
        offset: REGION_LABEL_OFFSETS[region.id] ?? [0, 0],
        opacityWhenCovered: 0,
      })
        .setLngLat(markerCoordinates)
        .addTo(map);

      return { marker, element };
    });

    regionMarkersRef.current = markers;

    return () => {
      markers.forEach(({ marker }) => marker.remove());
      if (regionMarkersRef.current === markers) {
        regionMarkersRef.current = [];
      }
    };
  }, [clearRegionMarkers, journeyMode, selectRegion, selectedRegion]);

  useEffect(() => {
    if (
      journeyMode !== "country-intro" &&
      journeyMode !== "country-capital" &&
      journeyMode !== "country-flag" &&
      journeyMode !== "country-transition"
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCountryIntro();
      } else if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        if (journeyMode === "country-transition") {
          continueToTransitionTarget();
        } else if (journeyMode === "country-flag") {
          showTransitionFromFlag();
        } else if (journeyMode === "country-capital") {
          showFlagFromCapital();
        } else {
          showCapitalFromIntro();
        }
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (journeyMode === "country-transition") {
          showFlagFromTransition();
        } else if (journeyMode === "country-flag") {
          showCapitalFromFlag();
        } else if (journeyMode === "country-capital") {
          showIntroFromCapital();
        } else {
          showPreviousCountry();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeCountryIntro,
    continueToTransitionTarget,
    journeyMode,
    showCapitalFromIntro,
    showCapitalFromFlag,
    showFlagFromCapital,
    showFlagFromTransition,
    showIntroFromCapital,
    showPreviousCountry,
    showTransitionFromFlag,
  ]);

  return (
    <main className={styles.journeyRoot} data-mode={journeyMode}>
      <div ref={mapContainerRef} className={styles.mapCanvas} />

      {/* ── Region-selector top bar ─────────────────────────────────────── */}
      {journeyMode === "select-region" ? (
        <div className={styles.mapTopBar}>
          {/* Recommended chip */}
          <button
            type="button"
            className={styles.recommendedChip}
            onClick={() => selectRegion("Caribbean")}
            aria-label="Try Caribbean first — recommended starting region"
          >
            <span className={styles.recommendedStar}>⭐</span>
            <span className={styles.recommendedText}>
              <span className={styles.recommendedEyebrow}>Recommended</span>
              <span className={styles.recommendedLabel}>Try Caribbean first</span>
            </span>
            <span className={styles.recommendedArrow} aria-hidden="true">›</span>
          </button>

          {/* Map Style button (visual, future feature) */}
          <button
            type="button"
            className={styles.mapStyleBtn}
            aria-label="Change map style"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="8" height="8" rx="1.5" />
              <rect x="14" y="2" width="8" height="8" rx="1.5" />
              <rect x="2" y="14" width="8" height="8" rx="1.5" />
              <rect x="14" y="14" width="8" height="8" rx="1.5" />
            </svg>
            Map Style
          </button>
        </div>
      ) : null}

      {/* ── Drag-the-map hint ───────────────────────────────────────────── */}
      {journeyMode === "select-region" && !selectedRegion ? (
        <div className={styles.dragHint} aria-hidden="true">
          <span className={styles.dragHintIcon}>🖐</span>
          <span className={styles.dragHintText}>
            <span className={styles.dragHintTitle}>Drag the map</span>
            <span className={styles.dragHintBody}>Zoom in to explore{"\n"}more regions</span>
          </span>
        </div>
      ) : null}

      {/* ── Bottom panel ────────────────────────────────────────────────── */}
      {journeyMode === "select-region" ? (
        <RegionBottomPanel
          selectedRegion={selectedRegionData}
          onStartRegion={startSelectedRegion}
          onChooseAnother={clearRegion}
        />
      ) : null}

      {journeyMode === "country-intro" && currentCountry ? (
        <CountryIntroOverlay
          country={currentCountry}
          currentIndex={currentCountryIndex}
          totalCountries={CARIBBEAN_COUNTRIES.length}
          onClose={closeCountryIntro}
          onNext={showCapitalFromIntro}
          onPrevious={showPreviousCountry}
        />
      ) : null}

      {journeyMode === "country-capital" && currentCountry ? (
        <CountryCapitalOverlay
          country={currentCountry}
          currentIndex={currentCountryIndex}
          totalCountries={CARIBBEAN_COUNTRIES.length}
          onClose={closeCountryIntro}
          onNext={showFlagFromCapital}
          onPrevious={showIntroFromCapital}
        />
      ) : null}

      {journeyMode === "country-flag" && currentCountry ? (
        <CountryFlagOverlay
          country={currentCountry}
          currentIndex={currentCountryIndex}
          totalCountries={CARIBBEAN_COUNTRIES.length}
          onClose={closeCountryIntro}
          onNext={showTransitionFromFlag}
          onPrevious={showCapitalFromFlag}
        />
      ) : null}

      {transitionFromCountry && transitionToCountry ? (
        <CountryTransitionOverlay
          fromCountry={transitionFromCountry}
          toCountry={transitionToCountry}
          currentIndex={currentCountryIndex}
          totalCountries={CARIBBEAN_COUNTRIES.length}
          onClose={closeCountryIntro}
          onNext={continueToTransitionTarget}
          onPrevious={showFlagFromTransition}
        />
      ) : null}
    </main>
  );
}
