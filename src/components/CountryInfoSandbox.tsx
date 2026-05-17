"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { hasFlag } from "country-flag-icons";
import * as flagSvgs from "country-flag-icons/string/3x2";
import { COUNTRY_OPTIONS } from "@/lib/countryOptions";
import {
  PLACE_IMAGE_COUNTRIES,
  type PlaceImageSandboxResult,
} from "@/lib/placeImageSandboxCountries";
import styles from "./CountryInfoSandbox.module.css";

type DesignMode = "feature" | "night" | "atlas" | "ledger" | "signals" | "passport";

type LoadStatus = "loading" | "ready" | "error";
type ImageLoadStatus = "loading" | "ready" | "error" | "unavailable";

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

type CountryInfo = {
  country: {
    iso2: string;
    iso3: string;
    numeric: string;
    name: string;
  };
  generatedAt: string;
  worldBank: {
    id?: string;
    iso2Code?: string;
    name?: string;
    region?: { value?: string };
    incomeLevel?: { value?: string };
    capitalCity?: string;
    longitude?: string;
    latitude?: string;
  } | null;
  indicators: IndicatorValue[];
  wikidata: {
    qid: string | null;
    label: string | null;
    description: string | null;
    capital: string | null;
    currency: string | null;
    officialLanguage: string | null;
    continent: string | null;
    areaKm2: number | null;
    coordinate: string | null;
    wikidataUrl: string | null;
    wikipediaUrl: string | null;
  };
  undata: {
    label: string;
    value: number | null;
    year: string | null;
    unit: string;
    source: "UNdata / UNFCCC";
    series: TimePoint[];
    status: "ok" | "empty" | "unavailable";
  };
  sources: string[];
};

type FlagCssProperties = React.CSSProperties & {
  "--flag-image"?: string;
};

type CardVariant = "paper" | "night";
type CountryVisualImage = Pick<PlaceImageSandboxResult["images"][number], "placeName" | "thumbnailUrl">;
type CountryCardFallback = {
  continent: string;
  currency: string;
  description: string;
  fact: string;
  language: string;
};

type CountryIconName =
  | "arrow"
  | "bookmark"
  | "capital"
  | "currency"
  | "image"
  | "info"
  | "language"
  | "nature"
  | "population";

const DESIGN_OPTIONS: Array<{
  value: DesignMode;
  label: string;
}> = [
  { value: "feature", label: "Feature card" },
  { value: "night", label: "Night card" },
  { value: "atlas", label: "Atlas board" },
  { value: "ledger", label: "Stat ledger" },
  { value: "signals", label: "Signal panel" },
  { value: "passport", label: "Passport sheet" },
];

const FLAG_SVGS = flagSvgs as Record<string, string | undefined>;
const countryInfoCache = new Map<string, CountryInfo>();
const placeImageCache = new Map<string, PlaceImageSandboxResult>();

