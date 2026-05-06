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
  iso2: ["ISO_A2", "iso_a2", "ISO2", "A2", "WB_A2", "postal"],
  iso3: ["ISO_A3", "iso_a3", "ISO3", "ADM0_A3", "id"],
  name: ["ADMIN", "admin", "NAME", "name", "NAME_LONG", "formal_en"],
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

export function getCountryMetadata(properties: CountryProperties): CountryMetadata | null {
  const iso2 = readString(properties, PROPERTY_KEYS.iso2)?.toLowerCase();
  const iso3 = readString(properties, PROPERTY_KEYS.iso3)?.toUpperCase();
  const name = readString(properties, PROPERTY_KEYS.name);

  if (!iso2 || iso2.length !== 2 || !iso3 || !name) {
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
