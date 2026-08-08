"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import type { JourneyCountry } from "../data/caribbeanCountries";
import styles from "./JourneyMap.module.css";

type CountryFlagOverlayProps = {
  country: JourneyCountry;
  currentIndex: number;
  totalCountries: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

function FlagSparkIcon() {
  return (
    <svg className={styles.flagSparkIcon} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3v7" />
      <path d="M16 22v7" />
      <path d="M3 16h7" />
      <path d="M22 16h7" />
      <path d="m6.8 6.8 5 5" />
      <path d="m20.2 20.2 5 5" />
      <path d="m25.2 6.8-5 5" />
      <path d="m11.8 20.2-5 5" />
      <circle cx="16" cy="16" r="3.5" />
    </svg>
  );
}

export function CountryFlagOverlay({
  country,
  currentIndex,
  totalCountries,
  onClose,
  onNext,
  onPrevious,
}: CountryFlagOverlayProps) {
  const [revealedColors, setRevealedColors] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const isLastCountry = currentIndex === totalCountries - 1;
  const nextLabel = isLastCountry ? "Restart" : "Next";

  return (
    <section
      className={styles.countryOverlay}
      aria-label={`${country.name} flag, ${currentIndex + 1} of ${totalCountries}`}
    >
      <div className={styles.countryHeader}>
        <div className={styles.progressGroup}>
          <p className={styles.progressText}>{currentIndex + 1} of {totalCountries}</p>
          <div className={styles.progressRail} aria-hidden="true">
            {Array.from({ length: totalCountries }, (_, index) => (
              <span
                key={index}
                className={styles.progressSegment}
                data-state={
                  index < currentIndex
                    ? "complete"
                    : index === currentIndex
                      ? "active"
                      : "pending"
                }
              >
                <i />
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={styles.countryClose}
          onClick={onClose}
          aria-label="Close Caribbean journey"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div className={styles.countryMapArea} />

      <div className={styles.countryInfoPanel}>
        <div className={styles.countryNameBlock}>
          <h1 className={styles.flagTitle}>{country.name}&apos;s flag</h1>
          <p className={styles.countrySubtitle}>
            {country.name}
            <span className={styles.subtitleDot} aria-hidden="true">·</span>
            {country.regionLabel}
          </p>
        </div>

        <div className={styles.flagStudyCard}>
          <Image
            className={styles.flagStudyImage}
            src={country.flagPath}
            alt={`${country.name} flag`}
            width={720}
            height={480}
            priority
            unoptimized
          />

          <div className={styles.flagFactRow}>
            <span className={styles.flagFactIcon} aria-hidden="true">
              <FlagSparkIcon />
            </span>
            <p>{country.flagFact.highlight}</p>
          </div>

          <p className={styles.flagInstruction}>Tap each color to reveal its meaning.</p>

          <div className={styles.flagColorGrid}>
            {country.flagFact.colors.map((color) => {
              const isRevealed = revealedColors.has(color.name);

              return (
                <button
                  key={color.name}
                  type="button"
                  className={styles.flagColorButton}
                  data-revealed={isRevealed}
                  onClick={() => {
                    setRevealedColors((previous) => {
                      const next = new Set(previous);
                      if (next.has(color.name)) {
                        next.delete(color.name);
                      } else {
                        next.add(color.name);
                      }
                      return next;
                    });
                  }}
                  aria-label={
                    isRevealed
                      ? `${color.name}: ${color.meaning}. Hide meaning`
                      : `${color.name}. Reveal meaning`
                  }
                >
                  <span className={styles.flagColorButtonInner}>
                    <span className={styles.flagColorFace} data-side="front">
                      <span
                        className={styles.flagColorSwatch}
                        style={{ "--flag-swatch": color.swatch } as CSSProperties}
                        aria-hidden="true"
                      />
                      <span>{color.name}</span>
                    </span>
                    <span className={styles.flagColorFace} data-side="back">
                      {color.meaning}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <nav className={styles.countryFooter} aria-label="Country navigation">
          <button
            type="button"
            className={styles.countryNavPrev}
            onClick={onPrevious}
            aria-label="Go to previous step"
          >
            <span className={styles.navChevron} data-direction="prev" aria-hidden="true" />
            Previous
          </button>

          <button
            type="button"
            className={styles.countryNavNext}
            onClick={onNext}
            aria-label={nextLabel}
          >
            {nextLabel}
            <span className={styles.navChevron} data-direction="next" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </section>
  );
}
