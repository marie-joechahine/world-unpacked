"use client";

import { lazy, Suspense, type CSSProperties, useMemo } from "react";
import * as flagSvgs from "country-flag-icons/string/3x2";
import {
  CINEMATIC_COUNTRIES,
  type CinematicCountry,
} from "@/lib/cinematicCountries";
import type { FlagAnimationRenderer } from "./WavingFlag";
import styles from "./CountryCinematicOverlay.module.css";

export type CinematicPhase = "intro" | "fact" | "flag" | "transition";
type StoryPhase = Exclude<CinematicPhase, "transition">;

type FlagStyle = CSSProperties & {
  "--country-flag"?: string;
  "--country-accent"?: string;
};

type CountryCinematicOverlayProps = {
  country: CinematicCountry | null;
  phase: CinematicPhase;
  engineLabel: string;
  variant?: "actions" | "story";
  onLearnMore?: () => void;
  onShowFlag?: () => void;
  onNextCountry?: () => void;
  onAdvance?: () => void;
  onBack?: () => void;
  onClose?: () => void;
};

const FLAG_SVGS = flagSvgs as Record<string, string | undefined>;
const LazyWavingFlag = lazy(() =>
  import("./WavingFlag").then((module) => ({ default: module.WavingFlag })),
);
const STORY_PHASES: StoryPhase[] = ["intro", "fact", "flag"];
const WIKIMEDIA_FLAG_PATHS: Record<string, string> = {
  JP: "/flags/JP.svg",
  LB: "/flags/LB.svg",
  RU: "/flags/RU.svg",
  US: "/flags/US.svg",
};

function flagDataUrl(alpha2: string) {
  const svg = FLAG_SVGS[alpha2.replaceAll("-", "_")];
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";
}

function flagImageUrl(alpha2: string) {
  return WIKIMEDIA_FLAG_PATHS[alpha2] ?? flagDataUrl(alpha2);
}

function flagAnimationRenderer(alpha2: string): FlagAnimationRenderer {
  if (alpha2 === "LB") {
    return "webgl-displacement";
  }

  return alpha2 === "US" ? "svg-filter" : "three";
}