const COUNTRY_CARD_FALLBACKS: Partial<Record<string, CountryCardFallback>> = {
  AE: {
    continent: "Asia",
    currency: "UAE dirham",
    description: "Federation of seven emirates on the Arabian Peninsula.",
    fact: "The United Arab Emirates is made up of seven emirates.",
    language: "Arabic",
  },
  AU: {
    continent: "Oceania",
    currency: "Australian dollar",
    description: "Island continent and country between the Indian and Pacific oceans.",
    fact: "Australia is the only country that covers an entire continent.",
    language: "English",
  },
  BR: {
    continent: "South America",
    currency: "Brazilian real",
    description: "Largest country in South America by area and population.",
    fact: "Brazil contains the largest share of the Amazon rainforest.",
    language: "Portuguese",
  },
  CA: {
    continent: "North America",
    currency: "Canadian dollar",
    description: "North American country stretching from the Atlantic to the Pacific.",
    fact: "Canada has the world's longest coastline.",
    language: "English and French",
  },
  CN: {
    continent: "Asia",
    currency: "renminbi",
    description: "East Asian country with one of the world's largest populations.",
    fact: "China spans one official time zone despite its continental scale.",
    language: "Mandarin Chinese",
  },
  DE: {
    continent: "Europe",
    currency: "euro",
    description: "Central European country with a federal parliamentary system.",
    fact: "Germany shares borders with nine countries.",
    language: "German",
  },
  FR: {
    continent: "Europe",
    currency: "euro",
    description: "Western European country with overseas regions and territories.",
    fact: "France has territories in multiple oceans.",
    language: "French",
  },
  GB: {
    continent: "Europe",
    currency: "pound sterling",
    description: "Island country made up of England, Scotland, Wales, and Northern Ireland.",
    fact: "The United Kingdom is a union of four constituent countries.",
    language: "English",
  },
  IN: {
    continent: "Asia",
    currency: "Indian rupee",
    description: "South Asian federal republic with a vast linguistic and cultural landscape.",
    fact: "India recognizes 22 scheduled languages in its constitution.",
    language: "Hindi and English",
  },
  JP: {
    continent: "Asia",
    currency: "Japanese yen",
    description: "Island country in East Asia.",
    fact: "Japan is made up of more than 6,800 islands.",
    language: "Japanese",
  },
  NO: {
    continent: "Europe",
    currency: "Norwegian krone",
    description: "Nordic country known for mountains, fjords, and a long coastline.",
    fact: "Norway's coastline includes thousands of islands and fjords.",
    language: "Norwegian",
  },
  US: {
    continent: "North America",
    currency: "United States dollar",
    description: "Federal republic spanning North America and several island territories.",
    fact: "The United States includes 50 states and a federal district.",
    language: "English",
  },
};

const COUNTRY_IMAGE_FALLBACKS: Partial<Record<string, CountryVisualImage[]>> = {
  JP: [
    {
      placeName: "Mount Fuji",
      thumbnailUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Kodaki_fuji_frm_shojinko_refurb.jpg/960px-Kodaki_fuji_frm_shojinko_refurb.jpg",
    },
  ],
};

function flagExportName(alpha2: string) {
  return alpha2.replaceAll("-", "_");
}

function flagDataUrlForAlpha2(alpha2: string) {
  if (!hasFlag(alpha2)) {
    return null;
  }

  const svg = FLAG_SVGS[flagExportName(alpha2)];
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
}

