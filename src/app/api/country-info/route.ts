import { COUNTRY_OPTIONS, getCountryOption } from "@/lib/countryOptions";
import https from "node:https";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WorldBankIndicatorRow = {
  indicator?: { id?: string; value?: string };
  date?: string;
  value?: number | null;
};

type IndicatorValue = {
  id: string;
  label: string;
  value: number | null;
  year: string | null;
  unit: string;
  source: "World Bank";
};

type TimePoint = {
  year: string;
  value: number;
};

const WORLD_BANK_INDICATORS = [
  { id: "SP.POP.TOTL", label: "Population", unit: "people" },
  { id: "NY.GDP.MKTP.CD", label: "GDP", unit: "current US$" },
  { id: "NY.GDP.PCAP.CD", label: "GDP per capita", unit: "current US$" },
  { id: "SP.DYN.LE00.IN", label: "Life expectancy", unit: "years" },
  { id: "SP.URB.TOTL.IN.ZS", label: "Urban population", unit: "% of total" },
  { id: "EN.ATM.CO2E.PC", label: "CO2 emissions", unit: "metric tons per capita" },
] as const;

function abortSignal(timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const abort = abortSignal(timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: abort.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "world-unpacked/0.1 country-info sandbox",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } finally {
    abort.done();
  }
}

function latestNonNull(rows: WorldBankIndicatorRow[] | undefined) {
  return rows?.find((row) => typeof row.value === "number") ?? null;
}

async function fetchWorldBankCountry(iso2: string) {
  const data = await fetchJson<[
    unknown,
    Array<{
      id: string;
      iso2Code: string;
      name: string;
      region?: { value?: string };
      incomeLevel?: { value?: string };
      capitalCity?: string;
      longitude?: string;
      latitude?: string;
    }>,
  ]>(`https://api.worldbank.org/v2/country/${iso2}?format=json`);

  return data[1]?.[0] ?? null;
}

async function fetchWorldBankIndicator(iso2: string, indicator: (typeof WORLD_BANK_INDICATORS)[number]) {
  const data = await fetchJson<[unknown, WorldBankIndicatorRow[]]>(
    `https://api.worldbank.org/v2/country/${iso2}/indicator/${indicator.id}?format=json&per_page=70`,
  );
  const latest = latestNonNull(data[1]);

  return {
    id: indicator.id,
    label: indicator.label,
    value: latest?.value ?? null,
    year: latest?.date ?? null,
    unit: indicator.unit,
    source: "World Bank",
  } satisfies IndicatorValue;
}

type WikidataClaimValue = {
  id?: string;
  amount?: string;
  latitude?: number;
  longitude?: number;
};

type WikidataEntity = {
  labels?: { en?: { value?: string } };
  descriptions?: { en?: { value?: string } };
  sitelinks?: { enwiki?: { title?: string; url?: string } };
  claims?: Record<
    string,
    Array<{
      rank?: string;
      mainsnak?: {
        datavalue?: {
          value?: WikidataClaimValue;
        };
      };
    }>
  >;
};

