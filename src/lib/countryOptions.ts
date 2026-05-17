export type CountryOption = {
  iso2: string;
  iso3: string;
  numeric: string;
  name: string;
  wikidataId: string;
};

export const COUNTRY_OPTIONS = [
  { iso2: "AE", iso3: "ARE", numeric: "784", name: "United Arab Emirates", wikidataId: "Q878" },
  { iso2: "AU", iso3: "AUS", numeric: "036", name: "Australia", wikidataId: "Q408" },
  { iso2: "BR", iso3: "BRA", numeric: "076", name: "Brazil", wikidataId: "Q155" },
  { iso2: "CA", iso3: "CAN", numeric: "124", name: "Canada", wikidataId: "Q16" },
  { iso2: "CN", iso3: "CHN", numeric: "156", name: "China", wikidataId: "Q148" },
  { iso2: "DE", iso3: "DEU", numeric: "276", name: "Germany", wikidataId: "Q183" },
  { iso2: "FR", iso3: "FRA", numeric: "250", name: "France", wikidataId: "Q142" },
  { iso2: "GB", iso3: "GBR", numeric: "826", name: "United Kingdom", wikidataId: "Q145" },
  { iso2: "IN", iso3: "IND", numeric: "356", name: "India", wikidataId: "Q668" },
  { iso2: "JP", iso3: "JPN", numeric: "392", name: "Japan", wikidataId: "Q17" },
  { iso2: "NO", iso3: "NOR", numeric: "578", name: "Norway", wikidataId: "Q20" },
  { iso2: "US", iso3: "USA", numeric: "840", name: "United States", wikidataId: "Q30" },
] satisfies CountryOption[];

export function getCountryOption(iso2: string | null) {
  const normalized = iso2?.trim().toUpperCase();
  return COUNTRY_OPTIONS.find((country) => country.iso2 === normalized) ?? COUNTRY_OPTIONS[0];
}
