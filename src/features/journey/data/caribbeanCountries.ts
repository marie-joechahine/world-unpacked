import type { JourneyMapTarget } from "./regions";

export type JourneyCountryBounds = [[number, number], [number, number]];
export type JourneyLngLat = [number, number];

export type CapitalIconType =
  | "crown"
  | "town"
  | "bridge"
  | "port"
  | "cross"
  | "sun"
  | "rose"
  | "water"
  | "earth"
  | "shield"
  | "castle"
  | "palm";

export type CapitalMnemonic = {
  intro: string;
  emphasis: string;
  detail: string;
  parts: readonly [string, string];
  icons: readonly [CapitalIconType, CapitalIconType];
};

export type JourneyTransitionIcon =
  | "banks"
  | "capital"
  | "fort"
  | "harbor"
  | "mountain"
  | "tower"
  | "volcano";

export type JourneyCountryTransitionCard = {
  icon: JourneyTransitionIcon;
  label: string;
  position: string;
  helper: string;
};

export type JourneyFlagColor = {
  name: string;
  swatch: `#${string}`;
  meaning: string;
};

export type JourneyFlagFact = {
  highlight: string;
  colors: readonly JourneyFlagColor[];
};

export type JourneyCountry = {
  id: string;
  alpha3: string;
  name: string;
  nativeName: string;
  introLine: string;
  flagPath: string;
  region: "Caribbean";
  capital: string;
  capitalCoords: JourneyLngLat;
  capitalMnemonic: CapitalMnemonic;
  regionLabel: string;
  islandTag?: string;
  boundaryBounds: JourneyCountryBounds;
  routeAnchor?: JourneyLngLat;
  mapTarget?: JourneyMapTarget;
  flagFact: JourneyFlagFact;
  transitionCard: JourneyCountryTransitionCard;
};

export type JourneyTransitionDetails = {
  subtitle: string;
  insight: string;
  fromHelper?: string;
  toHelper?: string;
};

