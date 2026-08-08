import type {
  FilterSpecification,
  LayerSpecification,
  Map,
  StyleSpecification,
} from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import {
  JOURNEY_REGIONS,
  allJourneyRegionCountryCodes,
  type JourneyRegion,
} from "../data/regions";

export const COUNTRY_SOURCE = "journey-openmaptiles";
export const COUNTRY_LAYER = "countries";
export const COUNTRY_OUTLINE_SOURCE = "journey-country-outlines";
export const JOURNEY_TRANSITION_ROUTE_SOURCE = "journey-transition-route";
export const SATELLITE_SOURCE = "journey-satellite";
export const TERRAIN_SOURCE = "journey-terrain";
export const JOURNEY_BASE_COUNTRY_OUTLINE_LAYER = "journey-country-outline";
export const JOURNEY_REGION_FILL_LAYER = "journey-region-fill";
export const JOURNEY_REGION_LINE_LAYER = "journey-region-line";
export const JOURNEY_SELECTED_REGION_FILL_LAYER = "journey-selected-region-fill";
export const JOURNEY_SELECTED_REGION_GLOW_LAYER = "journey-selected-region-glow";
export const JOURNEY_SELECTED_REGION_LINE_LAYER = "journey-selected-region-line";
export const JOURNEY_TRANSITION_ROUTE_GLOW_LAYER = "journey-transition-route-glow";
export const JOURNEY_TRANSITION_ROUTE_LINE_LAYER = "journey-transition-route-line";
export const JOURNEY_COUNTRY_HIGHLIGHT_LINE_LAYER = "journey-country-highlight-line";
export const JOURNEY_HOVER_LINE_LAYER = "journey-hover-line";
export const JOURNEY_INTERACTION_LAYER = "journey-country-interaction";

const SATELLITE_ATTRIBUTION =
  "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const SELECTED_REGION_COLOR = "#22E0C6";
const SELECTED_REGION_SOFT_COLOR = "#8FE8DF";
const HIGHLIGHTED_COUNTRY_COLOR = "#CFFAF5";
const EMPTY_FILTER_ID = "__journey_empty__";

const REGION_LAYER_IDS = [
  JOURNEY_REGION_FILL_LAYER,
  JOURNEY_REGION_LINE_LAYER,
  JOURNEY_SELECTED_REGION_FILL_LAYER,
  JOURNEY_SELECTED_REGION_GLOW_LAYER,
  JOURNEY_SELECTED_REGION_LINE_LAYER,
] as const;

const COUNTRY_HIGHLIGHT_LAYER_IDS = [
  JOURNEY_COUNTRY_HIGHLIGHT_LINE_LAYER,
] as const;

type JourneyRouteCoordinates = [[number, number], [number, number]];
export type JourneyTransitionRoute = {
  coordinates: [number, number][];
  arrowPosition: [number, number];
  arrowTail: [number, number];
};

const EMPTY_ROUTE_FEATURE_COLLECTION: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [],
};

function regionColorExpression(fallback = "rgba(255, 255, 255, 0)") {
  const expression: unknown[] = ["match", ["get", "ADM0_A3"]];

  JOURNEY_REGIONS.forEach((region) => {
    expression.push([...region.countryCodes], region.color);
  });

  expression.push(fallback);
  return expression;
}

export function countryCodesFilter(countryCodes: readonly string[]) {
  if (countryCodes.length === 0) {
    return ["==", ["get", "ADM0_A3"], EMPTY_FILTER_ID] as unknown as FilterSpecification;
  }

  return [
    "in",
    ["get", "ADM0_A3"],
    ["literal", [...countryCodes]],
  ] as unknown as FilterSpecification;
}

function countryOutlineFilter(countryCodes: readonly string[] | null) {
  if (!countryCodes || countryCodes.length === 0) {
    return ["==", ["get", "alpha3"], EMPTY_FILTER_ID] as unknown as FilterSpecification;
  }

  return [
    "in",
    ["get", "alpha3"],
    ["literal", [...countryCodes]],
  ] as unknown as FilterSpecification;
}

function hoverValue(activeValue: number, fallbackValue = 0) {
  return ["case", ["boolean", ["feature-state", "hover"], false], activeValue, fallbackValue];
}

function transitionRouteFeatureCollection(
  route: JourneyTransitionRoute | null,
): FeatureCollection<LineString> {
  if (!route) {
    return EMPTY_ROUTE_FEATURE_COLLECTION;
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          kind: "route",
        },
        geometry: {
          type: "LineString",
          coordinates: route.coordinates,
        },
      },
    ],
  };
}

