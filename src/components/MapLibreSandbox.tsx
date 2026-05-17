"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type LngLatBoundsLike,
  type Map,
  type MapLayerMouseEvent,
  type MapSourceDataEvent,
  type PaddingOptions,
  type StyleSpecification,
} from "maplibre-gl";
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
import styles from "./MapLibreSandbox.module.css";
import type { R3FCameraMode } from "./R3FOverlay";

const LazyR3FOverlay = lazy(() =>
  import("./R3FOverlay").then((m) => ({ default: m.R3FOverlay })),
);

type MapMode = "satellite-3d-topdown" | "globe";
type MapProjection = "mercator" | "globe";
type HoverMode = "border" | "glow" | "country-highlight" | "bloom" | "blur" | "animated";

type ModeOption = {
  value: MapMode;
  label: string;
  description: string;
  satelliteVisible: boolean;
  hillshadeVisible: boolean;
  terrainEnabled: boolean;
  countryFillVisible: boolean;
  countryFillOpacity: number;
  outlineColor: string;
  oceanVisible: boolean;
  oceanOpacity: number;
  projection: MapProjection;
  zoom: number;
  pitch: number;
  bearing: number;
};

type HoveredCountry = {
  id: string | number;
  name: string;
  code: string;
  alpha2: string | null;
};

type MapStats = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  fps: number;
  visibleCountries: number;
  sourceEvents: number;
  tilesLoaded: boolean;
};

const INITIAL_CENTER: [number, number] = [55.2708, 25.2048];
const INITIAL_ZOOM = 2.25;
const TERRAIN_EXAGGERATION = 4;
const HIMALAYA_VIEW = {
  center: [86.925, 27.9881] as [number, number],
  zoom: 9,
  pitch: 76,
  bearing: -32,
};

const COUNTRY_SOURCE = "openmaptiles";
const COUNTRY_LAYER = "countries";
const SATELLITE_SOURCE = "satellite";
const TERRAIN_SOURCE = "terrainSource";
const HILLSHADE_SOURCE = "hillshadeSource";
const INTERACTION_LAYER = "country-interaction-fill";
const HOVER_GLOW_LAYER = "country-hover-glow";
const HOVER_FILL_LAYER = "country-hover-fill";
const HOVER_LINE_LAYER = "country-hover-line";

const SATELLITE_ATTRIBUTION =
  "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const HOVER_MODE_OPTIONS: Array<{
  value: HoverMode;
  label: string;
  description: string;
}> = [
  {
    value: "border",
    label: "White border",
    description: "A crisp white country outline with no fill.",
  },
  {
    value: "glow",
    label: "Glow",
    description: "A white outline with a soft outer halo.",
  },
  {
    value: "country-highlight",
    label: "Country highlight",
    description: "A subtle transparent country fill plus white outline.",
  },
  {
    value: "bloom",
    label: "Bloom",
    description: "A wider luminous halo around the country border.",
  },
  {
    value: "blur",
    label: "Blur",
    description: "A soft blurred border and faint country wash.",
  },
  {
    value: "animated",
    label: "Animated overlay",
    description: "A pulsing hover outline driven by render frames.",
  },
];

/* ------------------------------------------------------------------ */
/*  R3F effect-preset matrix (same generation pattern as map modes)    */
/* ------------------------------------------------------------------ */

type R3FMatrixPreset =
  `p${0 | 1}-a${0 | 1}-f${0 | 1}-g${0 | 1}-d${0 | 1}`;
type R3FPresetMode = "off" | R3FMatrixPreset;

type R3FPresetOption = {
  value: R3FPresetMode;
  label: string;
  description: string;
  particles: boolean;
  atmosphere: boolean;
  fog: boolean;
  glow: boolean;
  cinematicDepth: boolean;
};

const R3F_CAMERA_OPTIONS: Array<{ value: R3FCameraMode; label: string; description: string }> = [
  {
    value: "ortho",
    label: "Screen-space (orthographic)",
    description: "Static orthographic camera. Effects are 2D-looking overlays, no jitter.",
  },
  {
    value: "perspective",
    label: "Map-synced (perspective)",
    description: "Perspective camera. Particles feel spatially connected to the terrain.",
  },
];

const BOOLEAN_FLAGS = [false, true] as const;

/* -- R3F preset helpers -------------------------------------------- */

function r3fPresetValue({
  particles,
  atmosphere,
  fog,
  glow,
  cinematicDepth,
}: Pick<R3FPresetOption, "particles" | "atmosphere" | "fog" | "glow" | "cinematicDepth">): R3FMatrixPreset {
  return `p${particles ? 1 : 0}-a${atmosphere ? 1 : 0}-f${fog ? 1 : 0}-g${glow ? 1 : 0}-d${cinematicDepth ? 1 : 0}`;
}

