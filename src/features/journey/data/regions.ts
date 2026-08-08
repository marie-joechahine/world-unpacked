export type JourneyMode =
  | "select-region"
  | "country-intro"
  | "country-capital"
  | "country-flag"
  | "country-transition";

export type SelectedRegion =
  | "North America"
  | "Central America"
  | "Caribbean"
  | "South America"
  | "Europe"
  | "North Africa"
  | "West Africa"
  | "Sub-Saharan Africa"
  | "Central Asia"
  | "South Asia"
  | "East Asia"
  | "Southeast Asia"
  | "Oceania"
  | "Pacific";

export type JourneyMapTarget = {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
};

export type JourneyRegion = {
  id: string;
  name: SelectedRegion;
  color: `#${string}`;
  description: string;
  approximateCountryCount: string;
  /** Sovereign-nation count shown in the region preview card. */
  displayCountryCount: number;
  /** Short region-type label, e.g. "Island region", "Mainland region". */
  regionType: string;
  labelCoordinates: [number, number];
  mobileLabelCoordinates?: [number, number];
  countryCodes: readonly string[];
  mapTarget: JourneyMapTarget;
};

export const JOURNEY_REGIONS = [
  {
    id: "north-america",
    name: "North America",
    color: "#4FD7C4",
    description: "The northern sweep of the continent, from the Arctic to Mexico.",
    approximateCountryCount: "20+",
    displayCountryCount: 23,
    regionType: "Mainland region",
    labelCoordinates: [-105, 51],
    mobileLabelCoordinates: [-55, 49],
    countryCodes: ["CAN", "USA", "MEX", "GRL", "SPM", "BMU"],
    mapTarget: { center: [-104, 47], zoom: 2.15, pitch: 18, bearing: 0 },
  },
  {
    id: "central-america",
    name: "Central America",
    color: "#94D36E",
    description: "The narrow land bridge connecting North and South America.",
    approximateCountryCount: "7",
    displayCountryCount: 7,
    regionType: "Mainland region",
    labelCoordinates: [-87.5, 14.8],
    mobileLabelCoordinates: [-63, 13],
    countryCodes: ["BLZ", "CRI", "GTM", "HND", "NIC", "PAN", "SLV"],
    mapTarget: { center: [-86.8, 13.8], zoom: 4.15, pitch: 28, bearing: -4 },
  },
  {
    id: "caribbean",
    name: "Caribbean",
    color: "#22E0C6",
    description: "Beautiful islands, rich cultures and unique histories. Perfect place to start!",
    approximateCountryCount: "13",
    displayCountryCount: 13,
    regionType: "Island region",
    labelCoordinates: [-72, 19],
    mobileLabelCoordinates: [-72, 19],
    countryCodes: [
      "AIA",
      "ABW",
      "ATG",
      "BHS",
      "BRB",
      "BLM",
      "CUB",
      "CUW",
      "CYM",
      "DMA",
      "DOM",
      "GRD",
      "GLP",
      "HTI",
      "JAM",
      "KNA",
      "LCA",
      "MAF",
      "MSR",
      "MTQ",
      "PRI",
      "SXM",
      "TCA",
      "TTO",
      "VCT",
      "VGB",
      "VIR",
    ],
    mapTarget: { center: [-72.5, 18.4], zoom: 3.05, pitch: 26, bearing: -8 },
  },
  {
    id: "south-america",
    name: "South America",
    color: "#33C8B8",
    description: "A continent of rainforests, mountains, plains, and long coasts.",
    approximateCountryCount: "14",
    displayCountryCount: 12,
    regionType: "Mainland region",
    labelCoordinates: [-62, -16],
    mobileLabelCoordinates: [-46, -20],
    countryCodes: [
      "ARG",
      "BOL",
      "BRA",
      "CHL",
      "COL",
      "ECU",
      "FLK",
      "GUF",
      "GUY",
      "PER",
      "PRY",
      "SUR",
      "URY",
      "VEN",
    ],
    mapTarget: { center: [-60, -18], zoom: 2.05, pitch: 18, bearing: 0 },
  },
  {
    id: "europe",
    name: "Europe",
    color: "#6EA3D8",
    description: "A compact region stretching from the Atlantic to the Urals.",
    approximateCountryCount: "50+",
    displayCountryCount: 50,
    regionType: "Mainland region",
    labelCoordinates: [14, 51],
    countryCodes: [
      "ALA",
      "ALB",
      "AND",
      "AUT",
      "BEL",
      "BGR",
      "BIH",
      "BLR",
      "CHE",
      "CYP",
      "CZE",
      "DEU",
      "DNK",
      "ESP",
      "EST",
      "FIN",
      "FRA",
      "FRO",
      "GBR",
      "GGY",
      "GIB",
      "GRC",
      "HRV",
      "HUN",
      "IMN",
      "IRL",
      "ISL",
      "ITA",
      "JEY",
      "KOS",
      "XKX",
      "LIE",
      "LTU",
      "LUX",
      "LVA",
      "MCO",
      "MDA",
      "MKD",
      "MLT",
      "MNE",
      "NLD",
      "NOR",
      "POL",
      "PRT",
      "ROU",
      "RUS",
      "SMR",
      "SRB",
      "SVK",
      "SVN",
      "SWE",
      "TUR",
      "UKR",
      "VAT",
    ],
    mapTarget: { center: [12, 50], zoom: 2.7, pitch: 24, bearing: 0 },
  },
  {
    id: "north-africa",
    name: "North Africa",
    color: "#D8AD65",
    description: "The Sahara-facing countries along northern Africa.",
    approximateCountryCount: "7",
    displayCountryCount: 7,
    regionType: "Desert region",
    labelCoordinates: [12, 27],
    countryCodes: ["DZA", "EGY", "ESH", "LBY", "MAR", "SDN", "TUN"],
    mapTarget: { center: [12, 26], zoom: 2.6, pitch: 20, bearing: 0 },
  },
  {
    id: "west-africa",
    name: "West Africa",
    color: "#82C86F",
    description: "Atlantic-facing countries around the Gulf of Guinea and Sahel.",
    approximateCountryCount: "16",
    displayCountryCount: 16,
    regionType: "Coastal region",
    labelCoordinates: [-4, 11],
    countryCodes: [
      "BEN",
      "BFA",
      "CPV",
      "CIV",
      "GHA",
      "GIN",
      "GMB",
      "GNB",
      "LBR",
      "MLI",
      "MRT",
      "NER",
      "NGA",
      "SEN",
      "SLE",
      "TGO",
    ],
    mapTarget: { center: [-5, 12], zoom: 3.0, pitch: 22, bearing: 0 },
  },
  {
    id: "sub-saharan-africa",
    name: "Sub-Saharan Africa",
    color: "#5EA76C",
    description: "Central, eastern, and southern Africa below the Sahara.",
    approximateCountryCount: "30+",
    displayCountryCount: 34,
    regionType: "Mainland region",
    labelCoordinates: [24, -7],
    countryCodes: [
      "AGO",
      "BDI",
      "BWA",
      "CAF",
      "COD",
      "COG",
      "COM",
      "DJI",
      "ERI",
      "ETH",
      "GAB",
      "GNQ",
      "KEN",
      "LSO",
      "MDG",
      "MOZ",
      "MUS",
      "MWI",
      "MYT",
      "NAM",
      "REU",
      "RWA",
      "SYC",
      "SHN",
      "SOM",
      "SSD",
      "STP",
      "SWZ",
      "TCD",
      "TZA",
      "UGA",
      "ZAF",
      "ZMB",
      "ZWE",
    ],
    mapTarget: { center: [24, -8], zoom: 2.45, pitch: 20, bearing: 0 },
  },
  {
    id: "central-asia",
    name: "Central Asia",
    color: "#7EAFC6",
    description: "The inland crossroads between Europe, the Middle East, and East Asia.",
    approximateCountryCount: "5",
    displayCountryCount: 5,
    regionType: "Inland region",
    labelCoordinates: [68, 43],
    mobileLabelCoordinates: [38, 43],
    countryCodes: ["KAZ", "KGZ", "TJK", "TKM", "UZB"],
    mapTarget: { center: [68, 43], zoom: 3.0, pitch: 24, bearing: 0 },
  },
  {
    id: "south-asia",
    name: "South Asia",
    color: "#62C69A",
    description: "The Indian subcontinent and nearby Himalayan and island countries.",
    approximateCountryCount: "9",
    displayCountryCount: 8,
    regionType: "Subcontinent",
    labelCoordinates: [78, 22],
    mobileLabelCoordinates: [55, 23],
    countryCodes: ["AFG", "BGD", "BTN", "IND", "IOT", "LKA", "MDV", "NPL", "PAK"],
    mapTarget: { center: [78, 22], zoom: 3.0, pitch: 24, bearing: 0 },
  },
  {
    id: "east-asia",
    name: "East Asia",
    color: "#65B8F0",
    description: "The eastern edge of Asia and the western Pacific rim.",
    approximateCountryCount: "8",
    displayCountryCount: 8,
    regionType: "Pacific rim",
    labelCoordinates: [113, 36],
    mobileLabelCoordinates: [54, 35],
    countryCodes: ["CHN", "HKG", "JPN", "KOR", "MAC", "MNG", "PRK", "TWN"],
    mapTarget: { center: [113, 36], zoom: 2.75, pitch: 24, bearing: 0 },
  },
  {
    id: "southeast-asia",
    name: "Southeast Asia",
    color: "#12BFCF",
    description: "Mainland and island countries between the Indian and Pacific oceans.",
    approximateCountryCount: "13",
    displayCountryCount: 11,
    regionType: "Mixed region",
    labelCoordinates: [106, 8],
    mobileLabelCoordinates: [50, 5],
    countryCodes: [
      "BRN",
      "CCK",
      "CXR",
      "IDN",
      "KHM",
      "LAO",
      "MMR",
      "MYS",
      "PHL",
      "SGP",
      "THA",
      "TLS",
      "VNM",
    ],
    mapTarget: { center: [106, 6], zoom: 3.0, pitch: 22, bearing: 0 },
  },
  {
    id: "oceania",
    name: "Oceania",
    color: "#2C93D1",
    description: "Australia, New Zealand, and nearby island countries.",
    approximateCountryCount: "7+",
    displayCountryCount: 7,
    regionType: "Island region",
    labelCoordinates: [136, -25],
    mobileLabelCoordinates: [58, -33],
    countryCodes: ["AUS", "FJI", "NCL", "NZL", "PNG", "SLB", "VUT"],
    mapTarget: { center: [137, -24], zoom: 2.35, pitch: 20, bearing: 0 },
  },
  {
    id: "pacific",
    name: "Pacific",
    color: "#8FDCE2",
    description: "Island countries and territories spread across the Pacific Ocean.",
    approximateCountryCount: "18+",
    displayCountryCount: 14,
    regionType: "Island region",
    labelCoordinates: [-162, -9],
    mobileLabelCoordinates: [-48, -38],
    countryCodes: [
      "ASM",
      "COK",
      "FSM",
      "GUM",
      "KIR",
      "MHL",
      "MNP",
      "NIU",
      "NRU",
      "PCN",
      "PLW",
      "PYF",
      "TKL",
      "TON",
      "TUV",
      "UMI",
      "WLF",
      "WSM",
    ],
    mapTarget: { center: [-162, -9], zoom: 2.65, pitch: 18, bearing: 0 },
  },
] as const satisfies readonly JourneyRegion[];

export const SELECTABLE_REGION_NAMES = JOURNEY_REGIONS.map((region) => region.name);

export function journeyRegionByName(regionName: SelectedRegion | null) {
  if (!regionName) {
    return null;
  }

  return JOURNEY_REGIONS.find((region) => region.name === regionName) ?? null;
}

export function journeyRegionForCountryCode(countryCode: string) {
  return (
    JOURNEY_REGIONS.find((region) =>
      (region.countryCodes as readonly string[]).includes(countryCode),
    ) ?? null
  );
}

export function allJourneyRegionCountryCodes() {
  return [...new Set(JOURNEY_REGIONS.flatMap((region) => [...region.countryCodes]))];
}
