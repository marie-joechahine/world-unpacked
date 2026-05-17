"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, {
  type ErrorEvent as MapboxErrorEvent,
  type FogSpecification,
  type Map,
  type MapLayerMouseEvent,
  type PaddingOptions,
  type RainSpecification,
  type SnowSpecification,
} from "mapbox-gl";
import {
  CINEMATIC_COUNTRIES_BY_ALPHA3,
  cinematicCountryAtLngLat,
  nextCinematicCountry,
  type CinematicCountry,
} from "@/lib/cinematicCountries";
import { hasFlag } from "country-flag-icons";
import {
  CountryCinematicOverlay,
  type CinematicPhase,
} from "./CountryCinematicOverlay";
import styles from "./MapboxSandbox.module.css";
import type { FeatureCollection, LineString, Point } from "geojson";

type StylePreset = "standard" | "satellite";
type LightPreset = "dawn" | "day" | "dusk" | "night";
type ThemePreset = "default" | "faded" | "monochrome";
type ProjectionPreset = "globe" | "mercator";
type WeatherPreset = "clear" | "rain" | "snow";
type SetStyleOptions = NonNullable<Parameters<Map["setStyle"]>[1]>;

type CameraPreset = {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

type MapStats = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  styleLoads: number;
  tilesLoaded: boolean;
};

type StopProperties = {
  id: string;
  name: string;
  country: string;
  alpha2: string;
  color: string;
};

type HoveredCountrySummary = {
  name: string;
  alpha2: string | null;
};

type MapboxEventFeature = NonNullable<MapLayerMouseEvent["features"]>[number];
type MapboxFeatureProperties = MapboxEventFeature["properties"];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

const DEFAULT_STYLE_PRESET: StylePreset = "satellite";
const DEFAULT_LIGHT_PRESET: LightPreset = "dusk";
const DEFAULT_THEME: ThemePreset = "default";
const DEFAULT_PROJECTION: ProjectionPreset = "mercator";
const DEFAULT_WEATHER: WeatherPreset = "clear";

const STYLE_URLS: Record<StylePreset, string> = {
  standard: "mapbox://styles/mapbox/standard",
  satellite: "mapbox://styles/mapbox/standard-satellite",
};
const FULL_STYLE_RELOAD_OPTIONS: SetStyleOptions = {
  diff: false,
  localFontFamily: undefined,
  localIdeographFontFamily: undefined,
};

const TERRAIN_SOURCE_ID = "mapbox-sandbox-dem";
const ROUTE_SOURCE_ID = "mapbox-sandbox-route";
const STOPS_SOURCE_ID = "mapbox-sandbox-stops";
const ROUTE_GLOW_LAYER_ID = "mapbox-sandbox-route-glow";
const ROUTE_LAYER_ID = "mapbox-sandbox-route";
const STOP_CIRCLE_LAYER_ID = "mapbox-sandbox-stops-circle";
const STOP_LABEL_LAYER_ID = "mapbox-sandbox-stops-label";
const COUNTRY_SOURCE_ID = "mapbox-sandbox-countries";
const COUNTRY_SOURCE_LAYER = "countries";
const COUNTRY_HOVER_FILL_LAYER_ID = "mapbox-sandbox-country-hover-fill";
const COUNTRY_HOVER_LINE_LAYER_ID = "mapbox-sandbox-country-hover-line";
const COUNTRY_INTERACTION_LAYER_ID = "mapbox-sandbox-country-interaction";
const OVERLAY_LAYER_IDS = [
  ROUTE_GLOW_LAYER_ID,
  ROUTE_LAYER_ID,
  STOP_CIRCLE_LAYER_ID,
  STOP_LABEL_LAYER_ID,
] as const;
const STOP_HOVER_LAYER_IDS = [STOP_CIRCLE_LAYER_ID, STOP_LABEL_LAYER_ID] as const;

const INITIAL_STATS: MapStats = {
  center: [55.2708, 25.2048],
  zoom: 2.25,
  pitch: 0,
  bearing: 0,
  styleLoads: 0,
  tilesLoaded: false,
};

const CINEMATIC_ZOOM_OUT_DURATION = 1700;
const CINEMATIC_INTRO_DURATION = 3300;
const CINEMATIC_DETAIL_DURATION = 1900;

const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "gulf",
    label: "Gulf",
    center: [52.6, 24.7],
    zoom: 4.45,
    pitch: 62,
    bearing: -26,
  },
  {
    id: "alps",
    label: "Alps",
    center: [7.85, 46.45],
    zoom: 8.4,
    pitch: 72,
    bearing: 28,
  },
  {
    id: "tokyo",
    label: "Tokyo",
    center: [139.767, 35.681],
    zoom: 11.6,
    pitch: 66,
    bearing: -18,
  },
  {
    id: "andes",
    label: "Andes",
    center: [-70.07, -32.65],
    zoom: 7.65,
    pitch: 73,
    bearing: 20,
  },
];

