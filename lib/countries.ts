import { ISO3_TO_ISO2 } from "@/data/iso3166";

export type CountryMetadata = {
  iso2: string;
  iso3: string;
  name: string;
  region?: string;
  flagUrl: string;
};

export type CountryProperties = Record<string, unknown>;

export const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

const PROPERTY_KEYS = {
  iso2: [
    "ISO_A2",
    "iso_a2",
    "ISO2",
    "A2",
    "WB_A2",
    "postal",
    "alpha_2",
    "Alpha-2",
    "ISO3166-1-Alpha-2"
  ],
  iso3: [
    "ISO_A3",
    "iso_a3",
    "ISO3",
    "ADM0_A3",
    "id",
    "shapeGroup",
    "shapeISO",
    "alpha_3",
    "Alpha-3",
    "ISO3166-1-Alpha-3"
  ],
  name: [
    "ADMIN",
    "admin",
    "NAME",
    "name",
    "NAME_LONG",
    "formal_en",
    "shapeName",
    "name_en",
    "NAME_EN"
  ],
  region: ["REGION_UN", "region_un", "CONTINENT", "continent", "SUBREGION", "subregion"]
} as const;

function readString(properties: CountryProperties, keys: readonly string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim() && value !== "-99") {
      return value.trim();
    }
  }

  return undefined;
}

function normalizeIso2(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return /^[a-z]{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeIso3(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
}

function iso2FromIso3(iso3?: string) {
  if (!iso3) return undefined;
  return ISO3_TO_ISO2[iso3 as keyof typeof ISO3_TO_ISO2];
}

export function getCountryMetadata(properties: CountryProperties): CountryMetadata | null {
  const iso3 = normalizeIso3(readString(properties, PROPERTY_KEYS.iso3));
  const iso2 = normalizeIso2(readString(properties, PROPERTY_KEYS.iso2)) ?? iso2FromIso3(iso3);
  const name = readString(properties, PROPERTY_KEYS.name);

  if (!iso2 || !iso3 || !name) {
    return null;
  }

  return {
    iso2,
    iso3,
    name,
    region: readString(properties, PROPERTY_KEYS.region),
    flagUrl: `https://flagcdn.com/${iso2}.svg`
  };
}
