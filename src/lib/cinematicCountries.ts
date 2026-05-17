export type CountryBounds = [number, number, number, number];

export type CinematicCountryId = "japan" | "lebanon" | "russia" | "united-states";

export type CinematicCountry = {
  id: CinematicCountryId;
  alpha2: string;
  alpha3: string;
  englishName: string;
  localName: string;
  localLanguage: string;
  localNameDirection?: "ltr" | "rtl";
  bounds: CountryBounds;
  center: [number, number];
  introMaxZoom: number;
  detailMaxZoom: number;
  accentColor: string;
  positionFact: {
    eyebrow: string;
    headline: string;
    detail: string;
  };
  flagFact: {
    headline: string;
    detail: string;
    callouts: Array<{
      color: string;
      label: string;
    }>;
  };
};

export const CINEMATIC_COUNTRIES: CinematicCountry[] = [
  {
    id: "japan",
    alpha2: "JP",
    alpha3: "JPN",
    englishName: "Japan",
    localName: "日本",
    localLanguage: "Japanese",
    bounds: [129.4, 30.9, 145.9, 45.6],
    center: [138.25, 36.2],
    introMaxZoom: 4.65,
    detailMaxZoom: 5.55,
    accentColor: "#00a896",
    positionFact: {
      eyebrow: "Position",
      headline: "Island country in East Asia",
      detail:
        "Japan sits between the Pacific Ocean and the Sea of Japan, forming an archipelago along the eastern edge of Asia.",
    },
    flagFact: {
      headline: "The flag is called Nisshoki, or Hinomaru",
      detail:
        "The white field is often associated with honesty and purity, while the red circle represents the sun.",
      callouts: [
        { color: "#f8fafc", label: "White: honesty" },
        { color: "#bc002d", label: "Red circle: sun" },
      ],
    },
  },
  {
    id: "lebanon",
    alpha2: "LB",
    alpha3: "LBN",
    englishName: "Lebanon",
    localName: "لبنان",
    localLanguage: "Arabic",
    localNameDirection: "rtl",
    bounds: [35.1, 33.04, 36.64, 34.7],
    center: [35.86, 33.91],
    introMaxZoom: 7.3,
    detailMaxZoom: 8.1,
    accentColor: "#f4c56a",
    positionFact: {
      eyebrow: "Position",
      headline: "Eastern Mediterranean coast",
      detail:
        "Lebanon is a narrow mountain country on the Levant coast, with the Mediterranean Sea to the west, Syria to the north and east, and Israel to the south.",
    },
    flagFact: {
      headline: "The cedar is Lebanon's living emblem",
      detail:
        "The green cedar anchors the flag as a symbol of Lebanon. The red bands are commonly tied to blood shed for liberation, while the white band evokes peace and the snow of the mountains.",
      callouts: [
        { color: "#cf1f25", label: "Red: liberation" },
        { color: "#f8fafc", label: "White: peace" },
        { color: "#16864b", label: "Cedar: Lebanon" },
      ],
    },
  },
  {
    id: "russia",
    alpha2: "RU",
    alpha3: "RUS",
    englishName: "Russia",
    localName: "Россия",
    localLanguage: "Russian",
    bounds: [19.64, 41.18, 190, 81.86],
    center: [96, 61],
    introMaxZoom: 2.15,
    detailMaxZoom: 2.65,
    accentColor: "#8bb8ff",
    positionFact: {
      eyebrow: "Position",
      headline: "A country across Europe and Asia",
      detail:
        "Russia stretches from eastern Europe across northern Asia to the Pacific, making it the largest country on Earth by land area.",
    },
    flagFact: {
      headline: "A historic white-blue-red tricolor",
      detail:
        "Russia's flag is a horizontal white, blue, and red tricolor with roots in the imperial era. The colors do not have one official modern meaning, but traditional readings link them with openness, faithfulness, and courage.",
      callouts: [
        { color: "#f8fafc", label: "White: openness" },
        { color: "#1f55a5", label: "Blue: faithfulness" },
        { color: "#d52b1e", label: "Red: courage" },
      ],
    },
  },
  {
    id: "united-states",
    alpha2: "US",
    alpha3: "USA",
    englishName: "United States",
    localName: "United States of America",
    localLanguage: "English",
    bounds: [-125, 24, -66.8, 49.5],
    center: [-98.58, 39.83],
    introMaxZoom: 3.35,
    detailMaxZoom: 4.05,
    accentColor: "#8fd3ff",
    positionFact: {
      eyebrow: "Position",
      headline: "A continent-spanning country",
      detail:
        "The 48 contiguous states stretch across North America between the Atlantic and Pacific; Alaska reaches the Arctic and Bering seas, while Hawaii sits in the central Pacific.",
    },
    flagFact: {
      headline: "Stars for states, stripes for beginnings",
      detail:
        "The flag has 50 stars for the states and 13 stripes for the original colonies. The familiar red, white, and blue palette is associated with valor, purity, vigilance, perseverance, and justice.",
      callouts: [
        { color: "#f8fafc", label: "50 stars: states" },
        { color: "#b22234", label: "13 stripes: colonies" },
        { color: "#3c3b6e", label: "Blue: vigilance" },
      ],
    },
  },
];

export const CINEMATIC_COUNTRIES_BY_ALPHA3 = Object.fromEntries(
  CINEMATIC_COUNTRIES.map((country) => [country.alpha3, country]),
) as Record<string, CinematicCountry | undefined>;

export function nextCinematicCountry(country: CinematicCountry) {
  const currentIndex = CINEMATIC_COUNTRIES.findIndex((item) => item.id === country.id);
  return CINEMATIC_COUNTRIES[(currentIndex + 1) % CINEMATIC_COUNTRIES.length];
}

function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

export function cinematicCountryAtLngLat(longitude: number, latitude: number) {
  const normalizedLongitude = normalizeLongitude(longitude);

  return (
    CINEMATIC_COUNTRIES.find((country) => {
      const [west, south, east, north] = country.bounds;
      const normalizedWest = normalizeLongitude(west);
      const normalizedEast = normalizeLongitude(east);
      const withinLatitude = latitude >= south && latitude <= north;
      const withinLongitude =
        normalizedWest <= normalizedEast
          ? normalizedLongitude >= normalizedWest && normalizedLongitude <= normalizedEast
          : normalizedLongitude >= normalizedWest || normalizedLongitude <= normalizedEast;

      return withinLatitude && withinLongitude;
    }) ?? null
  );
}