const ROUTE_STOPS: Array<StopProperties & { coordinates: [number, number] }> = [
  {
    id: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    alpha2: "AE",
    color: "#2dd4bf",
    coordinates: [55.2708, 25.2048],
  },
  {
    id: "muscat",
    name: "Muscat",
    country: "Oman",
    alpha2: "OM",
    color: "#f59e0b",
    coordinates: [58.4059, 23.588],
  },
  {
    id: "doha",
    name: "Doha",
    country: "Qatar",
    alpha2: "QA",
    color: "#f43f5e",
    coordinates: [51.531, 25.2854],
  },
  {
    id: "riyadh",
    name: "Riyadh",
    country: "Saudi Arabia",
    alpha2: "SA",
    color: "#8b5cf6",
    coordinates: [46.6753, 24.7136],
  },
];

const ROUTE_DATA: FeatureCollection<LineString, { name: string }> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Gulf comparison route",
      },
      geometry: {
        type: "LineString",
        coordinates: ROUTE_STOPS.map((stop) => stop.coordinates),
      },
    },
  ],
};

const STOP_DATA: FeatureCollection<Point, StopProperties> = {
  type: "FeatureCollection",
  features: ROUTE_STOPS.map((stop) => ({
    type: "Feature",
    properties: {
      id: stop.id,
      name: stop.name,
      country: stop.country,
      alpha2: stop.alpha2,
      color: stop.color,
    },
    geometry: {
      type: "Point",
      coordinates: stop.coordinates,
    },
  })),
};

function basemapConfig({
  lightPreset,
  theme,
  show3dObjects,
  showPlaceLabels,
  showRoadLabels,
  showPoiLabels,
  showTransitLabels,
}: {
  lightPreset: LightPreset;
  theme: ThemePreset;
  show3dObjects: boolean;
  showPlaceLabels: boolean;
  showRoadLabels: boolean;
  showPoiLabels: boolean;
  showTransitLabels: boolean;
}) {
  return {
    lightPreset,
    theme,
    show3dObjects,
    showPlaceLabels,
    showRoadLabels,
    showPointOfInterestLabels: showPoiLabels,
    showTransitLabels,
  };
}

function fogForLight(lightPreset: LightPreset): FogSpecification {
  if (lightPreset === "night") {
    return {
      color: "#0d1320",
      "high-color": "#111827",
      "horizon-blend": 0.08,
      "space-color": "#020617",
      "star-intensity": 0.72,
    };
  }

  if (lightPreset === "dusk") {
    return {
      color: "#22223b",
      "high-color": "#704c5e",
      "horizon-blend": 0.11,
      "space-color": "#09090f",
      "star-intensity": 0.36,
    };
  }

  if (lightPreset === "dawn") {
    return {
      color: "#f3d7b6",
      "high-color": "#8ecae6",
      "horizon-blend": 0.08,
      "space-color": "#14213d",
      "star-intensity": 0.12,
    };
  }

  return {
    color: "#d7ecff",
    "high-color": "#8bb8df",
    "horizon-blend": 0.06,
    "space-color": "#10223d",
    "star-intensity": 0.04,
  };
}

function rainSpec(): RainSpecification {
  return {
    density: 0.45,
    intensity: 0.82,
    color: "#a8adbc",
    opacity: 0.72,
    vignette: 0.75,
    "vignette-color": "#293241",
    direction: [0, 78],
    "droplet-size": [2.4, 17],
    "distortion-strength": 0.62,
    "center-thinning": 0,
  };
}

function snowSpec(): SnowSpecification {
  return {
    density: 0.72,
    intensity: 0.88,
    color: "#ffffff",
    opacity: 0.95,
    vignette: 0.28,
    "vignette-color": "#ffffff",
    "center-thinning": 0.08,
    direction: [0, 48],
    "flake-size": 0.68,
  };
}

function readStats(map: Map, styleLoads: number): MapStats {
  const center = map.getCenter();

  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    styleLoads,
    tilesLoaded: map.areTilesLoaded(),
  };
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function cinematicPadding(map: Map, phase: "intro" | "detail"): PaddingOptions {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const side = Math.round(Math.min(Math.max(width * 0.08, 28), 92));

  if (width <= 640) {
    return {
      top: phase === "intro" ? Math.round(height * 0.18) : Math.round(height * 0.22),
      right: side,
      bottom: phase === "intro" ? Math.round(height * 0.24) : Math.round(height * 0.34),
      left: side,
    };
  }

  return {
    top: phase === "intro" ? 118 : 154,
    right: Math.round(Math.min(width * 0.16, 220)),
    bottom: phase === "intro" ? 170 : 230,
    left: Math.round(Math.min(width * 0.16, 220)),
  };
}

function fitCinematicCountry(
  map: Map,
  country: CinematicCountry,
  phase: "intro" | "detail",
  duration: number,
) {
  map.fitBounds(country.bounds, {
    padding: cinematicPadding(map, phase),
    maxZoom: phase === "intro" ? country.introMaxZoom : country.detailMaxZoom,
    pitch: phase === "intro" ? (country.id === "lebanon" ? 52 : 24) : 0,
    bearing: phase === "intro" && country.id === "lebanon" ? -10 : 0,
    duration,
    easing: easeInOutCubic,
    essential: true,
    retainPadding: false,
  });
}

function resetMapCamera(map: Map, duration = 1300) {
  map.flyTo({
    center: INITIAL_STATS.center,
    zoom: INITIAL_STATS.zoom,
    pitch: INITIAL_STATS.pitch,
    bearing: INITIAL_STATS.bearing,
    duration,
    easing: easeInOutCubic,
    essential: true,
  });
}

