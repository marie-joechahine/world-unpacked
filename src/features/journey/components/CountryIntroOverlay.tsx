import Image from "next/image";
import type { JourneyCountry } from "../data/caribbeanCountries";
import styles from "./JourneyMap.module.css";

type CountryIntroOverlayProps = {
  country: JourneyCountry;
  currentIndex: number;
  totalCountries: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

function CapitalIcon() {
  return (
    <svg
      className={styles.capitalIcon}
      viewBox="0 0 32 32"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M7 27h18" />
      <path d="M9 24h14" />
      <path d="M11 24V14h10v10" />
      <path d="M9 14h14" />
      <path d="M12 14a4 4 0 0 1 8 0" />
      <path d="M14 24v-8M18 24v-8" />
    </svg>
  );
}

function IslandIcon() {
  return (
    <svg
      className={styles.islandIcon}
      viewBox="0 0 32 32"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M16 5v14" />
      <path d="M16 5c0 0 4-1 6 3" />
      <path d="M16 9c0 0-4-1-5 4" />
      <ellipse cx="16" cy="22" rx="9" ry="3.5" />
      <path d="M7 22c-2 1-3 2.5-3 4h24c0-1.5-1-3-3-4" />
      <path d="M10 26h12" />
    </svg>
  );
}

export function CountryIntroOverlay({
  country,
  currentIndex,
  totalCountries,
  onClose,
  onNext,
  onPrevious,
}: CountryIntroOverlayProps) {
  const isFirstCountry = currentIndex === 0;
  const isLastCountry = currentIndex === totalCountries - 1;
  const nextLabel = isLastCountry ? "Restart" : "Next";

  return (
    <section
      className={styles.countryOverlay}
      aria-label={`${country.name}, ${currentIndex + 1} of ${totalCountries}`}
    >
      {/* Row 1 — header: counter + progress bar + close */}
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

      {/* Row 2 — transparent map area */}
      <div className={styles.countryMapArea} />

      {/* Row 3 — country info panel */}
      <div className={styles.countryInfoPanel}>
        {/* Name + subtitle */}
        <div className={styles.countryNameBlock}>
          <h1 className={styles.countryName}>{country.name}</h1>
          <p className={styles.countrySubtitle}>
            {country.regionLabel}
            {country.islandTag ? (
              <>
                <span className={styles.subtitleDot} aria-hidden="true">·</span>
                <span className={styles.islandTag}>{country.islandTag}</span>
              </>
            ) : null}
          </p>
        </div>

        {/* Flag + capital card */}
        <div className={styles.countryMetaCard}>
          <div className={styles.metaFlagWrap}>
            <Image
              className={styles.countryFlagLarge}
              src={country.flagPath}
              alt={`${country.name} flag`}
              width={120}
              height={80}
              priority
              unoptimized
            />
          </div>
          <span className={styles.metaCardDivider} aria-hidden="true" />
          <div className={styles.metaCapitalWrap}>
            <CapitalIcon />
            <span>{country.capital}</span>
          </div>
        </div>

        {/* Description card */}
        <div className={styles.countryDescCard}>
          <span className={styles.descCardIcon} aria-hidden="true">
            <IslandIcon />
          </span>
          <p className={styles.countryIntroLine}>{country.introLine}</p>
        </div>

        {/* Navigation */}
        <nav className={styles.countryFooter} aria-label="Country navigation">
          <button
            type="button"
            className={styles.countryNavPrev}
            onClick={onPrevious}
            disabled={isFirstCountry}
            aria-label="Go to previous country"
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