function curvedRouteCoordinates(
  coordinates: JourneyRouteCoordinates,
): [number, number][] {
  const [from, to] = coordinates;
  const deltaLng = to[0] - from[0];
  const deltaLat = to[1] - from[1];
  const distance = Math.hypot(deltaLng, deltaLat);
  const normalLength = Math.hypot(deltaLat, -deltaLng) || 1;
  const bend = Math.min(Math.max(distance * 0.24, 0.45), 3.4);
  const control: [number, number] = [
    (from[0] + to[0]) / 2 + (deltaLat / normalLength) * bend,
    (from[1] + to[1]) / 2 + (-deltaLng / normalLength) * bend,
  ];

  return Array.from({ length: 34 }, (_, index) => {
    const t = index / 33;
    const inverseT = 1 - t;

    return [
      inverseT * inverseT * from[0] + 2 * inverseT * t * control[0] + t * t * to[0],
      inverseT * inverseT * from[1] + 2 * inverseT * t * control[1] + t * t * to[1],
    ];
  });
}

export function buildJourneyTransitionRoute(
  coordinates: JourneyRouteCoordinates,
): JourneyTransitionRoute {
  const routeCoordinates = curvedRouteCoordinates(coordinates);
  const arrowIndex = Math.min(
    routeCoordinates.length - 2,
    Math.max(2, Math.round(routeCoordinates.length * 0.58)),
  );

  return {
    coordinates: routeCoordinates,
    arrowPosition: routeCoordinates[arrowIndex],
    arrowTail: routeCoordinates[arrowIndex - 1],
  };
}

export const JOURNEY_MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  projection: {
    type: "mercator",
  },
  sources: {
    [COUNTRY_SOURCE]: {
      type: "vector",
      url: "https://demotiles.maplibre.org/tiles/tiles.json",
      promoteId: {
        [COUNTRY_LAYER]: "ADM0_A3",
      },
    },
    [COUNTRY_OUTLINE_SOURCE]: {
      type: "geojson",
      data: "/data/journey/caribbean-country-outlines.geojson",
      attribution: 'Boundaries: <a href="https://www.geoboundaries.org/">geoBoundaries</a> gbOpen',
    },
    [JOURNEY_TRANSITION_ROUTE_SOURCE]: {
      type: "geojson",
      data: EMPTY_ROUTE_FEATURE_COLLECTION,
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
      tiles: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"],
      attribution: "<a href='https://mapterhorn.com/attribution'>© Mapterhorn</a>",
      bounds: [-180, -85.0511287, 180, 85.0511287],
      encoding: "terrarium",
      tileSize: 512,
      maxzoom: 12,
    },
  },
  terrain: {
    source: TERRAIN_SOURCE,
    exaggeration: 3.2,
  },
  sky: {},
  layers: [
    {
      id: "journey-background",
      type: "background",
      paint: {
        "background-color": "#02070b",
      },
    },
    {
      id: "journey-satellite-raster",
      type: "raster",
      source: SATELLITE_SOURCE,
      paint: {
        "raster-fade-duration": 220,
        "raster-saturation": 0.03,
        "raster-contrast": 0.18,
        "raster-brightness-min": 0.07,
        "raster-brightness-max": 1,
      },
    },
    {
      id: "journey-country-shadow",
      type: "fill",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "fill-color": "#05202a",
        "fill-opacity": 0.045,
      },
    },
    {
      id: JOURNEY_BASE_COUNTRY_OUTLINE_LAYER,
      type: "line",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "line-color": "rgba(255, 255, 255, 0.22)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.2, 4, 0.55, 8, 0.95],
        "line-opacity": 0.48,
      },
    },
    {
      id: JOURNEY_REGION_FILL_LAYER,
      type: "fill",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      filter: countryCodesFilter(allJourneyRegionCountryCodes()),
      paint: {
        "fill-color": regionColorExpression(),
        "fill-opacity": 0.085,
      },
    },
    {
      id: JOURNEY_REGION_LINE_LAYER,
      type: "line",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      filter: countryCodesFilter(allJourneyRegionCountryCodes()),
      paint: {
        "line-color": regionColorExpression("#8FDCE2"),
        "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.9, 4, 1.7, 8, 2.5],
        "line-opacity": 0.5,
      },
    },
    {
      id: JOURNEY_SELECTED_REGION_FILL_LAYER,
      type: "fill",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      filter: countryCodesFilter([]),
      paint: {
        "fill-color": SELECTED_REGION_COLOR,
        "fill-opacity": 0,
      },
    },
    {
      id: JOURNEY_SELECTED_REGION_GLOW_LAYER,
      type: "line",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      filter: countryCodesFilter([]),
      paint: {
        "line-color": SELECTED_REGION_SOFT_COLOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 0, 2.4, 4, 4.8, 8, 7.2],
        "line-opacity": 0,
        "line-blur": 3.2,
      },
    },
    {
      id: JOURNEY_SELECTED_REGION_LINE_LAYER,
      type: "line",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      filter: countryCodesFilter([]),
      paint: {
        "line-color": SELECTED_REGION_SOFT_COLOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 0, 1.1, 4, 1.9, 8, 2.7],
        "line-opacity": 0,
      },
    },
    {
      id: JOURNEY_TRANSITION_ROUTE_GLOW_LAYER,
      type: "line",
      source: JOURNEY_TRANSITION_ROUTE_SOURCE,
      filter: ["==", ["geometry-type"], "LineString"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": SELECTED_REGION_COLOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 12, 7, 18, 10, 24],
        "line-opacity": 0.38,
        "line-blur": 5.5,
      },
    },
    {
      id: JOURNEY_TRANSITION_ROUTE_LINE_LAYER,
      type: "line",
      source: JOURNEY_TRANSITION_ROUTE_SOURCE,
      filter: ["==", ["geometry-type"], "LineString"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": SELECTED_REGION_COLOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 4.2, 7, 5.8, 10, 7.2],
        "line-opacity": 0.95,
        "line-dasharray": [0.12, 1.75],
      },
    },
    {
      id: JOURNEY_COUNTRY_HIGHLIGHT_LINE_LAYER,
      type: "line",
      source: COUNTRY_OUTLINE_SOURCE,
      filter: countryOutlineFilter(null),
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": HIGHLIGHTED_COUNTRY_COLOR,
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.65, 7, 0.95, 10, 1.2],
        "line-opacity": 0,
      },
    },
    {
      id: JOURNEY_HOVER_LINE_LAYER,
      type: "line",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "line-color": "#ffffff",
        "line-width": hoverValue(2.7),
        "line-opacity": hoverValue(1),
        "line-blur": 0,
      },
    },
    {
      id: JOURNEY_INTERACTION_LAYER,
      type: "fill",
      source: COUNTRY_SOURCE,
      "source-layer": COUNTRY_LAYER,
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": 0.01,
      },
    },
  ] as unknown as LayerSpecification[],
};