function zoomOutForCountryTransition(map: Map) {
  map.easeTo({
    center: INITIAL_STATS.center,
    zoom: 1.18,
    pitch: 0,
    bearing: 0,
    duration: CINEMATIC_ZOOM_OUT_DURATION,
    easing: easeInOutCubic,
    essential: true,
  });
}

function ensureTerrainSource(map: Map) {
  if (map.getSource(TERRAIN_SOURCE_ID)) {
    return;
  }

  map.addSource(TERRAIN_SOURCE_ID, {
    type: "raster-dem",
    url: "mapbox://mapbox.mapbox-terrain-dem-v1",
    tileSize: 512,
    maxzoom: 14,
  });
}

function ensureCountryHoverLayers(map: Map) {
  if (!map.getSource(COUNTRY_SOURCE_ID)) {
    map.addSource(COUNTRY_SOURCE_ID, {
      type: "vector",
      url: "https://demotiles.maplibre.org/tiles/tiles.json",
      promoteId: {
        [COUNTRY_SOURCE_LAYER]: "ADM0_A3",
      },
    });
  }

  if (!map.getLayer(COUNTRY_HOVER_FILL_LAYER_ID)) {
    map.addLayer({
      id: COUNTRY_HOVER_FILL_LAYER_ID,
      type: "fill",
      source: COUNTRY_SOURCE_ID,
      "source-layer": COUNTRY_SOURCE_LAYER,
      slot: "top",
      paint: {
        "fill-color": "#2dd4bf",
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.16, 0],
      },
    });
  }

  if (!map.getLayer(COUNTRY_HOVER_LINE_LAYER_ID)) {
    map.addLayer({
      id: COUNTRY_HOVER_LINE_LAYER_ID,
      type: "line",
      source: COUNTRY_SOURCE_ID,
      "source-layer": COUNTRY_SOURCE_LAYER,
      slot: "top",
      paint: {
        "line-color": "#ffffff",
        "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.6, 0],
        "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.86, 0],
        "line-blur": 0.4,
        "line-emissive-strength": 0.8,
      },
    });
  }

  if (!map.getLayer(COUNTRY_INTERACTION_LAYER_ID)) {
    map.addLayer({
      id: COUNTRY_INTERACTION_LAYER_ID,
      type: "fill",
      source: COUNTRY_SOURCE_ID,
      "source-layer": COUNTRY_SOURCE_LAYER,
      slot: "top",
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": 0.01,
      },
    });
  }
}

function ensureSandboxLayers(map: Map, visible: boolean) {
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: ROUTE_DATA,
      lineMetrics: true,
    });
  }

  if (!map.getSource(STOPS_SOURCE_ID)) {
    map.addSource(STOPS_SOURCE_ID, {
      type: "geojson",
      data: STOP_DATA,
    });
  }

  const visibility = visible ? "visible" : "none";

  if (!map.getLayer(ROUTE_GLOW_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_GLOW_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      slot: "top",
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility,
      },
      paint: {
        "line-color": "#2dd4bf",
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 9, 10, 20],
        "line-blur": 8,
        "line-opacity": 0.34,
        "line-emissive-strength": 1,
      },
    });
  }

  if (!map.getLayer(ROUTE_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      slot: "top",
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility,
      },
      paint: {
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 10, 8],
        "line-opacity": 0.95,
        "line-emissive-strength": 0.9,
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0,
          "#2dd4bf",
          0.45,
          "#f59e0b",
          0.72,
          "#f43f5e",
          1,
          "#8b5cf6",
        ],
      },
    });
  }

  if (!map.getLayer(STOP_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: STOP_CIRCLE_LAYER_ID,
      type: "circle",
      source: STOPS_SOURCE_ID,
      slot: "top",
      layout: {
        visibility,
      },
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 10, 10],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.96,
        "circle-emissive-strength": 0.85,
      },
    });
  }

  if (!map.getLayer(STOP_LABEL_LAYER_ID)) {
    map.addLayer({
      id: STOP_LABEL_LAYER_ID,
      type: "symbol",
      source: STOPS_SOURCE_ID,
      slot: "top",
      minzoom: 3.2,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 10, 14],
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        visibility,
      },
      paint: {
        "text-color": "#f8fafc",
        "text-halo-color": "#020617",
        "text-halo-width": 1.4,
        "text-emissive-strength": 0.7,
      },
    });
  }
}

function setOverlayVisibility(map: Map, visible: boolean) {
  const visibility = visible ? "visible" : "none";

  OVERLAY_LAYER_IDS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
}

function applyTerrain(map: Map, terrainEnabled: boolean) {
  if (!terrainEnabled) {
    map.setTerrain(null);
    return;
  }

  ensureTerrainSource(map);
  map.setTerrain({
    source: TERRAIN_SOURCE_ID,
    exaggeration: 1.45,
  });
}

function applyWeather(map: Map, weather: WeatherPreset) {
  if (weather === "rain") {
    map.setSnow(null);
    map.setRain(rainSpec());
    return;
  }

  if (weather === "snow") {
    map.setRain(null);
    map.setSnow(snowSpec());
    return;
  }

  map.setRain(null);
  map.setSnow(null);
}