export const CARIBBEAN_COUNTRIES = [
  {
    id: "antigua-and-barbuda",
    alpha3: "ATG",
    name: "Antigua and Barbuda",
    nativeName: "Antigua and Barbuda",
    introLine: "Twin-island state between the Atlantic and Caribbean Sea.",
    flagPath: "/flags/caribbean/antigua-and-barbuda.svg",
    region: "Caribbean",
    capital: "Saint John's",
    capitalCoords: [-61.845, 17.122],
    capitalMnemonic: {
      intro: "Saint John's breaks into two familiar words:",
      emphasis: "Saint + John's.",
      detail: "A patron saint's name marks this harbour island capital.",
      parts: ["SAINT", "JOHN'S"],
      icons: ["cross", "shield"],
    },
    regionLabel: "Leeward Islands",
    islandTag: "2 Islands",
    boundaryBounds: [[-62.34816, 16.93229], [-61.65717, 17.72886]],
    routeAnchor: [-61.79, 17.08],
    mapTarget: { center: [-61.79, 17.08], zoom: 7.8, pitch: 48, bearing: -18 },
    flagFact: {
      highlight: "The rising sun marks a new era above the sea and sand.",
      colors: [
        { name: "Black", swatch: "#050505", meaning: "People" },
        { name: "Red", swatch: "#d51b2b", meaning: "Energy" },
        { name: "Gold", swatch: "#ffd23c", meaning: "Sun" },
        { name: "Blue", swatch: "#0072bc", meaning: "Sea" },
        { name: "White", swatch: "#ffffff", meaning: "Sand" },
      ],
    },
    transitionCard: {
      icon: "harbor",
      label: "Harbor crossroads",
      position: "Leeward",
      helper: "(two islands)",
    },
  },
  {
    id: "the-bahamas",
    alpha3: "BHS",
    name: "The Bahamas",
    nativeName: "The Bahamas",
    introLine: "Atlantic archipelago known for shallow turquoise banks.",
    flagPath: "/flags/caribbean/the-bahamas.svg",
    region: "Caribbean",
    capital: "Nassau",
    capitalCoords: [-77.354, 25.048],
    capitalMnemonic: {
      intro: "Nassau comes from German:",
      emphasis: "Nass + Au.",
      detail: "'Nass' means wet, 'Au' means meadow — a tropical waterland.",
      parts: ["NASS", "AU"],
      icons: ["water", "palm"],
    },
    regionLabel: "Caribbean Archipelago",
    islandTag: "700+ Islands",
    boundaryBounds: [[-79.59435, 20.9124], [-72.74616, 26.92841]],
    routeAnchor: [-77.35, 25.04],
    mapTarget: { center: [-77.35, 25.04], zoom: 5.8, pitch: 42, bearing: 8 },
    flagFact: {
      highlight: "The triangle points toward a bright band of island resources.",
      colors: [
        { name: "Black", swatch: "#050505", meaning: "People" },
        { name: "Aqua", swatch: "#00abc9", meaning: "Sea" },
        { name: "Gold", swatch: "#ffc72c", meaning: "Resources" },
      ],
    },
    transitionCard: {
      icon: "banks",
      label: "Shallow banks",
      position: "North",
      helper: "(Atlantic edge)",
    },
  },
  {
    id: "barbados",
    alpha3: "BRB",
    name: "Barbados",
    nativeName: "Barbados",
    introLine: "Eastern Caribbean island shaped by coral limestone and trade winds.",
    flagPath: "/flags/caribbean/barbados.svg",
    region: "Caribbean",
    capital: "Bridgetown",
    capitalCoords: [-59.616, 13.099],
    capitalMnemonic: {
      intro: "Bridgetown is easy to split:",
      emphasis: "Bridge + Town.",
      detail: "A bridge over Constitution River gave the town its name.",
      parts: ["BRIDGE", "TOWN"],
      icons: ["bridge", "town"],
    },
    regionLabel: "Lesser Antilles",
    boundaryBounds: [[-59.65071, 13.04506], [-59.42034, 13.33465]],
    routeAnchor: [-59.55, 13.18],
    mapTarget: { center: [-59.55, 13.18], zoom: 8.6, pitch: 48, bearing: -10 },
    flagFact: {
      highlight: "The broken trident is the flag's bold independence symbol.",
      colors: [
        { name: "Blue", swatch: "#00267f", meaning: "Sea" },
        { name: "Gold", swatch: "#ffc726", meaning: "Sand" },
        { name: "Black", swatch: "#050505", meaning: "Independence" },
      ],
    },
    transitionCard: {
      icon: "capital",
      label: "Coral island",
      position: "East",
      helper: "(trade winds)",
    },
  },
  {
    id: "cuba",
    alpha3: "CUB",
    name: "Cuba",
    nativeName: "Cuba",
    introLine: "The Caribbean's largest island, stretching between the Gulf and Atlantic.",
    flagPath: "/flags/caribbean/cuba.svg",
    region: "Caribbean",
    capital: "Havana",
    capitalCoords: [-82.383, 23.133],
    capitalMnemonic: {
      intro: "Havana hides the word 'haven':",
      emphasis: "Have + na.",
      detail: "A great colonial harbour — once the gateway to the Spanish Americas.",
      parts: ["HAVE", "NA"],
      icons: ["port", "castle"],
    },
    regionLabel: "Greater Antilles",
    islandTag: "Largest Island",
    boundaryBounds: [[-84.95209, 19.82643], [-74.13167, 23.27619]],
    routeAnchor: [-79.5, 21.7],
    mapTarget: { center: [-79.5, 21.7], zoom: 5.25, pitch: 42, bearing: -12 },
    flagFact: {
      highlight: "The lone star sits in a red triangle beside five stripes.",
      colors: [
        { name: "Blue", swatch: "#002a8f", meaning: "Regions" },
        { name: "White", swatch: "#ffffff", meaning: "Purity" },
        { name: "Red", swatch: "#cf142b", meaning: "Blood" },
      ],
    },
    transitionCard: {
      icon: "capital",
      label: "Spanish influence",
      position: "Largest",
      helper: "(Greater Antilles)",
    },
  },
  {
    id: "dominica",
    alpha3: "DMA",
    name: "Dominica",
    nativeName: "Dominica",
    introLine: "Mountainous island known for rainforests, rivers, and volcanic terrain.",
    flagPath: "/flags/caribbean/dominica.svg",
    region: "Caribbean",
    capital: "Roseau",
    capitalCoords: [-61.388, 15.301],
    capitalMnemonic: {
      intro: "Roseau is French for reed:",
      emphasis: "Rose + Eau.",
      detail: "'Eau' means water — a rose-reed growing beside the river.",
      parts: ["ROSE", "EAU"],
      icons: ["rose", "water"],
    },
    regionLabel: "Windward Islands",
    boundaryBounds: [[-61.47989, 15.20773], [-61.24048, 15.63943]],
    routeAnchor: [-61.36, 15.42],
    mapTarget: { center: [-61.36, 15.42], zoom: 8.5, pitch: 48, bearing: -14 },
    flagFact: {
      highlight: "A sisserou parrot sits at the center of a forest-green field.",
      colors: [
        { name: "Green", swatch: "#009739", meaning: "Forest" },
        { name: "Yellow", swatch: "#ffd100", meaning: "Sun" },
        { name: "Black", swatch: "#050505", meaning: "Soil" },
        { name: "White", swatch: "#ffffff", meaning: "Rivers" },
        { name: "Red", swatch: "#d50032", meaning: "Justice" },
      ],
    },
    transitionCard: {
      icon: "mountain",
      label: "Nature island",
      position: "Windward",
      helper: "(rainforest stop)",
    },
  },
  {
    id: "dominican-republic",
    alpha3: "DOM",
    name: "Dominican Republic",
    nativeName: "República Dominicana",
    introLine: "Eastern Hispaniola nation with mountains, coasts, and busy cities.",
    flagPath: "/flags/caribbean/dominican-republic.svg",
    region: "Caribbean",
    capital: "Santo Domingo",
    capitalCoords: [-69.902, 18.474],
    capitalMnemonic: {
      intro: "Santo Domingo means:",
      emphasis: "Holy + Sunday.",
      detail: "'Santo' is holy, 'Domingo' is Sunday — the oldest European city in the Americas.",
      parts: ["SANTO", "DOMINGO"],
      icons: ["cross", "sun"],
    },
    regionLabel: "Greater Antilles",
    boundaryBounds: [[-72.00388, 17.47014], [-68.32264, 19.93236]],
    routeAnchor: [-70.18, 18.86],
    mapTarget: { center: [-70.18, 18.86], zoom: 6.55, pitch: 45, bearing: -10 },
    flagFact: {
      highlight: "A white cross divides the flag into red and blue quarters.",
      colors: [
        { name: "Blue", swatch: "#002d62", meaning: "Liberty" },
        { name: "Red", swatch: "#ce1126", meaning: "Blood" },
        { name: "White", swatch: "#ffffff", meaning: "Salvation" },
      ],
    },
    transitionCard: {
      icon: "capital",
      label: "Spanish influence",
      position: "East",
      helper: "(Hispaniola)",
    },
  },
  {
    id: "grenada",
    alpha3: "GRD",
    name: "Grenada",
    nativeName: "Grenada",
    introLine: "Southern Caribbean island known for spice estates and sheltered bays.",
    flagPath: "/flags/caribbean/grenada.svg",
    region: "Caribbean",
    capital: "St. George's",
    capitalCoords: [-61.743, 12.053],
    capitalMnemonic: {
      intro: "St. George's honors the patron saint:",
      emphasis: "Saint + George's.",
      detail: "Named after the dragon-slaying saint — a fitting name for a spirited island.",
      parts: ["ST.", "GEORGE'S"],
      icons: ["cross", "shield"],
    },
    regionLabel: "Windward Islands",
    boundaryBounds: [[-61.80242, 11.98725], [-61.37807, 12.52997]],
    routeAnchor: [-61.68, 12.12],
    mapTarget: { center: [-61.68, 12.12], zoom: 8.5, pitch: 48, bearing: -16 },
    flagFact: {
      highlight: "The nutmeg emblem nods to Grenada's spice-island story.",
      colors: [
        { name: "Red", swatch: "#ce1126", meaning: "Courage" },
        { name: "Gold", swatch: "#fcd116", meaning: "Sun" },
        { name: "Green", swatch: "#007a3d", meaning: "Land" },
      ],
    },
    transitionCard: {
      icon: "harbor",
      label: "Spice island",
      position: "South",
      helper: "(sheltered bays)",
    },
  },
  {
    id: "jamaica",
    alpha3: "JAM",
    name: "Jamaica",
    nativeName: "Jamaica",
    introLine: "Mountainous island with reef-lined coasts and a global cultural pulse.",
    flagPath: "/flags/caribbean/jamaica.svg",
    region: "Caribbean",
    capital: "Kingston",
    capitalCoords: [-76.793, 17.997],
    capitalMnemonic: {
      intro: "Kingston is easy to remember:",
      emphasis: "King + town.",
      detail: "A 'king's town' helps you remember Kingston.",
      parts: ["KING", "TOWN"],
      icons: ["crown", "town"],
    },
    regionLabel: "Greater Antilles",
    boundaryBounds: [[-78.36832, 17.70124], [-76.18458, 18.52503]],
    routeAnchor: [-77.31, 18.12],
    mapTarget: { center: [-77.31, 18.12], zoom: 7.0, pitch: 45, bearing: -8 },
    flagFact: {
      highlight: "The gold diagonal cross makes the flag easy to recognize.",
      colors: [
        { name: "Black", swatch: "#050505", meaning: "Strength" },
        { name: "Gold", swatch: "#fed100", meaning: "Sun" },
        { name: "Green", swatch: "#009b3a", meaning: "Land" },
      ],
    },
    transitionCard: {
      icon: "fort",
      label: "British influence",
      position: "West",
      helper: "(starts the leg)",
    },
  },
  {
    id: "haiti",
    alpha3: "HTI",
    name: "Haiti",
    nativeName: "Ayiti",
    introLine: "Western Hispaniola country with mountain ranges and a long revolutionary history.",
    flagPath: "/flags/caribbean/haiti.svg",
    region: "Caribbean",
    capital: "Port-au-Prince",
    capitalCoords: [-72.338, 18.544],
    capitalMnemonic: {
      intro: "Port-au-Prince translates as:",
      emphasis: "Port + Prince.",
      detail: "A royal harbour — named after an 18th-century French ship called 'Le Prince'.",
      parts: ["PORT", "PRINCE"],
      icons: ["port", "crown"],
    },
    regionLabel: "Greater Antilles",
    boundaryBounds: [[-74.48093, 18.02176], [-71.62213, 20.08963]],
    routeAnchor: [-72.33, 19.0],
    mapTarget: { center: [-72.33, 19.0], zoom: 6.6, pitch: 45, bearing: -8 },
    flagFact: {
      highlight: "The blue and red bands frame Haiti's central coat of arms.",
      colors: [
        { name: "Blue", swatch: "#00209f", meaning: "Unity" },
        { name: "Red", swatch: "#d21034", meaning: "Freedom" },
        { name: "White", swatch: "#ffffff", meaning: "Peace" },
      ],
    },
    transitionCard: {
      icon: "tower",
      label: "French influence",
      position: "East",
      helper: "(next stop)",
    },
  },
  {
    id: "saint-kitts-and-nevis",
    alpha3: "KNA",
    name: "Saint Kitts and Nevis",
    nativeName: "Saint Kitts and Nevis",
    introLine: "Two volcanic islands rising from the northeastern Caribbean.",
    flagPath: "/flags/caribbean/saint-kitts-and-nevis.svg",
    region: "Caribbean",
    capital: "Basseterre",
    capitalCoords: [-62.724, 17.295],
    capitalMnemonic: {
      intro: "Basseterre is French:",
      emphasis: "Basse + Terre.",
      detail: "'Low land' in French — a flat coastal capital tucked by the sea.",
      parts: ["BASSE", "TERRE"],
      icons: ["water", "earth"],
    },
    regionLabel: "Leeward Islands",
    islandTag: "2 Volcanic Peaks",
    boundaryBounds: [[-62.86434, 17.09423], [-62.5396, 17.41716]],
    routeAnchor: [-62.74, 17.34],
    mapTarget: { center: [-62.74, 17.34], zoom: 8.8, pitch: 48, bearing: -16 },
    flagFact: {
      highlight: "Two stars stand for the two islands in the federation.",
      colors: [
        { name: "Green", swatch: "#009e49", meaning: "Land" },
        { name: "Red", swatch: "#c8102e", meaning: "Struggle" },
        { name: "Black", swatch: "#050505", meaning: "Heritage" },
        { name: "Gold", swatch: "#ffcd00", meaning: "Sun" },
        { name: "White", swatch: "#ffffff", meaning: "Hope" },
      ],
    },
    transitionCard: {
      icon: "volcano",
      label: "Volcanic pair",
      position: "North",
      helper: "(two peaks)",
    },
  },
  {
    id: "saint-lucia",
    alpha3: "LCA",
    name: "Saint Lucia",
    nativeName: "Saint Lucia",
    introLine: "Windward island famous for the Pitons and lush volcanic slopes.",
    flagPath: "/flags/caribbean/saint-lucia.svg",
    region: "Caribbean",
    capital: "Castries",
    capitalCoords: [-61.007, 14.010],
    capitalMnemonic: {
      intro: "Castries sounds like:",
      emphasis: "Cast + trees.",
      detail: "A sheltered harbour beneath lush mountains — named after a French admiral.",
      parts: ["CAST", "TREES"],
      icons: ["port", "palm"],
    },
    regionLabel: "Windward Islands",
    boundaryBounds: [[-61.08057, 13.70769], [-60.87351, 14.10954]],
    routeAnchor: [-60.98, 13.91],
    mapTarget: { center: [-60.98, 13.91], zoom: 8.5, pitch: 48, bearing: -14 },
    flagFact: {
      highlight: "The central triangles echo the Pitons rising from the sea.",
      colors: [
        { name: "Blue", swatch: "#66c7eb", meaning: "Sea" },
        { name: "Gold", swatch: "#fcd116", meaning: "Sun" },
        { name: "Black", swatch: "#050505", meaning: "Heritage" },
        { name: "White", swatch: "#ffffff", meaning: "Harmony" },
      ],
    },
    transitionCard: {
      icon: "mountain",
      label: "Pitons landmark",
      position: "Windward",
      helper: "(volcanic slopes)",
    },
  },
  {
    id: "saint-vincent-and-the-grenadines",
    alpha3: "VCT",
    name: "Saint Vincent and the Grenadines",
    nativeName: "Saint Vincent and the Grenadines",
    introLine: "Island chain of volcanic peaks, reefs, and cays.",
    flagPath: "/flags/caribbean/saint-vincent-and-the-grenadines.svg",
    region: "Caribbean",
    capital: "Kingstown",
    capitalCoords: [-61.227, 13.159],
    capitalMnemonic: {
      intro: "Kingstown, like Kingston:",
      emphasis: "King + Town.",
      detail: "Another king's town — spot the extra 'W' to tell it apart from Jamaica's Kingston.",
      parts: ["KING", "TOWN"],
      icons: ["crown", "town"],
    },
    regionLabel: "Windward Islands",
    islandTag: "32 Islands",
    boundaryBounds: [[-61.46092, 12.57879], [-61.11483, 13.38326]],
    routeAnchor: [-61.2, 13.25],
    mapTarget: { center: [-61.2, 13.25], zoom: 8.3, pitch: 48, bearing: -16 },
    flagFact: {
      highlight: "Three green diamonds give the flag its gems nickname.",
      colors: [
        { name: "Blue", swatch: "#0072c6", meaning: "Sky" },
        { name: "Gold", swatch: "#fcd116", meaning: "Sand" },
        { name: "Green", swatch: "#009739", meaning: "Land" },
      ],
    },
    transitionCard: {
      icon: "harbor",
      label: "Island chain",
      position: "Grenadines",
      helper: "(cays and reefs)",
    },
  },
  {
    id: "trinidad-and-tobago",
    alpha3: "TTO",
    name: "Trinidad and Tobago",
    nativeName: "Trinidad and Tobago",
    introLine: "Twin-island country linking Caribbean coastlines with South America.",
    flagPath: "/flags/caribbean/trinidad-and-tobago.svg",
    region: "Caribbean",
    capital: "Port of Spain",
    capitalCoords: [-61.499, 10.652],
    capitalMnemonic: {
      intro: "Port of Spain tells its story:",
      emphasis: "Port + Spain.",
      detail: "A Spanish colonial port — the southern gateway linking Caribbean and South American coasts.",
      parts: ["PORT", "SPAIN"],
      icons: ["port", "castle"],
    },
    regionLabel: "Southern Caribbean",
    islandTag: "2 Islands",
    boundaryBounds: [[-61.93065, 10.04242], [-60.51763, 11.34673]],
    routeAnchor: [-61.25, 10.56],
    mapTarget: { center: [-61.25, 10.56], zoom: 7.3, pitch: 45, bearing: -12 },
    flagFact: {
      highlight: "A black diagonal band cuts across a vivid red field.",
      colors: [
        { name: "Red", swatch: "#da1a35", meaning: "Fire" },
        { name: "Black", swatch: "#050505", meaning: "Strength" },
        { name: "White", swatch: "#ffffff", meaning: "Sea" },
      ],
    },
    transitionCard: {
      icon: "harbor",
      label: "Twin islands",
      position: "South",
      helper: "(mainland link)",
    },
  },
] as const satisfies readonly JourneyCountry[];