function formatNumber(value: number | null, unit = "") {
  if (value == null || Number.isNaN(value)) {
    return "No data";
  }

  if (unit.includes("%")) {
    return `${value.toFixed(1)}%`;
  }

  if (unit.includes("per capita") || unit === "years") {
    return new Intl.NumberFormat("en", {
      maximumFractionDigits: unit === "years" ? 1 : 2,
    }).format(value);
  }

  if (Math.abs(value) >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function formatLong(value: number | null, unit = "") {
  if (value == null || Number.isNaN(value)) {
    return "No data";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: unit.includes("per capita") || unit === "years" ? 2 : 0,
  }).format(value);
}

function indicatorById(data: CountryInfo | null, id: string) {
  return data?.indicators.find((indicator) => indicator.id === id) ?? null;
}

function sourceTone(status: CountryInfo["undata"]["status"]) {
  if (status === "ok") return styles.sourceOk;
  if (status === "empty") return styles.sourceEmpty;
  return styles.sourceUnavailable;
}

function placeImagesSupported(qid: string) {
  return PLACE_IMAGE_COUNTRIES.some((country) => country.qid === qid);
}

function sentenceCase(value: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const sentence = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function featureDescription(data: CountryInfo) {
  return (
    sentenceCase(data.wikidata.description) ??
    COUNTRY_CARD_FALLBACKS[data.country.iso2]?.description ??
    `${data.country.name} profile assembled from World Bank, Wikidata, and UNdata sources.`
  );
}

function countryFact(data: CountryInfo) {
  const fallbackFact = COUNTRY_CARD_FALLBACKS[data.country.iso2]?.fact;
  if (fallbackFact) {
    return fallbackFact;
  }

  if (data.wikidata.areaKm2) {
    const region = data.wikidata.continent ? ` in ${data.wikidata.continent}` : "";
    return `${data.country.name} spans ${formatLong(data.wikidata.areaKm2)} square kilometers${region}.`;
  }

  const urban = indicatorById(data, "SP.URB.TOTL.IN.ZS");
  if (urban?.value != null) {
    return `${formatNumber(urban.value, urban.unit)} of people live in urban areas.`;
  }

  if (data.undata.status === "ok" && data.undata.year) {
    return `UNdata has climate observations through ${data.undata.year}.`;
  }

  return "Live coverage varies by source, so unavailable values are kept visible.";
}

function FlagSwatch({
  flagStyle,
  label,
  className,
}: {
  flagStyle?: FlagCssProperties;
  label: string;
  className?: string;
}) {
  return <span aria-label={label} className={`${styles.flagSwatch} ${className ?? ""}`} role="img" style={flagStyle} />;
}

function CountryIcon({ icon, className }: { icon: CountryIconName; className?: string }) {
  const iconPath = {
    arrow: <path d="m14 5 7 7m0 0-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />,
    bookmark: (
      <path
        d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    ),
    capital: (
      <>
        <path
          d="M17.657 16.657 13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </>
    ),
    currency: (
      <path
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    image: (
      <path
        d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm3 11 3.2-3.2a1 1 0 0 1 1.4 0L14 15.2l1.2-1.2a1 1 0 0 1 1.4 0L20 17.4M8.5 8.5h.01"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    info: (
      <path
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    language: (
      <path
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-5 5v-5z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    nature: (
      <path
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16 2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
    population: (
      <path
        d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  } satisfies Record<CountryIconName, React.ReactNode>;

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {iconPath[icon]}
    </svg>
  );
}

function Sparkline({ points }: { points: TimePoint[] }) {
  const path = useMemo(() => {
    if (points.length < 2) return "";

    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    return points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 42 - ((point.value - min) / span) * 34;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg className={styles.sparkline} viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
      <path className={styles.sparklineGrid} d="M 0 8 L 100 8 M 0 25 L 100 25 M 0 42 L 100 42" />
      {path ? <path className={styles.sparklinePath} d={path} /> : null}
    </svg>
  );
}

function SourceRail({
  data,
  imageData,
  imageStatus,
}: {
  data: CountryInfo | null;
  imageData: PlaceImageSandboxResult | null;
  imageStatus: ImageLoadStatus;
}) {
  const imageTone = imageData?.images.length ? styles.sourceOk : imageStatus === "error" ? styles.sourceUnavailable : styles.sourceEmpty;

  return (
    <div className={styles.sourceRail}>
      <span>World Bank</span>
      <span className={sourceTone(data?.undata.status ?? "unavailable")}>UNdata</span>
      <span>Wikidata</span>
      <span>Flags</span>
      <span className={imageTone}>Commons imagery</span>
    </div>
  );
}

function MetaLinks({ data }: { data: CountryInfo }) {
  return (
    <div className={styles.linkRow}>
      {data.wikidata.wikidataUrl ? (
        <a href={data.wikidata.wikidataUrl} target="_blank" rel="noreferrer">
          Wikidata {data.wikidata.qid}
        </a>
      ) : null}
      {data.wikidata.wikipediaUrl ? (
        <a href={data.wikidata.wikipediaUrl} target="_blank" rel="noreferrer">
          Wikipedia
        </a>
      ) : null}
    </div>
  );
}

function StatCard({ indicator }: { indicator: IndicatorValue | null }) {
  return (
    <article className={styles.statCard}>
      <p>{indicator?.label ?? "Indicator"}</p>
      <strong>{formatNumber(indicator?.value ?? null, indicator?.unit)}</strong>
      <span>
        {indicator?.year ?? "Latest"} / {indicator?.unit ?? "World Bank"}
      </span>
    </article>
  );
}

function FeatureCountryCard({
  data,
  flagStyle,
  imageData,
  imageStatus,
  variant,
}: {
  data: CountryInfo;
  flagStyle?: FlagCssProperties;
  imageData: PlaceImageSandboxResult | null;
  imageStatus: ImageLoadStatus;
  variant: CardVariant;
}) {
  const fallbackImages = COUNTRY_IMAGE_FALLBACKS[data.country.iso2] ?? [];
  const heroImage = imageData?.images[0] ?? fallbackImages[0] ?? null;
  const thumbImage = imageData?.images[1] ?? heroImage;
  const population = indicatorById(data, "SP.POP.TOTL");
  const fallback = COUNTRY_CARD_FALLBACKS[data.country.iso2];
  const capital = data.wikidata.capital ?? data.worldBank?.capitalCity ?? "No data";
  const currency = fallback?.currency ?? data.wikidata.currency ?? "No data";
  const language = fallback?.language ?? data.wikidata.officialLanguage ?? "No data";
  const region = fallback?.continent ?? data.wikidata.continent ?? data.worldBank?.region?.value ?? "Country profile";
  const exploreUrl = data.wikidata.wikipediaUrl ?? data.wikidata.wikidataUrl;
  const cardClassName = `${styles.featureCard} ${variant === "night" ? styles.featureCardNight : ""}`;
  const stats = [
    { label: "Capital", value: capital, icon: "capital" },
    { label: "Population", value: formatNumber(population?.value ?? null, population?.unit), icon: "population" },
    { label: "Language", value: language, icon: "language" },
    { label: "Currency", value: currency, icon: "currency" },
  ] satisfies Array<{ label: string; value: string; icon: CountryIconName }>;

  return (
    <article className={cardClassName}>
      <section className={styles.featurePhoto} aria-label={`${data.country.name} visual preview`}>
        {heroImage ? (
          <Image
            src={heroImage.thumbnailUrl}
            alt={`${heroImage.placeName} in ${data.country.name}`}
            fill
            priority={data.country.iso2 === "JP"}
            sizes="(max-width: 820px) 100vw, 42vw"
          />
        ) : (
          <div className={styles.photoFallback}>
            <FlagSwatch flagStyle={flagStyle} label={`${data.country.name} flag`} className={styles.fallbackFlag} />
            <span>{imageStatus === "loading" ? "Finding a Commons image" : "Image unavailable"}</span>
          </div>
        )}
        <div className={styles.photoShade} aria-hidden="true" />
        <div className={styles.featureFlagBadge}>
          <FlagSwatch flagStyle={flagStyle} label={`${data.country.name} flag`} />
          <span>{data.country.iso2}</span>
        </div>
        <button className={styles.featureSaveButton} type="button" aria-label={`Save ${data.country.name}`}>
          <CountryIcon icon="bookmark" className={styles.featureSaveIcon} />
        </button>
        <p className={styles.photoCaption}>{heroImage?.placeName ?? data.country.name}</p>
      </section>

      <section className={styles.featureInfo}>
        <span className={styles.verticalMark} aria-hidden="true">
          Explore {data.country.iso3}
        </span>
        <header className={styles.featureHeader}>
          <p className={styles.featureKicker}>{region}</p>
          <h2>{data.country.name}</h2>
          <p className={styles.isoLine}>
            {data.country.iso2} / {data.country.iso3} / {data.country.numeric}
          </p>
          <p className={styles.featureDescription}>{featureDescription(data)}</p>
        </header>

        <div className={styles.featureStats} aria-label={`${data.country.name} key facts`}>
          {stats.map((stat) => (
            <div className={styles.featureStat} key={stat.label}>
              <span className={styles.featureStatIcon}>
                <CountryIcon icon={stat.icon} className={styles.featureStatSvg} />
              </span>
              <div>
                <p>{stat.label}</p>
                <strong>{stat.value}</strong>
              </div>
            </div>
          ))}
        </div>

        <footer className={styles.featureFactPanel}>
          <div className={styles.featureFactCopy}>
            {thumbImage ? (
              <span className={styles.featureFactImage}>
                <Image src={thumbImage.thumbnailUrl} alt="" fill sizes="48px" />
              </span>
            ) : (
              <span className={styles.featureFactIcon}>
                <CountryIcon icon="info" className={styles.featureFactSvg} />
              </span>
            )}
            <div>
              <p>Did you know?</p>
              <span>{countryFact(data)}</span>
            </div>
          </div>
          {exploreUrl ? (
            <a className={styles.featureExploreButton} href={exploreUrl} target="_blank" rel="noreferrer">
              Explore {data.country.name}
              <CountryIcon icon="arrow" className={styles.featureExploreIcon} />
            </a>
          ) : (
            <button className={styles.featureExploreButton} type="button" disabled>
              Explore {data.country.name}
              <CountryIcon icon="arrow" className={styles.featureExploreIcon} />
            </button>
          )}
        </footer>
      </section>
    </article>
  );
}

function AtlasBoard({ data, flagStyle }: { data: CountryInfo; flagStyle?: FlagCssProperties }) {
  const population = indicatorById(data, "SP.POP.TOTL");
  const gdp = indicatorById(data, "NY.GDP.MKTP.CD");
  const life = indicatorById(data, "SP.DYN.LE00.IN");
  const urban = indicatorById(data, "SP.URB.TOTL.IN.ZS");
  const fallback = COUNTRY_CARD_FALLBACKS[data.country.iso2];

  return (
    <section className={styles.atlasBoard}>
      <div className={styles.heroFlag} style={flagStyle} aria-hidden="true" />
      <div className={styles.atlasHeader}>
        <p>{fallback?.continent ?? data.wikidata.continent ?? data.worldBank?.region?.value ?? "Country profile"}</p>
        <h1>{data.country.name}</h1>
        <span>
          {data.country.iso2} / {data.country.iso3}
        </span>
      </div>

      <div className={styles.statGrid}>
        <StatCard indicator={population} />
        <StatCard indicator={gdp} />
        <StatCard indicator={life} />
        <StatCard indicator={urban} />
      </div>

      <div className={styles.atlasFooter}>
        <dl>
          <div>
            <dt>Capital</dt>
            <dd>{data.wikidata.capital ?? data.worldBank?.capitalCity ?? "No data"}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{fallback?.currency ?? data.wikidata.currency ?? "No data"}</dd>
          </div>
          <div>
            <dt>Income level</dt>
            <dd>{data.worldBank?.incomeLevel?.value ?? "No data"}</dd>
          </div>
        </dl>
        <MetaLinks data={data} />
      </div>
    </section>
  );
}

function LedgerBoard({ data, flagStyle }: { data: CountryInfo; flagStyle?: FlagCssProperties }) {
  return (
    <section className={styles.ledgerBoard}>
      <div className={styles.ledgerTitle}>
        <span className={styles.smallFlag} style={flagStyle} aria-hidden="true" />
        <div>
          <h1>{data.country.name}</h1>
          <p>{data.worldBank?.region?.value ?? data.wikidata.continent ?? "Region unavailable"}</p>
        </div>
      </div>

      <table className={styles.ledgerTable}>
        <thead>
          <tr>
            <th>Indicator</th>
            <th>Value</th>
            <th>Year</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {data.indicators.map((indicator) => (
            <tr key={indicator.id}>
              <td>{indicator.label}</td>
              <td>{formatLong(indicator.value, indicator.unit)}</td>
              <td>{indicator.year ?? "No data"}</td>
              <td>{indicator.source}</td>
            </tr>
          ))}
          <tr>
            <td>{data.undata.label}</td>
            <td>{formatLong(data.undata.value, data.undata.unit)}</td>
            <td>{data.undata.year ?? data.undata.status}</td>
            <td>{data.undata.source}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function SignalsBoard({ data }: { data: CountryInfo }) {
  const co2PerCapita = indicatorById(data, "EN.ATM.CO2E.PC");
  const gdpPerCapita = indicatorById(data, "NY.GDP.PCAP.CD");
  const urban = indicatorById(data, "SP.URB.TOTL.IN.ZS");
  const life = indicatorById(data, "SP.DYN.LE00.IN");
  const signals = [co2PerCapita, gdpPerCapita, urban, life].filter(Boolean) as IndicatorValue[];

  return (
    <section className={styles.signalsBoard}>
      <div className={styles.signalLead}>
        <p>{data.country.iso3}</p>
        <h1>{data.country.name}</h1>
        <span>{data.wikidata.capital ?? data.worldBank?.capitalCity ?? "Capital unavailable"}</span>
      </div>

      <div className={styles.signalRows}>
        {signals.map((indicator) => {
          const percentage =
            indicator.unit.includes("%") && indicator.value != null
              ? Math.max(0, Math.min(100, indicator.value))
              : indicator.value != null
                ? Math.max(8, Math.min(100, Math.log10(Math.abs(indicator.value) + 1) * 14))
                : 0;

          return (
            <div className={styles.signalRow} key={indicator.id}>
              <div>
                <strong>{indicator.label}</strong>
                <span>
                  {formatNumber(indicator.value, indicator.unit)} / {indicator.year}
                </span>
              </div>
              <div className={styles.signalBar}>
                <span style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.unSignal}>
        <div>
          <p>UNdata greenhouse gas series</p>
          <strong>{formatNumber(data.undata.value, data.undata.unit)}</strong>
          <span>{data.undata.year ?? data.undata.status}</span>
        </div>
        <Sparkline points={data.undata.series} />
      </div>
    </section>
  );
}

function PassportBoard({ data, flagStyle }: { data: CountryInfo; flagStyle?: FlagCssProperties }) {
  const fallback = COUNTRY_CARD_FALLBACKS[data.country.iso2];

  return (
    <section className={styles.passportBoard}>
      <div className={styles.passportFlag} style={flagStyle} aria-hidden="true" />
      <div className={styles.passportText}>
        <p>Country</p>
        <h1>{data.country.name}</h1>
        <dl>
          <div>
            <dt>Capital</dt>
            <dd>{data.wikidata.capital ?? data.worldBank?.capitalCity ?? "No data"}</dd>
          </div>
          <div>
            <dt>Continent</dt>
            <dd>{fallback?.continent ?? data.wikidata.continent ?? "No data"}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{data.wikidata.areaKm2 ? `${formatLong(data.wikidata.areaKm2)} km2` : "No data"}</dd>
          </div>
          <div>
            <dt>ISO numeric</dt>
            <dd>{data.country.numeric}</dd>
          </div>
        </dl>
        <MetaLinks data={data} />
      </div>
    </section>
  );
}

export function CountryInfoSandbox() {
  const [countryIso2, setCountryIso2] = useState("JP");
  const [designMode, setDesignMode] = useState<DesignMode>("feature");
  const [data, setData] = useState<CountryInfo | null>(null);
  const [imageData, setImageData] = useState<PlaceImageSandboxResult | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [imageStatus, setImageStatus] = useState<ImageLoadStatus>("loading");

  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((country) => country.iso2 === countryIso2) ?? COUNTRY_OPTIONS[0],
    [countryIso2],
  );

  useEffect(() => {
    const cachedResult = countryInfoCache.get(countryIso2);
    if (cachedResult) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    fetch(`/api/country-info?iso2=${countryIso2}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Country profile request failed");
        }

        return response.json() as Promise<CountryInfo>;
      })
      .then((nextData) => {
        if (!active) return;
        countryInfoCache.set(countryIso2, nextData);
        setData(nextData);
        setStatus("ready");
      })
      .catch((requestError: unknown) => {
        if (!active || (requestError instanceof DOMException && requestError.name === "AbortError")) return;
        setStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [countryIso2]);

  useEffect(() => {
    const qid = selectedCountry.wikidataId;

    if (!placeImagesSupported(qid)) {
      return;
    }

    const cachedResult = placeImageCache.get(qid);
    if (cachedResult) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    fetch(`/api/country-place-images?qid=${qid}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Country image request failed");
        }

        return response.json() as Promise<PlaceImageSandboxResult>;
      })
      .then((nextData) => {
        if (!active) return;
        placeImageCache.set(qid, nextData);
        setImageData(nextData);
        setImageStatus("ready");
      })
      .catch((requestError: unknown) => {
        if (!active || (requestError instanceof DOMException && requestError.name === "AbortError")) return;
        setImageStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCountry.wikidataId]);

  const flagDataUrl = useMemo(
    () => flagDataUrlForAlpha2(data?.country.iso2 ?? countryIso2),
    [countryIso2, data?.country.iso2],
  );

  const flagStyle = useMemo<FlagCssProperties | undefined>(
    () => (flagDataUrl ? { "--flag-image": `url("${flagDataUrl}")` } : undefined),
    [flagDataUrl],
  );

  const updatedAt = data
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.generatedAt))
    : null;

  const handleCountryChange = (nextIso2: string) => {
    const cachedResult = countryInfoCache.get(nextIso2);
    const nextCountry = COUNTRY_OPTIONS.find((country) => country.iso2 === nextIso2) ?? COUNTRY_OPTIONS[0];
    const cachedImages = placeImageCache.get(nextCountry.wikidataId);

    setCountryIso2(nextIso2);
    setData(cachedResult ?? null);
    setStatus(cachedResult ? "ready" : "loading");
    setImageData(cachedImages ?? null);

    if (!placeImagesSupported(nextCountry.wikidataId)) {
      setImageStatus("unavailable");
    } else {
      setImageStatus(cachedImages ? "ready" : "loading");
    }
  };

  return (
    <main className={styles.shell}>
      <div className={styles.topbar}>
        <div>
          <p>World Unpacked</p>
          <h1>Country Card Lab</h1>
        </div>

        <div className={styles.controls}>
          <label>
            <span>Country</span>
            <select value={countryIso2} onChange={(event) => handleCountryChange(event.target.value)}>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.iso2} value={country.iso2}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Design</span>
            <select value={designMode} onChange={(event) => setDesignMode(event.target.value as DesignMode)}>
              {DESIGN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <SourceRail data={data} imageData={imageData} imageStatus={imageStatus} />

      <div className={styles.stage}>
        {status === "loading" ? (
          <div className={styles.statePanel}>Loading country profile</div>
        ) : null}
        {status === "error" ? <div className={styles.statePanel}>Profile unavailable</div> : null}
        {status === "ready" && data ? (
          <>
            {designMode === "feature" ? (
              <FeatureCountryCard
                data={data}
                flagStyle={flagStyle}
                imageData={imageData}
                imageStatus={imageStatus}
                variant="paper"
              />
            ) : null}
            {designMode === "night" ? (
              <FeatureCountryCard
                data={data}
                flagStyle={flagStyle}
                imageData={imageData}
                imageStatus={imageStatus}
                variant="night"
              />
            ) : null}
            {designMode === "atlas" ? <AtlasBoard data={data} flagStyle={flagStyle} /> : null}
            {designMode === "ledger" ? <LedgerBoard data={data} flagStyle={flagStyle} /> : null}
            {designMode === "signals" ? <SignalsBoard data={data} /> : null}
            {designMode === "passport" ? <PassportBoard data={data} flagStyle={flagStyle} /> : null}
          </>
        ) : null}
      </div>

      <footer className={styles.footer}>
        <span>{updatedAt ? `Updated ${updatedAt}` : "Fetching data"}</span>
        <span>
          {imageData?.images.length
            ? "Commons imagery loaded"
            : COUNTRY_IMAGE_FALLBACKS[countryIso2]
              ? "Curated image fallback"
              : "Imagery coverage varies"}
        </span>
      </footer>
    </main>
  );
}