function applyBasemapConfigToMap(
  map: Map,
  config: ReturnType<typeof basemapConfig>,
  lightPreset: LightPreset,
) {
  Object.entries(config).forEach(([key, value]) => {
    map.setConfigProperty("basemap", key, value);
  });
  map.setFog(fogForLight(lightPreset));
}

function propertyString(value: unknown) {
  return typeof value === "string" ? value : "";
}

const ALPHA2_PROPERTY_KEYS = [
  "ISO_A2",
  "ISO_A2_EH",
  "WB_A2",
  "ADM0_A2",
  "A2",
  "POSTAL",
  "iso_a2",
  "wb_a2",
] as const;

const ALPHA3_PROPERTY_KEYS = [
  "ADM0_A3",
  "ISO_A3",
  "ISO_A3_EH",
  "WB_A3",
  "SOV_A3",
  "SU_A3",
  "GU_A3",
  "BRK_A3",
  "adm0_a3",
  "iso_a3",
] as const;

const ALPHA2_NORMALIZATIONS: Record<string, string> = {
  EL: "GR",
  KO: "XK",
  UK: "GB",
};

const ISO3_TO_ALPHA2: Record<string, string> = {
  ABW: "AW",
  AFG: "AF",
  AGO: "AO",
  AIA: "AI",
  ALA: "AX",
  ALB: "AL",
  AND: "AD",
  ARE: "AE",
  ARG: "AR",
  ARM: "AM",
  ASM: "AS",
  ATA: "AQ",
  ATF: "TF",
  ATG: "AG",
  AUS: "AU",
  AUT: "AT",
  AZE: "AZ",
  BDI: "BI",
  BEL: "BE",
  BEN: "BJ",
  BES: "BQ",
  BFA: "BF",
  BGD: "BD",
  BGR: "BG",
  BHR: "BH",
  BHS: "BS",
  BIH: "BA",
  BLM: "BL",
  BLR: "BY",
  BLZ: "BZ",
  BMU: "BM",
  BOL: "BO",
  BRA: "BR",
  BRB: "BB",
  BRN: "BN",
  BTN: "BT",
  BVT: "BV",
  BWA: "BW",
  CAF: "CF",
  CAN: "CA",
  CCK: "CC",
  CHE: "CH",
  CHL: "CL",
  CHN: "CN",
  CIV: "CI",
  CMR: "CM",
  COD: "CD",
  COG: "CG",
  COK: "CK",
  COL: "CO",
  COM: "KM",
  CPV: "CV",
  CRI: "CR",
  CUB: "CU",
  CUW: "CW",
  CXR: "CX",
  CYM: "KY",
  CYP: "CY",
  CZE: "CZ",
  DEU: "DE",
  DJI: "DJ",
  DMA: "DM",
  DNK: "DK",
  DOM: "DO",
  DZA: "DZ",
  ECU: "EC",
  EGY: "EG",
  ERI: "ER",
  ESH: "EH",
  ESP: "ES",
  EST: "EE",
  ETH: "ET",
  FIN: "FI",
  FJI: "FJ",
  FLK: "FK",
  FRA: "FR",
  FRO: "FO",
  FSM: "FM",
  GAB: "GA",
  GBR: "GB",
  GEO: "GE",
  GGY: "GG",
  GHA: "GH",
  GIB: "GI",
  GIN: "GN",
  GLP: "GP",
  GMB: "GM",
  GNB: "GW",
  GNQ: "GQ",
  GRC: "GR",
  GRD: "GD",
  GRL: "GL",
  GTM: "GT",
  GUF: "GF",
  GUM: "GU",
  GUY: "GY",
  HKG: "HK",
  HMD: "HM",
  HND: "HN",
  HRV: "HR",
  HTI: "HT",
  HUN: "HU",
  IDN: "ID",
  IMN: "IM",
  IND: "IN",
  IOT: "IO",
  IRL: "IE",
  IRN: "IR",
  IRQ: "IQ",
  ISL: "IS",
  ISR: "IL",
  ITA: "IT",
  JAM: "JM",
  JEY: "JE",
  JOR: "JO",
  JPN: "JP",
  KAZ: "KZ",
  KEN: "KE",
  KGZ: "KG",
  KHM: "KH",
  KIR: "KI",
  KNA: "KN",
  KOR: "KR",
  KOS: "XK",
  KWT: "KW",
  LAO: "LA",
  LBN: "LB",
  LBR: "LR",
  LBY: "LY",
  LCA: "LC",
  LIE: "LI",
  LKA: "LK",
  LSO: "LS",
  LTU: "LT",
  LUX: "LU",
  LVA: "LV",
  MAC: "MO",
  MAF: "MF",
  MAR: "MA",
  MCO: "MC",
  MDA: "MD",
  MDG: "MG",
  MDV: "MV",
  MEX: "MX",
  MHL: "MH",
  MKD: "MK",
  MLI: "ML",
  MLT: "MT",
  MMR: "MM",
  MNE: "ME",
  MNG: "MN",
  MNP: "MP",
  MOZ: "MZ",
  MRT: "MR",
  MSR: "MS",
  MTQ: "MQ",
  MUS: "MU",
  MWI: "MW",
  MYS: "MY",
  MYT: "YT",
  NAM: "NA",
  NCL: "NC",
  NER: "NE",
  NFK: "NF",
  NGA: "NG",
  NIC: "NI",
  NIU: "NU",
  NLD: "NL",
  NOR: "NO",
  NPL: "NP",
  NRU: "NR",
  NZL: "NZ",
  OMN: "OM",
  PAK: "PK",
  PAN: "PA",
  PCN: "PN",
  PER: "PE",
  PHL: "PH",
  PLW: "PW",
  PNG: "PG",
  POL: "PL",
  PRI: "PR",
  PRK: "KP",
  PRT: "PT",
  PRY: "PY",
  PSE: "PS",
  PYF: "PF",
  QAT: "QA",
  REU: "RE",
  ROU: "RO",
  RUS: "RU",
  RWA: "RW",
  SAU: "SA",
  SDN: "SD",
  SEN: "SN",
  SGP: "SG",
  SGS: "GS",
  SHN: "SH",
  SJM: "SJ",
  SLB: "SB",
  SLE: "SL",
  SLV: "SV",
  SMR: "SM",
  SOM: "SO",
  SPM: "PM",
  SRB: "RS",
  SSD: "SS",
  STP: "ST",
  SUR: "SR",
  SVK: "SK",
  SVN: "SI",
  SWE: "SE",
  SWZ: "SZ",
  SXM: "SX",
  SYC: "SC",
  SYR: "SY",
  TCA: "TC",
  TCD: "TD",
  TGO: "TG",
  THA: "TH",
  TJK: "TJ",
  TKL: "TK",
  TKM: "TM",
  TLS: "TL",
  TON: "TO",
  TTO: "TT",
  TUN: "TN",
  TUR: "TR",
  TUV: "TV",
  TWN: "TW",
  TZA: "TZ",
  UGA: "UG",
  UKR: "UA",
  UMI: "UM",
  URY: "UY",
  USA: "US",
  UZB: "UZ",
  VAT: "VA",
  VCT: "VC",
  VEN: "VE",
  VGB: "VG",
  VIR: "VI",
  VNM: "VN",
  VUT: "VU",
  WLF: "WF",
  WSM: "WS",
  XKX: "XK",
  YEM: "YE",
  ZAF: "ZA",
  ZMB: "ZM",
  ZWE: "ZW",
};