export function setJourneyRegionLayersVisible(map: Map, visible: boolean) {
  const visibility = visible ? "visible" : "none";

  REGION_LAYER_IDS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });

  if (map.getLayer(JOURNEY_BASE_COUNTRY_OUTLINE_LAYER)) {
    map.setPaintProperty(
      JOURNEY_BASE_COUNTRY_OUTLINE_LAYER,
      "line-opacity",
      visible ? 0.42 : 0.08,
    );
  }
}

export function setJourneyRegionSelection(map: Map, selectedRegion: JourneyRegion | null) {
  const selectedFilter = countryCodesFilter(selectedRegion?.countryCodes ?? []);

  [
    JOURNEY_SELECTED_REGION_FILL_LAYER,
    JOURNEY_SELECTED_REGION_GLOW_LAYER,
    JOURNEY_SELECTED_REGION_LINE_LAYER,
  ].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, selectedFilter);
    }
  });

  if (!map.getLayer(JOURNEY_REGION_FILL_LAYER)) {
    return;
  }

  map.setPaintProperty(JOURNEY_REGION_FILL_LAYER, "fill-opacity", selectedRegion ? 0.038 : 0.085);
  map.setPaintProperty(JOURNEY_REGION_LINE_LAYER, "line-opacity", selectedRegion ? 0.24 : 0.5);
  map.setPaintProperty(
    JOURNEY_SELECTED_REGION_FILL_LAYER,
    "fill-opacity",
    selectedRegion ? 0.14 : 0,
  );
  map.setPaintProperty(
    JOURNEY_SELECTED_REGION_GLOW_LAYER,
    "line-opacity",
    selectedRegion ? 0.14 : 0,
  );
  map.setPaintProperty(
    JOURNEY_SELECTED_REGION_LINE_LAYER,
    "line-opacity",
    selectedRegion ? 0.68 : 0,
  );
}

export function setJourneyCountryHighlight(
  map: Map,
  countryCodes: string | readonly string[] | null,
) {
  const normalizedCountryCodes =
    typeof countryCodes === "string" ? [countryCodes] : countryCodes;
  const filter = countryOutlineFilter(normalizedCountryCodes);

  COUNTRY_HIGHLIGHT_LAYER_IDS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, filter);
    }
  });

  const visible = Boolean(normalizedCountryCodes?.length);

  if (map.getLayer(JOURNEY_COUNTRY_HIGHLIGHT_LINE_LAYER)) {
    map.setPaintProperty(
      JOURNEY_COUNTRY_HIGHLIGHT_LINE_LAYER,
      "line-opacity",
      visible ? 0.82 : 0,
    );
  }
}

export function setJourneyTransitionRoute(
  map: Map,
  coordinates: JourneyRouteCoordinates | null,
) {
  const source = map.getSource(JOURNEY_TRANSITION_ROUTE_SOURCE);
  if (!source || !("setData" in source)) {
    return null;
  }

  const route = coordinates ? buildJourneyTransitionRoute(coordinates) : null;
  (source as { setData: (data: FeatureCollection<LineString>) => void }).setData(
    transitionRouteFeatureCollection(route),
  );

  return route;
}
