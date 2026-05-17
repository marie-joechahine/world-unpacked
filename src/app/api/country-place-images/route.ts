import {
  type CommonsPlaceImage,
  PLACE_IMAGE_COUNTRIES,
} from "@/lib/placeImageSandboxCountries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SparqlBindingValue = {
  value?: string;
};

type WikidataPlaceBinding = {
  place?: SparqlBindingValue;
  placeLabel?: SparqlBindingValue;
  image?: SparqlBindingValue;
  article?: SparqlBindingValue;
  sitelinks?: SparqlBindingValue;
};

type WikidataSparqlResponse = {
  results?: {
    bindings?: WikidataPlaceBinding[];
  };
};

type CommonsExtMetadataValue = {
  value?: string;
};

type CommonsImageInfo = {
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  width?: number;
  height?: number;
  mime?: string;
  extmetadata?: Record<string, CommonsExtMetadataValue | undefined>;
};

type CommonsApiResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        missing?: string;
        imageinfo?: CommonsImageInfo[];
      }
    >;
  };
};

type WikidataPlace = {
  placeName: string;
  wikidataUrl: string;
  articleUrl: string | null;
  sitelinks: number;
  imageUrl: string;
  commonsFileName: string;
};

const WIKIDATA_QUERY_ENDPOINT = "https://query.wikidata.org/sparql";
const COMMONS_API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "world-unpacked/0.1 country-place-images sandbox";

const FAMOUS_PLACE_CANDIDATES_BY_COUNTRY: Record<string, string[]> = {
  Q17: [
    "Q39231",
    "Q188754",
    "Q221716",
    "Q714828",
    "Q183536",
    "Q191763",
    "Q231140",
    "Q696641",
    "Q321242",
    "Q739612",
  ],
  Q142: [
    "Q243",
    "Q19675",
    "Q2946",
    "Q2044",
    "Q2981",
    "Q64436",
    "Q181896",
    "Q74461",
    "Q16394",
    "Q157163",
    "Q6582",
  ],
  Q38: [
    "Q10285",
    "Q39054",
    "Q43332",
    "Q18068",
    "Q185382",
    "Q52505",
    "Q271928",
    "Q641556",
    "Q51252",
    "Q207514",
    "Q180212",
  ],
  Q878: [
    "Q12495",
    "Q1512831",
    "Q2444287",
    "Q183334",
    "Q203357",
    "Q25381141",
    "Q304829",
    "Q6311737",
    "Q62079443",
    "Q4703740",
    "Q1021970",
  ],
  Q79: [
    "Q37200",
    "Q151669",
    "Q220654",
    "Q214519",
    "Q171336",
    "Q152432",
    "Q190804",
    "Q466949",
    "Q30976",
    "Q533047",
    "Q208460",
    "Q466531",
  ],
  Q155: [
    "Q79961",
    "Q170397",
    "Q36332",
    "Q186653",
    "Q750303",
    "Q623752",
    "Q82941",
    "Q184166",
    "Q199618",
    "Q167720",
    "Q1750575",
    "Q1456696",
  ],
  Q189: [
    "Q885958",
    "Q210729",
    "Q152402",
    "Q211862",
    "Q238236",
    "Q651841",
    "Q332371",
    "Q208257",
    "Q1301430",
    "Q490436",
    "Q3227940",
    "Q7311961",
  ],
  Q114: [
    "Q181475",
    "Q7296",
    "Q474073",
    "Q849965",
    "Q1093071",
    "Q546546",
    "Q898760",
    "Q1793865",
    "Q1535042",
    "Q5272864",
    "Q2444822",
    "Q5561372",
  ],
};