function countryName(properties: MapboxFeatureProperties) {
  return (
    propertyString(properties?.NAME_EN) ||
    propertyString(properties?.NAME) ||
    propertyString(properties?.ADMIN) ||
    propertyString(properties?.name) ||
    "Unknown country"
  );
}

function countryCode(properties: MapboxFeatureProperties) {
  return (
    propertyString(properties?.ADM0_A3) ||
    propertyString(properties?.ISO_A3) ||
    propertyString(properties?.iso_a3) ||
    "n/a"
  );
}

function normalizeAlpha2(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const candidate = value.trim().toUpperCase();
  const normalized = ALPHA2_NORMALIZATIONS[candidate] ?? candidate;

  return /^[A-Z]{2}$/.test(normalized) && hasFlag(normalized) ? normalized : null;
}

function normalizeAlpha3(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const candidate = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(candidate) ? candidate : null;
}

function countryAlpha2(properties: MapboxFeatureProperties) {
  for (const key of ALPHA2_PROPERTY_KEYS) {
    const alpha2 = normalizeAlpha2(properties?.[key]);
    if (alpha2) {
      return alpha2;
    }
  }

  for (const key of ALPHA3_PROPERTY_KEYS) {
    const alpha3 = normalizeAlpha3(properties?.[key]);
    const alpha2 = alpha3 ? ISO3_TO_ALPHA2[alpha3] : null;
    if (alpha2 && hasFlag(alpha2)) {
      return alpha2;
    }
  }

  return null;
}

