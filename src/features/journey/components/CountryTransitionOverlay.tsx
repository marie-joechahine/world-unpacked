import { journeyTransitionDetails, type JourneyCountry } from "../data/caribbeanCountries";
import styles from "./JourneyMap.module.css";

type CountryTransitionOverlayProps = {
  fromCountry: JourneyCountry;
  toCountry: JourneyCountry;
  currentIndex: number;
  totalCountries: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

function CompassIcon() {
  return (
    <svg className={styles.transitionCompassIcon} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="25" />
      <path d="M32 10v6M32 48v6M10 32h6M48 32h6" />
      <path d="M45 19 36 41 19 45l9-22 17-4Z" />
      <path d="M28 23 36 41" />
    </svg>
  );
}

export function CountryTransitionOverlay({
  fromCountry,
  toCountry,
  currentIndex,
  totalCountries,
  onClose,
  onNext,
  onPrevious,
}: CountryTransitionOverlayProps) {
  const transition = journeyTransitionDetails(fromCountry, toCountry);
  const progressLabel = `${currentIndex + 1} of ${totalCountries}`;

  return (
    <section
      className={styles.transitionOverlay}
      aria-label={`Transition from ${fromCountry.name} to ${toCountry.name}`}
    >
      <div className={styles.transitionHeader}>
        <div className={styles.progressGroup}>
          <p className={styles.progressText}>{progressLabel}</p>
          <div className={styles.transitionProgressRail} aria-hidden="true">
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

      <div className={styles.transitionMapSpace} aria-hidden="true" />

      <div className={styles.transitionInfoPanel}>
        <div className={styles.transitionInsight}>
          <div className={styles.transitionInsightIcon} aria-hidden="true">
            <CompassIcon />
          </div>
          <p>{transition.insight}</p>
        </div>

        <nav className={styles.countryFooter} aria-label="Transition navigation">
          <button
            type="button"
            className={styles.countryNavPrev}
            onClick={onPrevious}
            aria-label={`Return to ${fromCountry.name}`}
          >
            <span className={styles.navChevron} data-direction="prev" aria-hidden="true" />
            Previous
          </button>

          <button
            type="button"
            className={styles.countryNavNext}
            onClick={onNext}
            aria-label={`Continue to ${toCountry.name}`}
          >
            Next
            <span className={styles.navChevron} data-direction="next" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </section>
  );
}