function abortSignal(timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs?: number, retries = 0): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const abort = abortSignal(timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: abort.signal,
        headers: {
          Accept: "application/json",
          "Api-User-Agent": USER_AGENT,
          "User-Agent": USER_AGENT,
          ...init?.headers,
        },
      });

      if (!response.ok) {
        lastError = new Error(`${response.status} ${response.statusText}`);

        if ([429, 502, 503, 504].includes(response.status) && attempt < retries) {
          await response.text().catch(() => "");
          await delay(900 * (attempt + 1));
          continue;
        }

        throw lastError;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await delay(900 * (attempt + 1));
        continue;
      }

      throw error;
    } finally {
      abort.done();
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

function buildWikidataQuery(countryQid: string) {
  const candidateValues = (FAMOUS_PLACE_CANDIDATES_BY_COUNTRY[countryQid] ?? [])
    .map((qid) => `wd:${qid}`)
    .join(" ");

  return `
SELECT ?place ?placeLabel ?image ?article ?sitelinks WHERE {
  VALUES ?place { ${candidateValues} }

  ?place wdt:P17 wd:${countryQid};
         wdt:P18 ?image.

  OPTIONAL {
    ?article schema:about ?place;
             schema:isPartOf <https://en.wikipedia.org/>.
  }

  ?place wikibase:sitelinks ?sitelinks.

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
ORDER BY DESC(?sitelinks)
LIMIT 24
`.trim();
}

function commonsFileNameFromImageUrl(imageUrl: string) {
  const filePathMarker = "/Special:FilePath/";
  const markerIndex = imageUrl.indexOf(filePathMarker);
  const rawFileName =
    markerIndex >= 0 ? imageUrl.slice(markerIndex + filePathMarker.length) : imageUrl.split("/").at(-1);

  if (!rawFileName) {
    return null;
  }

  return decodeURIComponent(rawFileName.split("?")[0]).replaceAll("_", " ");
}

function plainTextFromCommonsHtml(value: string | undefined) {
  if (!value) {
    return null;
  }

  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string | undefined, maxLength = 160) {
  const text = plainTextFromCommonsHtml(value);

  if (!text) {
    return null;
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}

async function fetchWikidataPlaces(countryQid: string) {
  const query = buildWikidataQuery(countryQid);
  const data = await fetchJson<WikidataSparqlResponse>(
    WIKIDATA_QUERY_ENDPOINT,
    {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ query, format: "json" }),
    },
    15000,
    2,
  );

  return (data.results?.bindings ?? [])
    .map((binding) => {
      const imageUrl = binding.image?.value;
      const commonsFileName = imageUrl ? commonsFileNameFromImageUrl(imageUrl) : null;

      if (!binding.place?.value || !binding.placeLabel?.value || !imageUrl || !commonsFileName) {
        return null;
      }

      return {
        placeName: binding.placeLabel.value,
        wikidataUrl: binding.place.value,
        articleUrl: binding.article?.value ?? null,
        sitelinks: Number(binding.sitelinks?.value ?? 0),
        imageUrl,
        commonsFileName,
      } satisfies WikidataPlace;
    })
    .filter((place): place is WikidataPlace => place != null);
}

function looksLikeDiagramSvg(fileName: string, mime: string | null) {
  if (mime !== "image/svg+xml") {
    return false;
  }

  return /\b(map|logo|diagram|coat|flag|seal|emblem|icon|symbol|locator|route|plan|schema)\b/i.test(fileName);
}

function isUsableImage(fileName: string, imageInfo: CommonsImageInfo) {
  const mime = imageInfo.mime ?? null;

  if (!mime?.startsWith("image/")) {
    return false;
  }

  if (looksLikeDiagramSvg(fileName, mime)) {
    return false;
  }

  if (typeof imageInfo.width === "number" && imageInfo.width < 800) {
    return false;
  }

  return Boolean(imageInfo.thumburl);
}

async function fetchCommonsImage(place: WikidataPlace) {
  const url = new URL(COMMONS_API_ENDPOINT);

  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    titles: `File:${place.commonsFileName}`,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "900",
  }).toString();

  const data = await fetchJson<CommonsApiResponse>(url.toString(), undefined, 12000, 1);
  const page = Object.values(data.query?.pages ?? {})[0];
  const imageInfo = page?.imageinfo?.[0];

  if (!imageInfo || !isUsableImage(place.commonsFileName, imageInfo)) {
    return null;
  }

  const metadata = imageInfo.extmetadata ?? {};

  return {
    id: `${place.wikidataUrl}-${place.commonsFileName}`,
    placeName: place.placeName,
    wikidataUrl: place.wikidataUrl,
    articleUrl: place.articleUrl,
    sitelinks: place.sitelinks,
    commonsFileName: place.commonsFileName,
    thumbnailUrl: imageInfo.thumburl ?? "",
    originalUrl: imageInfo.url ?? null,
    filePageUrl: imageInfo.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(place.commonsFileName)}`,
    width: imageInfo.width ?? null,
    height: imageInfo.height ?? null,
    mime: imageInfo.mime ?? null,
    licenseName: compactText(metadata.LicenseShortName?.value ?? metadata.License?.value, 80),
    artist: compactText(metadata.Artist?.value),
    credit: compactText(metadata.Credit?.value),
    attribution: compactText(metadata.Attribution?.value),
  } satisfies CommonsPlaceImage;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedQid = searchParams.get("qid")?.trim().toUpperCase();
  const country = PLACE_IMAGE_COUNTRIES.find((option) => option.qid === requestedQid);

  if (!country) {
    return Response.json({ error: "Unsupported country" }, { status: 400 });
  }

  try {
    const places = await fetchWikidataPlaces(country.qid);
    const commonsResults = await Promise.allSettled(places.map((place) => fetchCommonsImage(place)));
    const images = commonsResults
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter((image): image is CommonsPlaceImage => image != null);

    return Response.json({
      country,
      generatedAt: new Date().toISOString(),
      rawResultCount: places.length,
      usableImageCount: images.length,
      images,
      sources: ["Wikidata Query Service", "Wikimedia Commons API"],
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Country place image request failed",
      },
      { status: 502 },
    );
  }
}
