export type PlaceImageCountryOption = {
  name: string;
  qid: string;
};

export type CommonsPlaceImage = {
  id: string;
  placeName: string;
  wikidataUrl: string;
  articleUrl: string | null;
  sitelinks: number;
  commonsFileName: string;
  thumbnailUrl: string;
  originalUrl: string | null;
  filePageUrl: string;
  width: number | null;
  height: number | null;
  mime: string | null;
  licenseName: string | null;
  artist: string | null;
  credit: string | null;
  attribution: string | null;
};

export type PlaceImageSandboxResult = {
  country: PlaceImageCountryOption;
  generatedAt: string;
  rawResultCount: number;
  usableImageCount: number;
  images: CommonsPlaceImage[];
  sources: string[];
};

export const PLACE_IMAGE_COUNTRIES = [
  { name: "Japan", qid: "Q17" },
  { name: "France", qid: "Q142" },
  { name: "Italy", qid: "Q38" },
  { name: "United Arab Emirates", qid: "Q878" },
  { name: "Egypt", qid: "Q79" },
  { name: "Brazil", qid: "Q155" },
  { name: "Iceland", qid: "Q189" },
  { name: "Kenya", qid: "Q114" },
] satisfies PlaceImageCountryOption[];

export function getPlaceImageCountry(qid: string | null) {
  const normalized = qid?.trim().toUpperCase();
  return PLACE_IMAGE_COUNTRIES.find((country) => country.qid === normalized) ?? PLACE_IMAGE_COUNTRIES[0];
}
