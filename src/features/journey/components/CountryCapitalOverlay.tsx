import type { CapitalIconType, JourneyCountry } from "../data/caribbeanCountries";
import styles from "./JourneyMap.module.css";

type CountryCapitalOverlayProps = {
  country: JourneyCountry;
  currentIndex: number;
  totalCountries: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

function MnemonicIcon({ icon }: { icon: CapitalIconType }) {
  if (icon === "crown") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 26h24" />
        <path d="M6 22 4 9l7.5 5.5L16 5l4.5 9.5L28 9l-2 13H6Z" />
      </svg>
    );
  }

  if (icon === "town") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M2 28h28" />
        <path d="M4 28V17h8v11" />
        <path d="M12 28V11h8v17" />
        <path d="M20 28V18h8v10" />
        <path d="M6 21h4M14 15h4M22 22h4" />
      </svg>
    );
  }

  if (icon === "bridge") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M2 22h28" />
        <path d="M2 22V17a14 14 0 0 1 28 0v5" />
        <path d="M11 22V17M21 22V17" />
      </svg>
    );
  }

  if (icon === "port") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="9" r="3" />
        <path d="M16 12v14" />
        <path d="M7 27c0-5 9-7 9-7s9 2 9 7" />
        <path d="M6 17h20" />
      </svg>
    );
  }

  if (icon === "cross") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 3v26" />
        <path d="M6 11h20" />
      </svg>
    );
  }

  if (icon === "sun") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="5" />
        <path d="M16 2v5M16 25v5M2 16h5M25 16h5" />
        <path d="M6.7 6.7l3.5 3.5M21.8 21.8l3.5 3.5M21.8 10.2l-3.5 3.5M10.2 21.8l-3.5 3.5" />
      </svg>
    );
  }

  if (icon === "rose") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="11" r="5" />
        <path d="M16 16v11" />
        <path d="M11 23l5-2 5 2" />
        <path d="M11 8a5 5 0 0 1 10 0" />
      </svg>
    );
  }

  if (icon === "water") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M2 14c3.5-4 7-4 10.5 0s7 4 10.5 0 7-4 9 0" />
        <path d="M2 21c3.5-4 7-4 10.5 0s7 4 10.5 0 7-4 9 0" />
      </svg>
    );
  }

  if (icon === "earth") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="12" />
        <path d="M4 16h24" />
        <path d="M16 4c-4 4-4 8 0 12s4 8 0 12" />
        <path d="M16 4c4 4 4 8 0 12s-4 8 0 12" />
      </svg>
    );
  }

  if (icon === "shield") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 3L4 8v10c0 6.5 5.5 10.5 12 13 6.5-2.5 12-6.5 12-13V8L16 3Z" />
      </svg>
    );
  }

  if (icon === "castle") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M3 28h26V14H3z" />
        <path d="M3 14V7h5v7M14 14V7h4v7M24 14V7h5v7" />
        <path d="M11 28v-9h10v9" />
      </svg>
    );
  }

  // palm
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 13v15" />
      <path d="M16 13c0 0 6-2 8 4" />
      <path d="M16 9c0 0-6-1-7 5" />
      <path d="M16 6c0 0 4-2 6 3" />
      <path d="M11 28h10" />
    </svg>
  );
}

export function CountryCapitalOverlay({
  country,
  currentIndex,
  totalCountries,
  onClose,
  onNext,
  onPrevious,
}: CountryCapitalOverlayProps) {
  const { capitalMnemonic } = country;

  return (
    <section
      className={styles.countryOverlay}
      aria-label={`Capital of ${country.name}: ${country.capital}, ${currentIndex + 1} of ${totalCountries}`}
    >
      {/* Row 1 — header */}
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

      {/* Row 3 — capital info panel */}
      <div className={styles.countryInfoPanel}>
        {/* Capital title */}
        <div className={styles.countryNameBlock}>
          <h1 className={styles.capitalTitle}>Capital: {country.capital}</h1>
          <p className={styles.countrySubtitle}>
            {country.name}
            <span className={styles.subtitleDot} aria-hidden="true">·</span>
            {country.regionLabel}
          </p>
        </div>

        {/* Mnemonic card */}
        <div className={styles.capitalMnemonicCard}>
          <div className={styles.capitalMnemonicText}>
            <p>
              {capitalMnemonic.intro}{" "}
              <span className={styles.capitalMnemonicEmphasis}>
                {capitalMnemonic.emphasis}
              </span>
            </p>
            <p className={styles.capitalMnemonicDetail}>{capitalMnemonic.detail}</p>
          </div>

          <div className={styles.capitalMnemonicVisual} aria-hidden="true">
            <div className={styles.capitalMnemonicParts}>
              <figure className={styles.capitalMnemonicPart}>
                <div className={styles.capitalMnemonicIcon}>
                  <MnemonicIcon icon={capitalMnemonic.icons[0]} />
                </div>
                <figcaption>{capitalMnemonic.parts[0]}</figcaption>
              </figure>
              <span className={styles.capitalMnemonicPlus}>+</span>
              <figure className={styles.capitalMnemonicPart}>
                <div className={styles.capitalMnemonicIcon}>
                  <MnemonicIcon icon={capitalMnemonic.icons[1]} />
                </div>
                <figcaption>{capitalMnemonic.parts[1]}</figcaption>
              </figure>
            </div>
            <div className={styles.capitalMnemonicBracket} />
            <p className={styles.capitalMnemonicResult}>= {country.capital.toUpperCase()}</p>
          </div>
        </div>

        {/* Navigation */}
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
            aria-label="Next"
          >
            Next
            <span className={styles.navChevron} data-direction="next" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </section>
  );
}