async function fetchWikidataLabels(ids: string[]) {
  if (ids.length === 0) return {};

  const data = await fetchJson<{ entities?: Record<string, WikidataEntity> }>(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join(
      "|",
    )}&props=labels&languages=en&format=json&origin=*`,
  );

  return Object.fromEntries(
    Object.entries(data.entities ?? {}).map(([id, entity]) => [id, entity.labels?.en?.value ?? id]),
  ) as Record<string, string>;
}

function claimValue(entity: WikidataEntity, property: string) {
  const claims = entity.claims?.[property] ?? [];
  const claim = claims.find((candidate) => candidate.rank === "preferred") ?? claims.find((candidate) => candidate.rank === "normal") ?? claims[0];

  return claim?.mainsnak?.datavalue?.value ?? null;
}

function claimEntityId(entity: WikidataEntity, property: string) {
  return claimValue(entity, property)?.id ?? null;
}

function claimQuantity(entity: WikidataEntity, property: string) {
  const amount = claimValue(entity, property)?.amount;
  return amount ? Number(amount.replace("+", "")) : null;
}

function claimCoordinate(entity: WikidataEntity, property: string) {
  const coordinate = claimValue(entity, property);
  if (typeof coordinate?.latitude !== "number" || typeof coordinate.longitude !== "number") {
    return null;
  }

  return `Point(${coordinate.longitude} ${coordinate.latitude})`;
}

async function fetchWikidata(qid: string) {
  const data = await fetchJson<{ entities?: Record<string, WikidataEntity> }>(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims|sitelinks|labels|descriptions&languages=en&format=json&origin=*`,
    undefined,
    12000,
  );

  const entity = data.entities?.[qid] ?? {};
  const capitalId = claimEntityId(entity, "P36");
  const currencyId = claimEntityId(entity, "P38");
  const continentId = claimEntityId(entity, "P30");
  const officialLanguageId = claimEntityId(entity, "P37");
  const labels = await fetchWikidataLabels(
    [capitalId, currencyId, continentId, officialLanguageId].filter((id): id is string => id != null),
  );

  return {
    qid,
    label: entity.labels?.en?.value ?? null,
    description: entity.descriptions?.en?.value ?? null,
    capital: capitalId ? labels[capitalId] : null,
    currency: currencyId ? labels[currencyId] : null,
    officialLanguage: officialLanguageId ? labels[officialLanguageId] : null,
    continent: continentId ? labels[continentId] : null,
    areaKm2: claimQuantity(entity, "P2046"),
    coordinate: claimCoordinate(entity, "P625"),
    wikidataUrl: qid ? `https://www.wikidata.org/wiki/${qid}` : null,
    wikipediaUrl:
      entity.sitelinks?.enwiki?.url ??
      (entity.sitelinks?.enwiki?.title
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(entity.sitelinks.enwiki.title).replaceAll(
            "%20",
            "_",
          )}`
        : null),
  };
}

type UndataSeries = {
  observations?: Record<string, [number | null]>;
};

type UndataResponse = {
  dataSets?: Array<{ series?: Record<string, UndataSeries> }>;
  structure?: {
    dimensions?: {
      observation?: Array<{
        id?: string;
        values?: Array<{ id?: string; name?: string }>;
      }>;
      series?: Array<{
        id?: string;
        values?: Array<{ id?: string; name?: string }>;
      }>;
    };
  };
};

async function fetchUndataJson(url: string) {
  return new Promise<UndataResponse>((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: "text/json",
        },
        timeout: 9000,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`${response.statusCode ?? 0} ${body.slice(0, 80)}`));
            return;
          }

          try {
            resolve(JSON.parse(body) as UndataResponse);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("UNdata request timed out"));
    });
    request.on("error", reject);
  });
}

async function fetchUndataGreenhouseGas(iso3: string) {
  const url = `https://data.un.org/ws/rest/data/DF_UNData_UNFCC/A.EN_ATM_CO2E_XLULUCF.${iso3}.Gg_CO2?startPeriod=2018`;
  const data = await fetchUndataJson(url);

  const observations = Object.values(data.dataSets?.[0]?.series ?? {})[0]?.observations ?? {};
  const years = data.structure?.dimensions?.observation?.[0]?.values ?? [];
  const unit =
    data.structure?.dimensions?.series
      ?.find((dimension) => dimension.id === "UNIT")
      ?.values?.[0]?.name ?? "Gigagrams (Gg) CO2 equivalent";

  const series = Object.entries(observations)
    .map(([index, observation]) => {
      const value = Array.isArray(observation) ? observation[0] : observation;
      const year = years[Number(index)]?.id;
      return typeof value === "number" && year ? { year, value } : null;
    })
    .filter((point): point is TimePoint => point != null)
    .sort((a, b) => Number(a.year) - Number(b.year));

  const latest = series.at(-1) ?? null;

  return {
    label: "CO2 emissions excluding LULUCF",
    value: latest?.value ?? null,
    year: latest?.year ?? null,
    unit,
    source: "UNdata / UNFCCC",
    series,
    status: latest ? "ok" : "empty",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = getCountryOption(searchParams.get("iso2"));

  if (!COUNTRY_OPTIONS.some((option) => option.iso2 === country.iso2)) {
    return Response.json({ error: "Unsupported country" }, { status: 400 });
  }

  const indicatorRequests = WORLD_BANK_INDICATORS.map((indicator) =>
    fetchWorldBankIndicator(country.iso2, indicator),
  );

  const [worldBankCountry, indicators, wikidataResult, undataResult] = await Promise.allSettled([
    fetchWorldBankCountry(country.iso2),
    Promise.all(indicatorRequests),
    fetchWikidata(country.wikidataId),
    fetchUndataGreenhouseGas(country.iso3),
  ]);

  const worldBank =
    worldBankCountry.status === "fulfilled"
      ? worldBankCountry.value
      : {
          id: country.iso3,
          iso2Code: country.iso2,
          name: country.name,
        };

  return Response.json({
    country,
    generatedAt: new Date().toISOString(),
    worldBank,
    indicators: indicators.status === "fulfilled" ? indicators.value : [],
    wikidata:
      wikidataResult.status === "fulfilled"
        ? wikidataResult.value
        : {
            qid: null,
            label: null,
            capital: null,
            currency: null,
            officialLanguage: null,
            continent: null,
            areaKm2: null,
            coordinate: null,
            wikidataUrl: null,
            wikipediaUrl: null,
          },
    undata:
      undataResult.status === "fulfilled"
        ? undataResult.value
        : {
            label: "CO2 emissions excluding LULUCF",
            value: null,
            year: null,
            unit: "Gigagrams (Gg) CO2 equivalent",
            source: "UNdata / UNFCCC",
            series: [],
            status: "unavailable",
          },
    sources: [
      "World Bank Indicators API",
      "UNdata SDMX REST API",
      "Wikidata entity API",
      "country-flag-icons",
    ],
  });
}