function r3fPresetLabel(option: Pick<R3FPresetOption, "particles" | "atmosphere" | "fog" | "glow" | "cinematicDepth">) {
  const parts = [
    option.particles && "Particles",
    option.atmosphere && "Atmo",
    option.fog && "Fog",
    option.glow && "Glow",
    option.cinematicDepth && "Depth",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : "No effects (baseline)";
}

function r3fPresetDescription(option: Pick<R3FPresetOption, "particles" | "atmosphere" | "fog" | "glow" | "cinematicDepth">) {
  const layers = [
    option.particles && "sparkle particles + stars",
    option.atmosphere && "radial atmosphere shader",
    option.fog && "scene fog + drifting clouds",
    option.glow && "bloom post-processing",
    option.cinematicDepth && "vignette + depth-of-field",
  ].filter(Boolean);
  if (layers.length === 0) return "Canvas mounted with no effects — measures baseline GPU overhead.";
  return `Enables ${layers.join(", ")}.`;
}

const R3F_MATRIX_OPTIONS: R3FPresetOption[] = BOOLEAN_FLAGS.flatMap((particles) =>
  BOOLEAN_FLAGS.flatMap((atmosphere) =>
    BOOLEAN_FLAGS.flatMap((fog) =>
      BOOLEAN_FLAGS.flatMap((glow) =>
        BOOLEAN_FLAGS.map((cinematicDepth) => {
          const option = { particles, atmosphere, fog, glow, cinematicDepth };
          return {
            ...option,
            value: r3fPresetValue(option),
            label: r3fPresetLabel(option),
            description: r3fPresetDescription(option),
          };
        }),
      ),
    ),
  ),
);

const R3F_OFF_OPTION: R3FPresetOption = {
  value: "off",
  label: "R3F disabled",
  description: "No Three.js overlay — zero additional GPU cost.",
  particles: false,
  atmosphere: false,
  fog: false,
  glow: false,
  cinematicDepth: false,
};

const R3F_PRESET_OPTIONS: R3FPresetOption[] = [R3F_OFF_OPTION, ...R3F_MATRIX_OPTIONS];

const R3F_PRESET_LOOKUP = Object.fromEntries(
  R3F_PRESET_OPTIONS.map((option) => [option.value, option]),
) as Record<R3FPresetMode, R3FPresetOption>;

/* ------------------------------------------------------------------ */

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "satellite-3d-topdown",
    label: "Sat + 3D top-down",
    description:
      "Satellite raster draped on the 3D terrain mesh, but with pitch and bearing kept flat.",
    satelliteVisible: true,
    hillshadeVisible: false,
    terrainEnabled: true,
    countryFillVisible: false,
    countryFillOpacity: 0,
    outlineColor: "rgba(255, 255, 255, 0.72)",
    oceanVisible: false,
    oceanOpacity: 0,
    projection: "mercator",
    zoom: INITIAL_ZOOM,
    pitch: 0,
    bearing: 0,
  },
  {
    value: "globe",
    label: "Globe",
    description:
      "The same satellite and country layers reprojected onto MapLibre's globe view.",
    satelliteVisible: true,
    hillshadeVisible: false,
    terrainEnabled: true,
    countryFillVisible: false,
    countryFillOpacity: 0,
    outlineColor: "rgba(255, 255, 255, 0.72)",
    oceanVisible: false,
    oceanOpacity: 0,
    projection: "globe",
    zoom: 1.25,
    pitch: 0,
    bearing: 0,
  },
];

const DEFAULT_MAP_MODE: MapMode = "satellite-3d-topdown";
const MODE_LOOKUP = Object.fromEntries(
  MODE_OPTIONS.map((option) => [option.value, option]),
) as Record<MapMode, ModeOption>;
const DEFAULT_MODE_CONFIG = MODE_LOOKUP[DEFAULT_MAP_MODE];