const TRANSITION_DETAILS = [
  {
    fromId: "antigua-and-barbuda",
    toId: "the-bahamas",
    subtitle: "Island nations - Farther northwest",
    insight:
      "Both are island nations, but The Bahamas sits much farther northwest, just off Florida, and is spread across 700+ islands and cays.",
    fromHelper: "(Leeward Islands)",
    toHelper: "(Atlantic edge)",
  },
  {
    fromId: "jamaica",
    toId: "haiti",
    subtitle: "Same sea · Different histories",
    insight:
      "Jamaica and Haiti share the Caribbean Sea, but their colonial histories were different.",
    fromHelper: "(starts the journey)",
    toHelper: "(next stop)",
  },
] as const satisfies readonly (JourneyTransitionDetails & {
  fromId: string;
  toId: string;
})[];

export function journeyCountryRouteAnchor(country: JourneyCountry): JourneyLngLat {
  if (country.routeAnchor) {
    return country.routeAnchor;
  }

  const [[west, south], [east, north]] = country.boundaryBounds;
  return [(west + east) / 2, (south + north) / 2];
}

export function journeyTransitionDetails(
  fromCountry: JourneyCountry,
  toCountry: JourneyCountry,
): JourneyTransitionDetails {
  const details = TRANSITION_DETAILS.find(
    (transition) =>
      transition.fromId === fromCountry.id && transition.toId === toCountry.id,
  );

  if (details) {
    return details;
  }

  return {
    subtitle: "Same region · New island story",
    insight: `${fromCountry.name} gives way to ${toCountry.name} across the Caribbean route.`,
  };
}
