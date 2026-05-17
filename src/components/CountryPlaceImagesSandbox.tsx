"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  type PlaceImageSandboxResult,
  PLACE_IMAGE_COUNTRIES,
} from "@/lib/placeImageSandboxCountries";
import styles from "./CountryPlaceImagesSandbox.module.css";

type LoadStatus = "loading" | "ready" | "error";

const resultCache = new Map<string, PlaceImageSandboxResult>();

function formatSize(width: number | null, height: number | null) {
  if (!width || !height) {
    return "Size unknown";
  }

  return `${new Intl.NumberFormat("en").format(width)} x ${new Intl.NumberFormat("en").format(height)}`;
}

function bestCredit(image: PlaceImageSandboxResult["images"][number]) {
  return image.attribution ?? image.artist ?? image.credit ?? "Attribution unavailable";
}

export function CountryPlaceImagesSandbox() {
  const [countryQid, setCountryQid] = useState("Q17");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [data, setData] = useState<PlaceImageSandboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedCountry = useMemo(
    () => PLACE_IMAGE_COUNTRIES.find((country) => country.qid === countryQid) ?? PLACE_IMAGE_COUNTRIES[0],
    [countryQid],
  );

  useEffect(() => {
    let active = true;
    const cachedResult = resultCache.get(countryQid);

    if (cachedResult) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/country-place-images?qid=${countryQid}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Image sandbox request failed (${response.status})`);
        }

        return response.json() as Promise<PlaceImageSandboxResult>;
      })
      .then((nextData) => {
        if (!active) return;
        resultCache.set(countryQid, nextData);
        setData(nextData);
        setStatus("ready");
      })
      .catch((requestError: unknown) => {
        if (!active || (requestError instanceof DOMException && requestError.name === "AbortError")) return;
        setStatus("error");
        setError(requestError instanceof Error ? requestError.message : "Unable to fetch place images");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [countryQid, refreshKey]);

  const updatedAt = data
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.generatedAt))
    : null;

  const handleCountryChange = (nextQid: string) => {
    const cachedResult = resultCache.get(nextQid);

    setCountryQid(nextQid);
    setData(cachedResult ?? null);
    setStatus(cachedResult ? "ready" : "loading");
    setError(null);
  };

  const handleRefresh = () => {
    resultCache.delete(countryQid);
    setData(null);
    setStatus("loading");
    setError(null);
    setRefreshKey((key) => key + 1);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Sandbox / Wikimedia image fetch</p>
          <h1>Country Famous Place Images</h1>
          <p className={styles.intro}>
            Test notable Wikidata places with Commons image metadata before turning the idea into production UI.
          </p>
        </div>

        <div className={styles.controls}>
          <label>
            <span>Country</span>
            <select value={countryQid} onChange={(event) => handleCountryChange(event.target.value)}>
              {PLACE_IMAGE_COUNTRIES.map((country) => (
                <option key={country.qid} value={country.qid}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <button className={styles.refreshButton} type="button" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </header>

      <section className={styles.debugPanel} aria-label="Fetch debug summary">
        <div>
          <span>Selected country</span>
          <strong>{selectedCountry.name}</strong>
        </div>
        <div>
          <span>Raw result count</span>
          <strong>{data?.rawResultCount ?? (status === "loading" ? "..." : 0)}</strong>
        </div>
        <div>
          <span>Usable image count</span>
          <strong>{data?.usableImageCount ?? (status === "loading" ? "..." : 0)}</strong>
        </div>
        <div>
          <span>Last fetch</span>
          <strong>{updatedAt ?? "Pending"}</strong>
        </div>
      </section>

      {status === "loading" ? (
        <section className={styles.statePanel} aria-live="polite">
          <strong>Loading notable places</strong>
          <span>Querying Wikidata, then checking Commons image metadata.</span>
        </section>
      ) : null}

      {status === "error" ? (
        <section className={styles.statePanel} role="alert">
          <strong>Image fetch failed</strong>
          <span>{error ?? "The Wikimedia services did not return a usable response."}</span>
        </section>
      ) : null}

      {status === "ready" && data?.images.length === 0 ? (
        <section className={styles.statePanel}>
          <strong>No usable images found</strong>
          <span>The Wikidata results did not include Commons images that passed the sandbox filters.</span>
        </section>
      ) : null}

      {status === "ready" && data && data.images.length > 0 ? (
        <section className={styles.grid} aria-label={`${data.country.name} famous place images`}>
          {data.images.map((image) => (
            <article className={styles.card} key={image.id}>
              <a className={styles.imageLink} href={image.filePageUrl} target="_blank" rel="noreferrer">
                <Image
                  src={image.thumbnailUrl}
                  alt={`${image.placeName} from Wikimedia Commons`}
                  fill
                  sizes="(max-width: 720px) 100vw, (max-width: 1120px) 50vw, 33vw"
                />
              </a>

              <div className={styles.cardBody}>
                <div className={styles.cardTitleRow}>
                  <h2>{image.placeName}</h2>
                  <span>{image.sitelinks} links</span>
                </div>

                <dl className={styles.metaList}>
                  <div>
                    <dt>Commons filename</dt>
                    <dd>{image.commonsFileName}</dd>
                  </div>
                  <div>
                    <dt>Author / credit</dt>
                    <dd>{bestCredit(image)}</dd>
                  </div>
                  <div>
                    <dt>License</dt>
                    <dd>{image.licenseName ?? "License unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Image details</dt>
                    <dd>
                      {formatSize(image.width, image.height)} / {image.mime ?? "MIME unknown"}
                    </dd>
                  </div>
                </dl>

                <div className={styles.links}>
                  <a href={image.filePageUrl} target="_blank" rel="noreferrer">
                    Commons file
                  </a>
                  {image.articleUrl ? (
                    <a href={image.articleUrl} target="_blank" rel="noreferrer">
                      Wikipedia article
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