function stopFromFeature(feature: MapboxEventFeature): StopProperties {
  return {
    id: propertyString(feature.properties?.id),
    name: propertyString(feature.properties?.name),
    country: propertyString(feature.properties?.country),
    alpha2: propertyString(feature.properties?.alpha2),
    color: propertyString(feature.properties?.color),
  };
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function MapboxSandbox() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const styleLoadCountRef = useRef(0);
  const appliedStylePresetRef = useRef<StylePreset>(DEFAULT_STYLE_PRESET);
  const hoveredCountryIdRef = useRef<string | number | null>(null);
  const selectedCountryFeatureIdRef = useRef<string | number | null>(null);
  const cinematicTimersRef = useRef<number[]>([]);

  const [stylePreset, setStylePreset] = useState<StylePreset>(DEFAULT_STYLE_PRESET);
  const [lightPreset, setLightPreset] = useState<LightPreset>(DEFAULT_LIGHT_PRESET);
  const [theme, setTheme] = useState<ThemePreset>(DEFAULT_THEME);
  const [projection, setProjection] = useState<ProjectionPreset>(DEFAULT_PROJECTION);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terrainEnabled, setTerrainEnabled] = useState(true);
  const [weather, setWeather] = useState<WeatherPreset>(DEFAULT_WEATHER);
  const [routeVisible, setRouteVisible] = useState(true);
  const [show3dObjects, setShow3dObjects] = useState(true);
  const [showPlaceLabels, setShowPlaceLabels] = useState(true);
  const [showRoadLabels, setShowRoadLabels] = useState(true);
  const [showPoiLabels, setShowPoiLabels] = useState(false);
  const [showTransitLabels, setShowTransitLabels] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<StopProperties | null>(null);
  const [hoveredCountrySummary, setHoveredCountrySummary] =
    useState<HoveredCountrySummary | null>(null);
  const [cinematicCountry, setCinematicCountry] = useState<CinematicCountry | null>(null);
  const [cinematicPhase, setCinematicPhase] = useState<CinematicPhase>("intro");
  const [stats, setStats] = useState<MapStats>(INITIAL_STATS);
  const tokenError = MAPBOX_TOKEN ? null : "Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local.";

  const activeBasemapConfig = useMemo(
    () =>
      basemapConfig({
        lightPreset,
        theme,
        show3dObjects,
        showPlaceLabels,
        showRoadLabels,
        showPoiLabels,
        showTransitLabels,
      }),
    [
      lightPreset,
      theme,
      show3dObjects,
      showPlaceLabels,
      showRoadLabels,
      showPoiLabels,
      showTransitLabels,
    ],
  );

  const settingsRef = useRef({
    activeBasemapConfig,
    lightPreset,
    terrainEnabled,
    weather,
    routeVisible,
  });

  useEffect(() => {
    settingsRef.current = {
      activeBasemapConfig,
      lightPreset,
      terrainEnabled,
      weather,
      routeVisible,
    };
  }, [activeBasemapConfig, lightPreset, routeVisible, terrainEnabled, weather]);

  const updateStats = useCallback(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    setStats(readStats(map, styleLoadCountRef.current));
  }, []);

  const setCountryFeatureHover = useCallback((id: string | number | null, hover: boolean) => {
    const map = mapRef.current;

    if (!map || id == null || !map.getSource(COUNTRY_SOURCE_ID)) {
      return;
    }

    map.setFeatureState(
      {
        source: COUNTRY_SOURCE_ID,
        sourceLayer: COUNTRY_SOURCE_LAYER,
        id,
      },
      { hover },
    );
  }, []);

  const clearCinematicTimers = useCallback(() => {
    cinematicTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    cinematicTimersRef.current = [];
  }, []);

  const beginCountryIntro = useCallback(
    (country: CinematicCountry, featureId: string | number = country.alpha3) => {
      const map = mapRef.current;

      clearCinematicTimers();
      setSettingsOpen(false);
      setSelectedStop(null);
      setHoveredCountrySummary(null);
      setCinematicCountry(country);
      setCinematicPhase("intro");

      if (selectedCountryFeatureIdRef.current !== featureId) {
        setCountryFeatureHover(selectedCountryFeatureIdRef.current, false);
      }

      selectedCountryFeatureIdRef.current = featureId;
      setCountryFeatureHover(featureId, true);

      if (map) {
        map.stop();
        fitCinematicCountry(map, country, "intro", CINEMATIC_INTRO_DURATION);
      }
    },
    [clearCinematicTimers, setCountryFeatureHover],
  );

  const handleLearnMore = useCallback(() => {
    const map = mapRef.current;

    if (!map || !cinematicCountry) {
      return;
    }

    setCinematicPhase("fact");
    map.stop();
    fitCinematicCountry(map, cinematicCountry, "detail", CINEMATIC_DETAIL_DURATION);
  }, [cinematicCountry]);

  const handleShowFlag = useCallback(() => {
    setCinematicPhase("flag");
  }, []);

  const handleNextCountry = useCallback(() => {
    const map = mapRef.current;

    if (!cinematicCountry) {
      return;
    }

    const nextCountry = nextCinematicCountry(cinematicCountry);
    clearCinematicTimers();
    setCinematicPhase("transition");
    setCountryFeatureHover(selectedCountryFeatureIdRef.current, false);
    selectedCountryFeatureIdRef.current = null;

    if (map) {
      map.stop();
      zoomOutForCountryTransition(map);
    }

    const timer = window.setTimeout(() => {
      beginCountryIntro(nextCountry);
    }, CINEMATIC_ZOOM_OUT_DURATION + 80);
    cinematicTimersRef.current = [timer];
  }, [beginCountryIntro, cinematicCountry, clearCinematicTimers, setCountryFeatureHover]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    if (tokenError) {
      return;
    }

    if (!mapboxgl.supported()) {
      window.setTimeout(() => {
        setMapError("Mapbox GL JS needs WebGL 2 support in this browser.");
      }, 0);
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const initialBasemapConfig = basemapConfig({
      lightPreset: DEFAULT_LIGHT_PRESET,
      theme: DEFAULT_THEME,
      show3dObjects: true,
      showPlaceLabels: true,
      showRoadLabels: true,
      showPoiLabels: false,
      showTransitLabels: false,
    });

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: STYLE_URLS[DEFAULT_STYLE_PRESET],
      config: {
        basemap: initialBasemapConfig,
      },
      projection: DEFAULT_PROJECTION,
      center: INITIAL_STATS.center,
      zoom: INITIAL_STATS.zoom,
      pitch: INITIAL_STATS.pitch,
      bearing: INITIAL_STATS.bearing,
      antialias: true,
      attributionControl: false,
      cooperativeGestures: true,
      performanceMetricsCollection: false,
    });

    const handleStyleLoad = () => {
      const settings = settingsRef.current;

      styleLoadCountRef.current += 1;
      applyBasemapConfigToMap(map, settings.activeBasemapConfig, settings.lightPreset);
      applyTerrain(map, settings.terrainEnabled);
      applyWeather(map, settings.weather);
      ensureCountryHoverLayers(map);
      ensureSandboxLayers(map, settings.routeVisible);
      hoveredCountryIdRef.current = null;
      setStyleReady(true);
      updateStats();
    };

    const handleStopClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      if (!feature) {
        return;
      }

      const stop = stopFromFeature(feature);

      setSelectedStop(stop);

      new mapboxgl.Popup({
        className: styles.popup,
        closeButton: false,
        offset: 18,
      })
        .setLngLat(event.lngLat)
        .setHTML(`<strong>${stop.name}</strong><span>${stop.country}</span>`)
        .addTo(map);
    };

    const handleStopMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      if (!feature) {
        return;
      }

      map.getCanvas().style.cursor = "pointer";
    };

    const handleStopLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const handleCountryMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      if (!feature) {
        return;
      }

      const nextId = feature.id ?? countryCode(feature.properties);

      if (hoveredCountryIdRef.current !== nextId) {
        if (hoveredCountryIdRef.current !== selectedCountryFeatureIdRef.current) {
          setCountryFeatureHover(hoveredCountryIdRef.current, false);
        }
        hoveredCountryIdRef.current = nextId;
        setCountryFeatureHover(nextId, true);
      }

      setHoveredCountrySummary({
        name: countryName(feature.properties),
        alpha2: countryAlpha2(feature.properties),
      });
      map.getCanvas().style.cursor = "pointer";
    };

    const handleCountryLeave = () => {
      if (hoveredCountryIdRef.current !== selectedCountryFeatureIdRef.current) {
        setCountryFeatureHover(hoveredCountryIdRef.current, false);
      }
      hoveredCountryIdRef.current = null;
      map.getCanvas().style.cursor = "";
      setHoveredCountrySummary(null);
    };

    const handleCountryClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      if (!feature) {
        return;
      }

      const alpha3 = countryCode(feature.properties);
      const country = CINEMATIC_COUNTRIES_BY_ALPHA3[alpha3];
      if (!country) {
        return;
      }

      beginCountryIntro(country, feature.id ?? alpha3);
    };

    const handleMapClick = (event: mapboxgl.MapMouseEvent) => {
      const country = cinematicCountryAtLngLat(event.lngLat.lng, event.lngLat.lat);
      if (!country) {
        return;
      }

      beginCountryIntro(country);
    };

    const handleError = (event: MapboxErrorEvent) => {
      setMapError(event.error.message);
    };

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showAccuracyCircle: true,
      }),
      "top-right",
    );
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    map.on("style.load", handleStyleLoad);
    map.on("move", updateStats);
    map.on("idle", updateStats);
    map.on("error", handleError);
    map.on("click", handleMapClick);
    map.on("mousemove", COUNTRY_INTERACTION_LAYER_ID, handleCountryMove);
    map.on("mouseleave", COUNTRY_INTERACTION_LAYER_ID, handleCountryLeave);
    map.on("click", COUNTRY_INTERACTION_LAYER_ID, handleCountryClick);
    map.on("click", STOP_CIRCLE_LAYER_ID, handleStopClick);
    STOP_HOVER_LAYER_IDS.forEach((layerId) => {
      map.on("mousemove", layerId, handleStopMove);
      map.on("mouseleave", layerId, handleStopLeave);
    });

    mapRef.current = map;

    return () => {
      setStyleReady(false);
      hoveredCountryIdRef.current = null;
      selectedCountryFeatureIdRef.current = null;
      clearCinematicTimers();
      setHoveredCountrySummary(null);
      map.remove();
      mapRef.current = null;
    };
  }, [beginCountryIntro, clearCinematicTimers, setCountryFeatureHover, tokenError, updateStats]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || appliedStylePresetRef.current === stylePreset) {
      return;
    }

    appliedStylePresetRef.current = stylePreset;
    setStyleReady(false);
    map.setStyle(STYLE_URLS[stylePreset], FULL_STYLE_RELOAD_OPTIONS);
  }, [stylePreset, styleReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    applyBasemapConfigToMap(map, activeBasemapConfig, lightPreset);
  }, [activeBasemapConfig, lightPreset, styleReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    map.setProjection(projection);
    updateStats();
  }, [projection, styleReady, updateStats]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    applyTerrain(map, terrainEnabled);
  }, [terrainEnabled, styleReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    applyWeather(map, weather);
  }, [weather, styleReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    setOverlayVisibility(map, routeVisible);
  }, [routeVisible, styleReady]);

  const flyToPreset = (preset: CameraPreset) => {
    mapRef.current?.flyTo({
      center: preset.center,
      zoom: preset.zoom,
      pitch: preset.pitch,
      bearing: preset.bearing,
      duration: 1300,
      essential: true,
    });
  };

  const resetView = () => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    clearCinematicTimers();
    setCinematicCountry(null);
    setSelectedStop(null);
    setHoveredCountrySummary(null);
    setCountryFeatureHover(selectedCountryFeatureIdRef.current, false);
    selectedCountryFeatureIdRef.current = null;
    map.stop();
    resetMapCamera(map);
  };

  const handleRouteVisibleChange = (checked: boolean) => {
    setRouteVisible(checked);

    if (!checked) {
      mapRef.current?.getCanvas().style.setProperty("cursor", "");
    }
  };

  return (
    <main className={`${styles.shell} ${cinematicCountry ? styles.cinematicActive : ""}`}>
      <div ref={mapContainerRef} className={styles.map} />

      <CountryCinematicOverlay
        country={cinematicCountry}
        phase={cinematicPhase}
        engineLabel="Mapbox"
        onLearnMore={handleLearnMore}
        onShowFlag={handleShowFlag}
        onNextCountry={handleNextCountry}
      />

      {!settingsOpen && !cinematicCountry ? (
        <button
          type="button"
          className={styles.settingsLauncher}
          onClick={() => setSettingsOpen(true)}
          aria-controls="mapbox-sandbox-settings"
          aria-expanded={settingsOpen}
        >
          Settings
        </button>
      ) : null}

      {settingsOpen && !cinematicCountry ? (
        <section
          id="mapbox-sandbox-settings"
          className={styles.panel}
          aria-label="Mapbox sandbox controls"
        >
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Sandbox</p>
              <h1>Mapbox GL JS Lab</h1>
            </div>
            <div className={styles.panelActions}>
              <button type="button" className={styles.iconButton} onClick={resetView} aria-label="Reset view">
                Reset
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setSettingsOpen(false)}
                aria-label="Close Mapbox sandbox controls"
              >
                Close
              </button>
            </div>
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.groupLabel}>Basemap</p>
            <div className={styles.segmented}>
              {(["standard", "satellite"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={stylePreset === value ? styles.activeSegment : ""}
                  onClick={() => setStylePreset(value)}
                  aria-pressed={stylePreset === value}
                >
                  {value === "standard" ? "Standard" : "Satellite"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.groupLabel}>Light</p>
            <div className={styles.segmented}>
              {(["dawn", "day", "dusk", "night"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={lightPreset === value ? styles.activeSegment : ""}
                  onClick={() => setLightPreset(value)}
                  aria-pressed={lightPreset === value}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.groupLabel}>Theme</p>
            <div className={styles.segmented}>
              {(["default", "faded", "monochrome"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={theme === value ? styles.activeSegment : ""}
                  onClick={() => setTheme(value)}
                  aria-pressed={theme === value}
                >
                  {value === "monochrome" ? "mono" : value}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGrid}>
            <Toggle checked={terrainEnabled} label="Terrain" onChange={setTerrainEnabled} />
            <Toggle checked={show3dObjects} label="3D objects" onChange={setShow3dObjects} />
            <Toggle checked={showPlaceLabels} label="Places" onChange={setShowPlaceLabels} />
            <Toggle checked={showRoadLabels} label="Roads" onChange={setShowRoadLabels} />
            <Toggle checked={showPoiLabels} label="POI" onChange={setShowPoiLabels} />
            <Toggle checked={showTransitLabels} label="Transit" onChange={setShowTransitLabels} />
            <Toggle checked={routeVisible} label="Route" onChange={handleRouteVisibleChange} />
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.groupLabel}>Projection</p>
            <div className={styles.segmented}>
              {(["globe", "mercator"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={projection === value ? styles.activeSegment : ""}
                  onClick={() => setProjection(value)}
                  aria-pressed={projection === value}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.groupLabel}>Weather</p>
            <div className={styles.segmented}>
              {(["clear", "rain", "snow"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={weather === value ? styles.activeSegment : ""}
                  onClick={() => setWeather(value)}
                  aria-pressed={weather === value}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <p className={styles.groupLabel}>Camera</p>
            <div className={styles.presetGrid}>
              {CAMERA_PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => flyToPreset(preset)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {tokenError || mapError ? <p className={styles.error}>{tokenError ?? mapError}</p> : null}
        </section>
      ) : null}

      {!cinematicCountry ? (
      <section className={styles.statsPanel} aria-label="Mapbox sandbox stats">
        <div className={styles.selectionSummary}>
          <div>
            <p>Selected</p>
            <strong>
              {selectedStop
                ? selectedStop.name
                : hoveredCountrySummary
                  ? `${hoveredCountrySummary.name} ${hoveredCountrySummary.alpha2 ?? ""}`.trim()
                  : "None"}
            </strong>
          </div>
        </div>
        <dl>
          <div>
            <dt>Lng</dt>
            <dd>{stats.center[0].toFixed(3)}</dd>
          </div>
          <div>
            <dt>Lat</dt>
            <dd>{stats.center[1].toFixed(3)}</dd>
          </div>
          <div>
            <dt>Zoom</dt>
            <dd>{stats.zoom.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Pitch</dt>
            <dd>{stats.pitch.toFixed(0)} deg</dd>
          </div>
          <div>
            <dt>Bearing</dt>
            <dd>{stats.bearing.toFixed(0)} deg</dd>
          </div>
          <div>
            <dt>Tiles</dt>
            <dd>{stats.tilesLoaded ? "idle" : "loading"}</dd>
          </div>
          <div>
            <dt>Styles</dt>
            <dd>{stats.styleLoads}</dd>
          </div>
        </dl>
      </section>
      ) : null}
    </main>
  );
}