const EXPERIMENT_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    [COUNTRY_SOURCE]: {
      type: "vector",
      url: "https://demotiles.maplibre.org/tiles/tiles.json",
      promoteId: {
        [COUNTRY_LAYER]: "ADM0_A3",
      },
    },
    [SATELLITE_SOURCE]: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: SATELLITE_ATTRIBUTION,
    },
    [TERRAIN_SOURCE]: {
      type: "raster-dem",
      url: "https://tiles.mapterhorn.com/tilejson.json",
    },
    [HILLSHADE_SOURCE]: {
      type: "raster-dem",
      url: "https://tiles.mapterhorn.com/tilejson.json",
    },
  },
  terrain: {
    source: TERRAIN_SOURCE,
    exaggeration: TERRAIN_EXAGGERATION,
  },
  sky: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#0c1116",
      },
    },
    {
      id: "satellite-raster",
      type: "raster",
      source: SATELLITE_SOURCE,
      layout: {
        visibility: DEFAULT_MODE_CONFIG.satelliteVisible ? "visible" : "none",
      },
      paint: {
        "raster-fade-duration": 240,
        "raster-saturation": -0.08,
        "raster-contrast": 0.08,
      },
    },
    {
      id: "terrain-ocean",
      type: "background",
      paint: {
        "background-color": "#10202c",
        "background-opacity": DEFAULT_MODE_CONFIG.oceanOpacity,
      },
    },
    {
      id: "terrain-hillshade",
      type: "hillshade",
      source: HILLSHADE_SOURCE,
      layout: {
        visibility: DEFAULT_MODE_CONFIG.hillshadeVisible ? "visible" : "none",
      },
      paint: {
        "hillshade-exaggeration": 0.35,
        "hillshade-shadow-color": "#0d141b",
        "hillshade-highlight-color": "#e9dfc8",
        "hillshade-accent-color": "#5f6d64",
        "hillshade-method": "multidirectional",
      },
    },
    {
      id: "country-fill",
      type: "fill",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "fill-color": [
          "match",
          ["get", "ADM0_A3"],
          ["ARE", "OMN", "SAU", "QAT", "KWT", "BHR"],
          "#d8b76f",
          ["IND", "PAK", "BGD", "LKA", "NPL"],
          "#74a77c",
          ["CHN", "JPN", "KOR", "IDN", "MYS", "THA", "VNM"],
          "#7da7b8",
          ["USA", "CAN", "MEX"],
          "#b27878",
          ["BRA", "ARG", "CHL", "PER", "COL"],
          "#73a36e",
          ["FRA", "DEU", "ESP", "ITA", "GBR", "NOR", "SWE"],
          "#9d91bd",
          "#8eac91",
        ],
        "fill-opacity": DEFAULT_MODE_CONFIG.countryFillOpacity,
      },
    },
    {
      id: "country-outline",
      type: "line",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "line-color": DEFAULT_MODE_CONFIG.outlineColor,
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.35, 4, 0.7, 8, 1.4],
      },
    },
    {
      id: HOVER_GLOW_LAYER,
      type: "line",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "line-color": "#ffffff",
        "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 0, 0],
        "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0, 0],
        "line-blur": 0,
      },
    },
    {
      id: HOVER_FILL_LAYER,
      type: "fill",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": 0,
      },
    },
    {
      id: HOVER_LINE_LAYER,
      type: "line",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "line-color": "#ffffff",
        "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 3, 0],
        "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0],
      },
    },
    {
      id: INTERACTION_LAYER,
      type: "fill",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": 0.01,
      },
    },
  ],
};

const INITIAL_STATS: MapStats = {
  center: INITIAL_CENTER,
  zoom: INITIAL_ZOOM,
  pitch: 0,
  bearing: 0,
  fps: 0,
  visibleCountries: 0,
  sourceEvents: 0,
  tilesLoaded: false,
};

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

function countryName(properties: maplibregl.GeoJSONFeature["properties"]) {
  return (
    properties?.NAME_EN ||
    properties?.NAME ||
    properties?.ADMIN ||
    properties?.name ||
    "Unknown country"
  );
}