export function CountryCinematicOverlay({
  country,
  phase,
  engineLabel,
  variant = "actions",
  onLearnMore,
  onShowFlag,
  onNextCountry,
  onAdvance,
  onBack,
  onClose,
}: CountryCinematicOverlayProps) {
  const flagUrl = useMemo(() => (country ? flagImageUrl(country.alpha2) : ""), [country]);

  if (!country) {
    return null;
  }

  const isStoryVariant = variant === "story";
  const storyIndex = Math.max(0, STORY_PHASES.indexOf(phase as StoryPhase));
  const countryIndex = Math.max(
    0,
    CINEMATIC_COUNTRIES.findIndex((storyCountry) => storyCountry.id === country.id),
  );
  const countryCount = CINEMATIC_COUNTRIES.length;
  const countriesLeft = Math.max(countryCount - countryIndex - 1, 0);
  const countriesLeftLabel = `${countriesLeft} ${
    countriesLeft === 1 ? "country" : "countries"
  } left`;
  const showStoryCountryChip = isStoryVariant && (phase === "fact" || phase === "flag");
  const animationRenderer = flagAnimationRenderer(country.alpha2);
  const overlayStyle: FlagStyle = {
    "--country-flag": flagUrl ? `url("${flagUrl}")` : undefined,
    "--country-accent": country.accentColor,
  };
  const phaseClass =
    phase === "fact"
      ? styles.factPhase
      : phase === "flag"
        ? styles.flagPhase
        : phase === "transition"
          ? styles.transitionPhase
          : styles.introPhase;

  return (
    <div
      className={`${styles.overlay} ${phaseClass} ${isStoryVariant ? styles.storyOverlay : ""}`}
      style={overlayStyle}
    >
      <span className={styles.topFade} aria-hidden="true" />
      <span className={styles.bottomFade} aria-hidden="true" />

      {isStoryVariant ? (
        <>
          <div
            className={styles.storyHeader}
            aria-label={`${country.englishName} ${countryIndex + 1} of ${countryCount}. ${countriesLeftLabel}. Slide ${storyIndex + 1} of ${STORY_PHASES.length}.`}
          >
            <p className={styles.storyCounter}>
              {country.englishName} {countryIndex + 1} of {countryCount}
            </p>
            <div className={styles.progressRail} aria-hidden="true">
              {CINEMATIC_COUNTRIES.map((storyCountry, index) => (
                <span
                  key={storyCountry.id}
                  className={styles.progressSegment}
                  data-progress={
                    index < countryIndex
                      ? "complete"
                      : index === countryIndex
                        ? "active"
                        : "pending"
                  }
                >
                  <i />
                </span>
              ))}
            </div>
            <p className={styles.storyRemaining}>{countriesLeftLabel}</p>
          </div>
          <button
            type="button"
            className={`${styles.tapZone} ${styles.tapBack}`}
            onClick={onBack}
            aria-label="Previous story"
          />
          <button
            type="button"
            className={`${styles.tapZone} ${styles.tapForward}`}
            onClick={onAdvance}
            aria-label="Next story"
          />
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close lesson">
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
          <div
            className={styles.countryChip}
            data-visible={showStoryCountryChip}
            aria-hidden="true"
          >
            <span className={styles.chipFlag} />
            <span className={styles.chipRule} />
            <span className={styles.chipText}>
              <strong>{country.englishName}</strong>
              <span dir={country.localNameDirection ?? "ltr"}>{country.localName}</span>
            </span>
          </div>
        </>
      ) : null}

      <div className={styles.titleStack}>
        <p className={styles.engineLabel}>{engineLabel}</p>
        <h2>{country.englishName}</h2>
        <p className={styles.localName} dir={country.localNameDirection ?? "ltr"}>
          {country.localName}
        </p>
        <span className={styles.flagBadge} aria-label={`${country.englishName} flag`} />
      </div>

      {phase === "intro" && !isStoryVariant ? (
        <div className={styles.primaryActions}>
          <button type="button" onClick={onLearnMore}>
            Learn more
          </button>
          <button type="button" onClick={onNextCountry}>
            Next country
          </button>
        </div>
      ) : null}

      {phase === "fact" ? (
        <section className={styles.factCard} aria-label={`${country.englishName} position fact`}>
          {isStoryVariant ? (
            <span className={styles.storyIcon} aria-hidden="true">
              <i />
            </span>
          ) : null}
          <div className={styles.factCopy}>
            <p>{country.positionFact.eyebrow}</p>
            <h3>{country.positionFact.headline}</h3>
            <span>{country.positionFact.detail}</span>
          </div>
          {!isStoryVariant ? (
            <button type="button" onClick={onShowFlag}>
              Next
            </button>
          ) : null}
        </section>
      ) : null}

      {phase === "flag" ? (
        <section className={styles.flagStory} aria-label={`${country.englishName} flag meaning`}>
          <Suspense fallback={<div className={`${styles.largeFlag} ${styles.staticLargeFlag}`} aria-hidden="true" />}>
            <LazyWavingFlag
              accentColor={country.accentColor}
              animationRenderer={animationRenderer}
              className={styles.largeFlag}
              flagUrl={flagUrl}
            />
          </Suspense>
          <div className={styles.flagText}>
            {isStoryVariant ? (
              <span className={`${styles.storyIcon} ${styles.flagIcon}`} aria-hidden="true">
                <i />
              </span>
            ) : null}
            <div>
              <p>Flag meaning</p>
              <h3>{country.flagFact.headline}</h3>
              <span>{country.flagFact.detail}</span>
            </div>
          </div>
          <div className={styles.flagCallouts}>
            {country.flagFact.callouts.map((callout) => {
              const [calloutLead, ...calloutRest] = callout.label.split(":");
              const calloutDetail = calloutRest.join(":").trim();

              return (
                <span key={callout.label}>
                  <i style={{ background: callout.color }} />
                  <strong>{calloutDetail ? `${calloutLead}:` : calloutLead}</strong>
                  {calloutDetail ? <em>{calloutDetail}</em> : null}
                </span>
              );
            })}
          </div>
          {!isStoryVariant ? (
            <button type="button" onClick={onNextCountry}>
              Next country
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