function countryCode(properties: maplibregl.GeoJSONFeature["properties"]) {
  return properties?.ADM0_A3 || properties?.ISO_A3 || properties?.iso_a3 || "n/a";
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

function countryAlpha2(properties: maplibregl.GeoJSONFeature["properties"]) {
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

function hoverStateValue(value: number, fallback = 0) {
  return ["case", ["boolean", ["feature-state", "hover"], false], value, fallback];
}

function applyHoverMode(map: Map, hoverMode: HoverMode, pulse = 0) {
  if (
    !map.getLayer(HOVER_GLOW_LAYER) ||
    !map.getLayer(HOVER_FILL_LAYER) ||
    !map.getLayer(HOVER_LINE_LAYER)
  ) {
    return;
  }

  const modes = {
    border: {
      fillColor: "#ffffff",
      fillOpacity: 0,
      glowColor: "#ffffff",
      glowWidth: 0,
      glowOpacity: 0,
      glowBlur: 0,
      lineColor: "#ffffff",
      lineWidth: 3,
      lineOpacity: 1,
      lineBlur: 0,
    },
    glow: {
      fillColor: "#ffffff",
      fillOpacity: 0,
      glowColor: "#ffffff",
      glowWidth: 9,
      glowOpacity: 0.48,
      glowBlur: 2.4,
      lineColor: "#ffffff",
      lineWidth: 2.8,
      lineOpacity: 1,
      lineBlur: 0,
    },
    "country-highlight": {
      fillColor: "#ffffff",
      fillOpacity: 0.2,
      glowColor: "#ffffff",
      glowWidth: 0,
      glowOpacity: 0,
      glowBlur: 0,
      lineColor: "#ffffff",
      lineWidth: 2.6,
      lineOpacity: 1,
      lineBlur: 0,
    },
    bloom: {
      fillColor: "#ffffff",
      fillOpacity: 0.08,
      glowColor: "#ffffff",
      glowWidth: 18,
      glowOpacity: 0.38,
      glowBlur: 6,
      lineColor: "#ffffff",
      lineWidth: 2.4,
      lineOpacity: 0.95,
      lineBlur: 0.2,
    },
    blur: {
      fillColor: "#ffffff",
      fillOpacity: 0.12,
      glowColor: "#ffffff",
      glowWidth: 10,
      glowOpacity: 0.22,
      glowBlur: 8,
      lineColor: "#ffffff",
      lineWidth: 7,
      lineOpacity: 0.72,
      lineBlur: 4,
    },
    animated: {
      fillColor: "#ffffff",
      fillOpacity: 0.06 + pulse * 0.1,
      glowColor: "#ffffff",
      glowWidth: 9 + pulse * 11,
      glowOpacity: 0.25 + (1 - pulse) * 0.32,
      glowBlur: 2 + pulse * 5,
      lineColor: "#ffffff",
      lineWidth: 2.4 + pulse * 1.6,
      lineOpacity: 0.85 + pulse * 0.15,
      lineBlur: pulse * 0.8,
    },
  } satisfies Record<HoverMode, Record<string, string | number>>;

  const config = modes[hoverMode];

  map.setPaintProperty(HOVER_FILL_LAYER, "fill-color", config.fillColor);
  map.setPaintProperty(HOVER_FILL_LAYER, "fill-opacity", hoverStateValue(config.fillOpacity as number));

  map.setPaintProperty(HOVER_GLOW_LAYER, "line-color", config.glowColor);
  map.setPaintProperty(HOVER_GLOW_LAYER, "line-width", hoverStateValue(config.glowWidth as number));
  map.setPaintProperty(HOVER_GLOW_LAYER, "line-opacity", hoverStateValue(config.glowOpacity as number));
  map.setPaintProperty(HOVER_GLOW_LAYER, "line-blur", config.glowBlur);

  map.setPaintProperty(HOVER_LINE_LAYER, "line-color", config.lineColor);
  map.setPaintProperty(HOVER_LINE_LAYER, "line-width", hoverStateValue(config.lineWidth as number));
  map.setPaintProperty(HOVER_LINE_LAYER, "line-opacity", hoverStateValue(config.lineOpacity as number));
  map.setPaintProperty(HOVER_LINE_LAYER, "line-blur", config.lineBlur);
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
  map.fitBounds(country.bounds as LngLatBoundsLike, {
    padding: cinematicPadding(map, phase),
    maxZoom: phase === "intro" ? country.introMaxZoom : country.detailMaxZoom,
    pitch: phase === "intro" ? (country.id === "lebanon" ? 48 : 22) : 0,
    bearing: phase === "intro" && country.id === "lebanon" ? -8 : 0,
    duration,
    essential: true,
  });
}

function zoomOutForCountryTransition(map: Map) {
  map.easeTo({
    center: INITIAL_CENTER,
    zoom: 1.22,
    pitch: 0,
    bearing: 0,
    duration: 1700,
    essential: true,
  });
}

function setMapInteractionsEnabled(map: Map, enabled: boolean) {
  const handlers = [
    map.scrollZoom,
    map.boxZoom,
    map.dragRotate,
    map.dragPan,
    map.keyboard,
    map.doubleClickZoom,
    map.touchZoomRotate,
  ];

  handlers.forEach((handler) => {
    if (enabled) {
      handler.enable();
    } else {
      handler.disable();
    }
  });
}

export function MapLibreSandbox() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const hoveredCountryIdRef = useRef<string | number | null>(null);
  const selectedCountryFeatureIdRef = useRef<string | number | null>(null);
  const lessonActiveRef = useRef(false);
  const hoverModeRef = useRef<HoverMode>("border");
  const frameTimeRef = useRef<number | null>(null);
  const fpsSamplesRef = useRef<number[]>([]);
  const sourceEventsRef = useRef(0);
  const cinematicTimersRef = useRef<number[]>([]);

  const [mode, setMode] = useState<MapMode>(DEFAULT_MAP_MODE);
  const [hoverMode, setHoverMode] = useState<HoverMode>("border");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<HoveredCountry | null>(null);
  const [cinematicCountry, setCinematicCountry] = useState<CinematicCountry | null>(null);
  const [cinematicPhase, setCinematicPhase] = useState<CinematicPhase>("intro");
  const [stats, setStats] = useState<MapStats>(INITIAL_STATS);
  const [r3fPreset, setR3fPreset] = useState<R3FPresetMode>("off");
  const [r3fCamera, setR3fCamera] = useState<R3FCameraMode>("ortho");
  const [r3fIntensity, setR3fIntensity] = useState(0.65);

  const syncCamera = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const center = map.getCenter();
    setStats((current) => ({
      ...current,
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
      tilesLoaded: map.areTilesLoaded(),
    }));
  }, []);

  const updateVisibleFeatureCount = useCallback(() => {
    const map = mapRef.current;
    if (!map?.getLayer(INTERACTION_LAYER)) {
      return;
    }

    const featureCodes = new Set(
      map
        .queryRenderedFeatures(undefined, { layers: [INTERACTION_LAYER] })
        .map((feature) => countryCode(feature.properties)),
    );

    setStats((current) => ({
      ...current,
      visibleCountries: featureCodes.size,
      tilesLoaded: map.areTilesLoaded(),
    }));
  }, []);

  const setFeatureHover = useCallback((id: string | number | null, hover: boolean) => {
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

  const clearCinematicTimers = useCallback(() => {
    cinematicTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    cinematicTimersRef.current = [];
  }, []);

  const beginCountryIntro = useCallback(
    (country: CinematicCountry, featureId: string | number = country.alpha3) => {
      const map = mapRef.current;

      clearCinematicTimers();
      setSettingsOpen(false);
      setCinematicCountry(country);
      setCinematicPhase("intro");

      if (selectedCountryFeatureIdRef.current !== featureId) {
        setFeatureHover(selectedCountryFeatureIdRef.current, false);
      }

      selectedCountryFeatureIdRef.current = featureId;
      setFeatureHover(featureId, true);

      if (map) {
        setMapInteractionsEnabled(map, false);
        map.getCanvas().style.cursor = "";
        map.stop();
        fitCinematicCountry(map, country, "intro", 3300);
      }
    },
    [clearCinematicTimers, setFeatureHover],
  );

  const handleCloseLesson = useCallback(() => {
    const map = mapRef.current;

    clearCinematicTimers();
    setCinematicCountry(null);
    setCinematicPhase("intro");
    setFeatureHover(selectedCountryFeatureIdRef.current, false);
    selectedCountryFeatureIdRef.current = null;

    if (hoveredCountryIdRef.current != null) {
      setFeatureHover(hoveredCountryIdRef.current, false);
      hoveredCountryIdRef.current = null;
    }

    setHoveredCountry(null);

    if (map) {
      map.stop();
      map.getCanvas().style.cursor = "";
      setMapInteractionsEnabled(map, true);
    }
  }, [clearCinematicTimers, setFeatureHover]);

  const handleNextCountry = useCallback(() => {
    const map = mapRef.current;

    if (!cinematicCountry) {
      return;
    }

    const nextCountry = nextCinematicCountry(cinematicCountry);
    clearCinematicTimers();
    setCinematicPhase("transition");
    setFeatureHover(selectedCountryFeatureIdRef.current, false);
    selectedCountryFeatureIdRef.current = null;

    if (map) {
      map.stop();
      zoomOutForCountryTransition(map);
    }

    const timer = window.setTimeout(() => {
      beginCountryIntro(nextCountry);
    }, 1750);
    cinematicTimersRef.current = [timer];
  }, [beginCountryIntro, cinematicCountry, clearCinematicTimers, setFeatureHover]);

  const handleStoryAdvance = useCallback(() => {
    if (!cinematicCountry || cinematicPhase === "transition") {
      return;
    }

    if (cinematicPhase === "intro") {
      setCinematicPhase("fact");
      return;
    }

    if (cinematicPhase === "fact") {
      setCinematicPhase("flag");
      return;
    }

    handleNextCountry();
  }, [cinematicCountry, cinematicPhase, handleNextCountry]);

  const handleStoryBack = useCallback(() => {
    if (!cinematicCountry || cinematicPhase === "intro" || cinematicPhase === "transition") {
      return;
    }

    setCinematicPhase(cinematicPhase === "flag" ? "fact" : "intro");
  }, [cinematicCountry, cinematicPhase]);

  useEffect(() => {
    lessonActiveRef.current = cinematicCountry !== null;

    if (cinematicCountry) {
      document.body.setAttribute("data-maplibre-lesson-active", "true");
    } else {
      document.body.removeAttribute("data-maplibre-lesson-active");
    }

    const map = mapRef.current;
    if (map) {
      setMapInteractionsEnabled(map, cinematicCountry === null);
    }

    return () => {
      document.body.removeAttribute("data-maplibre-lesson-active");
    };
  }, [cinematicCountry]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!lessonActiveRef.current) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        handleStoryAdvance();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleStoryBack();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleCloseLesson();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCloseLesson, handleStoryAdvance, handleStoryBack]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: EXPERIMENT_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: MODE_LOOKUP[DEFAULT_MAP_MODE].pitch,
      bearing: MODE_LOOKUP[DEFAULT_MAP_MODE].bearing,
      attributionControl: false,
      maxPitch: 85,
      maxZoom: 18,
      renderWorldCopies: true,
      fadeDuration: 180,
    });

    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
      }),
      "top-right",
    );
    map.addControl(
      new maplibregl.TerrainControl({
        source: TERRAIN_SOURCE,
        exaggeration: TERRAIN_EXAGGERATION,
      }),
      "top-right",
    );
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const handleCountryMove = (event: MapLayerMouseEvent) => {
      if (lessonActiveRef.current) {
        return;
      }

      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      const nextId = feature.id ?? countryCode(feature.properties);
      const nextAlpha2 = countryAlpha2(feature.properties);

      if (hoveredCountryIdRef.current !== nextId) {
        if (hoveredCountryIdRef.current !== selectedCountryFeatureIdRef.current) {
          setFeatureHover(hoveredCountryIdRef.current, false);
        }
        hoveredCountryIdRef.current = nextId;
        setFeatureHover(nextId, true);

        setHoveredCountry({
          id: nextId,
          name: countryName(feature.properties),
          code: countryCode(feature.properties),
          alpha2: nextAlpha2,
        });
      }

      map.getCanvas().style.cursor = "pointer";
    };

    const handleCountryLeave = () => {
      if (hoveredCountryIdRef.current !== selectedCountryFeatureIdRef.current) {
        setFeatureHover(hoveredCountryIdRef.current, false);
      }
      hoveredCountryIdRef.current = null;
      map.getCanvas().style.cursor = "";
      setHoveredCountry(null);
    };

    const handleCountryClick = (event: MapLayerMouseEvent) => {
      if (lessonActiveRef.current) {
        return;
      }

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

    const handleMapClick = (event: maplibregl.MapMouseEvent) => {
      if (lessonActiveRef.current) {
        return;
      }

      const country = cinematicCountryAtLngLat(event.lngLat.lng, event.lngLat.lat);
      if (!country) {
        return;
      }

      beginCountryIntro(country);
    };

    const handleSourceData = (event: MapSourceDataEvent) => {
      if (
        event.sourceId !== COUNTRY_SOURCE &&
        event.sourceId !== SATELLITE_SOURCE &&
        event.sourceId !== TERRAIN_SOURCE &&
        event.sourceId !== HILLSHADE_SOURCE
      ) {
        return;
      }

      sourceEventsRef.current += 1;
      setStats((current) => ({
        ...current,
        sourceEvents: sourceEventsRef.current,
        tilesLoaded: map.areTilesLoaded(),
      }));
    };

    const handleLoad = () => {
      setStyleReady(true);
      syncCamera();
      updateVisibleFeatureCount();
    };

    const handleMove = () => {
      syncCamera();
    };

    const handleRender = () => {
      const now = performance.now();
      const previous = frameTimeRef.current;
      frameTimeRef.current = now;

      if (!previous) {
        return;
      }

      const nextFps = 1000 / Math.max(now - previous, 1);
      const samples = fpsSamplesRef.current;
      samples.push(nextFps);
      if (samples.length > 24) {
        samples.shift();
      }

      const averageFps = samples.reduce((total, sample) => total + sample, 0) / samples.length;
      setStats((current) => ({
        ...current,
        fps: averageFps,
        tilesLoaded: map.areTilesLoaded(),
      }));

      if (hoverModeRef.current === "animated" && hoveredCountryIdRef.current != null) {
        const pulse = (Math.sin(now / 190) + 1) / 2;
        applyHoverMode(map, "animated", pulse);
        map.triggerRepaint();
      }
    };

    map.on("move", handleMove);
    map.on("load", handleLoad);
    map.on("moveend", updateVisibleFeatureCount);
    map.on("idle", updateVisibleFeatureCount);
    map.on("sourcedata", handleSourceData);
    map.on("render", handleRender);
    map.on("click", handleMapClick);
    map.on("mousemove", INTERACTION_LAYER, handleCountryMove);
    map.on("mouseleave", INTERACTION_LAYER, handleCountryLeave);
    map.on("click", INTERACTION_LAYER, handleCountryClick);

    mapRef.current = map;

    return () => {
      setStyleReady(false);
      clearCinematicTimers();
      map.remove();
      mapRef.current = null;
    };
  }, [
    beginCountryIntro,
    clearCinematicTimers,
    setFeatureHover,
    syncCamera,
    updateVisibleFeatureCount,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    const modeConfig = MODE_LOOKUP[mode];

    map.setLayoutProperty(
      "satellite-raster",
      "visibility",
      modeConfig.satelliteVisible ? "visible" : "none",
    );
    map.setLayoutProperty(
      "terrain-hillshade",
      "visibility",
      modeConfig.hillshadeVisible ? "visible" : "none",
    );
    map.setPaintProperty("terrain-ocean", "background-opacity", modeConfig.oceanOpacity);
    map.setPaintProperty("country-fill", "fill-opacity", modeConfig.countryFillOpacity);
    map.setPaintProperty("country-outline", "line-color", modeConfig.outlineColor);
    map.setProjection({ type: modeConfig.projection });
    map.setTerrain(
      modeConfig.terrainEnabled
        ? { source: TERRAIN_SOURCE, exaggeration: TERRAIN_EXAGGERATION }
        : null,
    );

    map.easeTo({
      zoom: modeConfig.zoom,
      pitch: modeConfig.pitch,
      bearing: modeConfig.bearing,
      duration: 650,
      essential: true,
    });
  }, [mode, styleReady]);

  const activeMode = useMemo(() => MODE_LOOKUP[mode], [mode]);
  const activeHoverMode = useMemo(
    () => HOVER_MODE_OPTIONS.find((option) => option.value === hoverMode) ?? HOVER_MODE_OPTIONS[0],
    [hoverMode],
  );

  useEffect(() => {
    hoverModeRef.current = hoverMode;

    const map = mapRef.current;
    if (!map || !styleReady || !map.isStyleLoaded()) {
      return;
    }

    applyHoverMode(map, hoverMode);
    if (hoverMode === "animated" && hoveredCountryIdRef.current != null) {
      map.triggerRepaint();
    }
  }, [hoverMode, styleReady]);

  const resetView = () => {
    clearCinematicTimers();
    setCinematicCountry(null);
    setFeatureHover(selectedCountryFeatureIdRef.current, false);
    selectedCountryFeatureIdRef.current = null;
    mapRef.current?.flyTo({
      center: INITIAL_CENTER,
      zoom: activeMode.zoom,
      pitch: activeMode.pitch,
      bearing: activeMode.bearing,
      duration: 1200,
      essential: true,
    });
  };

  const flyToHimalayas = () => {
    clearCinematicTimers();
    setCinematicCountry(null);
    setFeatureHover(selectedCountryFeatureIdRef.current, false);
    selectedCountryFeatureIdRef.current = null;
    mapRef.current?.flyTo({
      ...HIMALAYA_VIEW,
      duration: 1600,
      essential: true,
    });
  };

  return (
    <main
      className={`relative h-full w-full overflow-hidden bg-[#0c1116] text-white ${
        cinematicCountry ? styles.cinematicActive : ""
      }`}
    >
      <div ref={mapContainerRef} className="h-full w-full" />

      {r3fPreset !== "off" ? (
        <Suspense fallback={null}>
          <LazyR3FOverlay
            particles={R3F_PRESET_LOOKUP[r3fPreset].particles}
            atmosphere={R3F_PRESET_LOOKUP[r3fPreset].atmosphere}
            fog={R3F_PRESET_LOOKUP[r3fPreset].fog}
            glow={R3F_PRESET_LOOKUP[r3fPreset].glow}
            cinematicDepth={R3F_PRESET_LOOKUP[r3fPreset].cinematicDepth}
            intensity={r3fIntensity}
            camera={r3fCamera}
            mapCamera={{
              pitch: stats.pitch,
              bearing: stats.bearing,
              zoom: stats.zoom,
              center: stats.center,
            }}
          />
        </Suspense>
      ) : null}

      <CountryCinematicOverlay
        country={cinematicCountry}
        phase={cinematicPhase}
        engineLabel="MapLibre"
        variant="story"
        onAdvance={handleStoryAdvance}
        onBack={handleStoryBack}
        onClose={handleCloseLesson}
      />

      {!settingsOpen && !cinematicCountry ? (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="absolute left-[5.35rem] top-4 z-20 h-9 rounded-md border border-white/15 bg-[#111820]/88 px-3 text-sm font-semibold shadow-2xl backdrop-blur transition hover:border-[#f4d35e]/55 hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#f4d35e]/45 max-[460px]:left-20 max-[460px]:top-3"
          aria-controls="maplibre-sandbox-settings"
          aria-expanded={settingsOpen}
        >
          Settings
        </button>
      ) : null}

      {settingsOpen && !cinematicCountry ? (
      <section
        id="maplibre-sandbox-settings"
        className="absolute left-4 top-16 z-10 max-h-[calc(100%-17rem)] w-[min(25rem,calc(100vw-2rem))] overflow-auto rounded-md border border-white/15 bg-[#111820]/88 p-4 shadow-2xl backdrop-blur max-[460px]:left-3 max-[460px]:top-14 max-[460px]:w-[calc(100vw-1.5rem)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold">MapLibre Tile Lab</h1>
            <p className="mt-1 text-sm leading-6 text-slate-300">{activeMode.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={resetView}
              className="h-9 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-medium transition hover:bg-white/18"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="h-9 rounded-md border border-white/15 bg-white/10 px-3 text-sm font-medium transition hover:bg-white/18"
              aria-label="Close MapLibre settings"
            >
              Close
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={flyToHimalayas}
          className="mt-4 h-9 w-full rounded-md border border-white/15 bg-white/10 px-3 text-sm font-medium transition hover:bg-white/18"
        >
          Jump to Himalayas
        </button>

        <div className="mt-3">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400" htmlFor="map-mode">
            Map mode
          </label>
          <select
            id="map-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as MapMode)}
            className="mt-2 h-10 w-full rounded-md border border-white/15 bg-black/35 px-3 text-sm font-medium text-white outline-none transition hover:bg-black/45 focus:border-[#f4d35e]"
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#111820] text-white">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <label
            className="text-xs font-medium uppercase tracking-wide text-slate-400"
            htmlFor="hover-mode"
          >
            Hover mode
          </label>
          <select
            id="hover-mode"
            value={hoverMode}
            onChange={(event) => setHoverMode(event.target.value as HoverMode)}
            className="mt-2 h-10 w-full rounded-md border border-white/15 bg-black/35 px-3 text-sm font-medium text-white outline-none transition hover:bg-black/45 focus:border-[#f4d35e]"
          >
            {HOVER_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#111820] text-white">
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-400">{activeHoverMode.description}</p>
        </div>

        <dl className="mt-3 grid grid-cols-5 gap-2 text-xs">
          {[
            ["Sat", activeMode.satelliteVisible],
            ["3D", activeMode.terrainEnabled],
            ["Globe", activeMode.projection === "globe"],
            ["Shade", activeMode.hillshadeVisible],
            ["Fill", activeMode.countryFillVisible],
          ].map(([label, enabled]) => (
            <div
              key={label as string}
              className={`rounded border px-2 py-1 ${
                enabled
                  ? "border-[#f4d35e]/55 bg-[#f4d35e]/15 text-[#f8df6b]"
                  : "border-white/10 bg-black/20 text-slate-500"
              }`}
            >
              <dt>{label}</dt>
              <dd className="font-mono">{enabled ? "on" : "off"}</dd>
            </div>
          ))}
        </dl>

        <details className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-200">
            Explain modes
          </summary>
          <ol className="mt-3 max-h-52 space-y-2 overflow-auto pr-2 text-xs leading-5 text-slate-300">
            {MODE_OPTIONS.map((option, index) => (
              <li key={option.value}>
                <span className="font-mono text-[#f8df6b]">
                  {String(index + 1).padStart(2, "0")} {option.value}
                </span>{" "}
                <span className="font-medium text-white">{option.label}:</span>{" "}
                {option.description}
              </li>
            ))}
          </ol>
        </details>

        <details className="mt-3 rounded-md border border-white/10 bg-black/20 p-3" open>
          <summary className="cursor-pointer text-sm font-medium text-slate-200">
            3D Effects Lab
          </summary>

          <div className="mt-3">
            <label
              className="text-xs font-medium uppercase tracking-wide text-slate-400"
              htmlFor="r3f-preset"
            >
              R3F preset
            </label>
            <select
              id="r3f-preset"
              value={r3fPreset}
              onChange={(event) => setR3fPreset(event.target.value as R3FPresetMode)}
              className="mt-2 h-10 w-full rounded-md border border-white/15 bg-black/35 px-3 text-sm font-medium text-white outline-none transition hover:bg-black/45 focus:border-[#f4d35e]"
            >
              {R3F_PRESET_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-[#111820] text-white"
                >
                  {option.value === "off" ? "off" : option.value} — {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {R3F_PRESET_LOOKUP[r3fPreset].description}
            </p>
          </div>

          <div className="mt-3">
            <label
              className="text-xs font-medium uppercase tracking-wide text-slate-400"
              htmlFor="r3f-camera"
            >
              Camera
            </label>
            <select
              id="r3f-camera"
              value={r3fCamera}
              onChange={(event) => setR3fCamera(event.target.value as R3FCameraMode)}
              className="mt-2 h-10 w-full rounded-md border border-white/15 bg-black/35 px-3 text-sm font-medium text-white outline-none transition hover:bg-black/45 focus:border-[#f4d35e]"
            >
              {R3F_CAMERA_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-[#111820] text-white"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {R3F_CAMERA_OPTIONS.find((o) => o.value === r3fCamera)?.description}
            </p>
          </div>

          <div className="mt-3">
            <label
              className="text-xs font-medium uppercase tracking-wide text-slate-400"
              htmlFor="r3f-intensity"
            >
              Intensity — {Math.round(r3fIntensity * 100)}%
            </label>
            <input
              id="r3f-intensity"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={r3fIntensity}
              onChange={(event) => setR3fIntensity(Number(event.target.value))}
              className="mt-2 w-full accent-[#f4d35e]"
            />
          </div>

          <dl className="mt-3 grid grid-cols-5 gap-2 text-xs">
            {([
              ["P", R3F_PRESET_LOOKUP[r3fPreset].particles],
              ["A", R3F_PRESET_LOOKUP[r3fPreset].atmosphere],
              ["F", R3F_PRESET_LOOKUP[r3fPreset].fog],
              ["G", R3F_PRESET_LOOKUP[r3fPreset].glow],
              ["D", R3F_PRESET_LOOKUP[r3fPreset].cinematicDepth],
            ] as [string, boolean][]).map(([label, enabled]) => (
              <div
                key={label}
                className={`rounded border px-2 py-1 ${
                  enabled
                    ? "border-[#f4d35e]/55 bg-[#f4d35e]/15 text-[#f8df6b]"
                    : "border-white/10 bg-black/20 text-slate-500"
                }`}
              >
                <dt>{label}</dt>
                <dd className="font-mono">{enabled ? "on" : "off"}</dd>
              </div>
            ))}
          </dl>
        </details>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-slate-400">Lng</dt>
            <dd className="font-mono">{stats.center[0].toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Lat</dt>
            <dd className="font-mono">{stats.center[1].toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Zoom</dt>
            <dd className="font-mono">{stats.zoom.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Pitch</dt>
            <dd className="font-mono">{stats.pitch.toFixed(0)} deg</dd>
          </div>
          <div>
            <dt className="text-slate-400">FPS</dt>
            <dd className="font-mono">{Math.round(stats.fps)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Tiles</dt>
            <dd className="font-mono">{stats.tilesLoaded ? "idle" : "loading"}</dd>
          </div>
        </dl>
      </section>
      ) : null}

      {!cinematicCountry ? (
      <section className="absolute bottom-4 left-4 z-10 w-[min(24rem,calc(100vw-2rem))] rounded-md border border-white/15 bg-[#111820]/88 p-4 text-sm shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-400">Hovered feature</p>
            <p className="mt-1 truncate text-base font-semibold">
              {hoveredCountry ? hoveredCountry.name : "Move over a country"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="rounded bg-black/25 px-2 py-1 font-mono text-xs text-[#f4d35e]">
              {hoveredCountry?.alpha2 ?? hoveredCountry?.code ?? "ADM0_A3"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-400">Visible countries</p>
            <p className="font-mono text-lg">{stats.visibleCountries}</p>
          </div>
          <div>
            <p className="text-slate-400">Source events</p>
            <p className="font-mono text-lg">{stats.sourceEvents}</p>
          </div>
        </div>
      </section>
      ) : null}
    </main>
  );
}
