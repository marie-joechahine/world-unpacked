import type { CSSProperties } from "react";
import type { JourneyRegion } from "../data/regions";
import styles from "./JourneyMap.module.css";

type RegionBottomPanelProps = {
  selectedRegion: JourneyRegion | null;
  onStartRegion: () => void;
  onChooseAnother: () => void;
};

// ── Inline SVG icons ────────────────────────────────────────────────────────

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" />
      <ellipse cx="24" cy="24" rx="9" ry="20" />
      <line x1="4" y1="24" x2="44" y2="24" />
      <path d="M5.5 15 Q24 19 42.5 15" />
      <path d="M5.5 33 Q24 29 42.5 33" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="2,6 5,9 10,3" />
    </svg>
  );
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
        fill="currentColor"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function CapitalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 22h18" />
      <path d="M5 18 3 7l8 5.5L16 5l5 2-2 11H5z" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 22V4" />
      <path d="M4 4l16 5-16 5" />
    </svg>
  );
}

function NeighborIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M17 14.5c2.5 0 4 1.8 4 4.5" />
    </svg>
  );
}

const REGION_FEATURES = [
  { icon: <LocationIcon />, label: "Location\non map" },
  { icon: <CapitalIcon />, label: "Capital\ncities" },
  { icon: <FlagIcon />, label: "Flags\nto learn" },
  { icon: <NeighborIcon />, label: "Neighbor\nclues" },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export function RegionBottomPanel({
  selectedRegion,
  onStartRegion,
  onChooseAnother,
}: RegionBottomPanelProps) {
  const isAvailable = selectedRegion?.name === "Caribbean";

  return (
    <section
      className={`${styles.bottomPanel} ${selectedRegion ? styles.selectedPanel : styles.defaultPanel}`}
      aria-live="polite"
    >
      <span className={styles.panelHandle} aria-hidden="true" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.panelHeader}>
        <h2 className={styles.panelHeading}>Where should your journey begin?</h2>
        <p className={styles.panelSubtitle}>
          Tap a region to <em>preview</em> the countries.
        </p>
      </div>

      {/* ── Region preview card ─────────────────────────────────────────── */}
      {selectedRegion && (
        <>
          <div className={styles.regionPreviewCard}>
            {/* Thumbnail */}
            <div
              className={styles.regionThumbnail}
              style={{ "--region-thumb-color": selectedRegion.color } as CSSProperties}
              role="img"
              aria-label={`${selectedRegion.name} region`}
            >
              <GlobeIcon className={styles.regionThumbnailGlobe} />
            </div>

            {/* Info */}
            <div className={styles.regionPreviewInfo}>
              <div className={styles.regionPreviewNameRow}>
                <span className={styles.regionPreviewName}>{selectedRegion.name}</span>
                <span className={styles.selectedBadge}>
                  <CheckIcon />
                  Selected
                </span>
              </div>
              <p className={styles.regionPreviewMeta}>
                {selectedRegion.displayCountryCount} countries
                <span className={styles.metaDot} aria-hidden="true"> · </span>
                {selectedRegion.regionType}
              </p>
              <p className={styles.regionPreviewDesc}>{selectedRegion.description}</p>
            </div>
          </div>

          {/* ── Feature icons ──────────────────────────────────────────── */}
          <div className={styles.regionFeatureRow} role="list" aria-label="What you'll learn">
            {REGION_FEATURES.map(({ icon, label }) => (
              <div key={label} className={styles.regionFeature} role="listitem">
                <span className={styles.regionFeatureIcon}>{icon}</span>
                <span className={styles.regionFeatureLabel}>{label}</span>
              </div>
            ))}
          </div>

          {/* ── CTA ────────────────────────────────────────────────────── */}
          <button
            type="button"
            className={styles.primaryCta}
            onClick={onStartRegion}
            disabled={!isAvailable}
            aria-label={
              isAvailable
                ? `Start ${selectedRegion.name} journey`
                : `${selectedRegion.name} journey coming soon`
            }
          >
            <CompassIcon className={styles.primaryCtaCompass} />
            Start {selectedRegion.name} Journey
            <span className={styles.primaryCtaArrow} aria-hidden="true">›</span>
          </button>

          {/* ── Secondary action ───────────────────────────────────────── */}
          <button
            type="button"
            className={styles.chooseAnotherBtn}
            onClick={onChooseAnother}
          >
            Choose another region
          </button>
        </>
      )}
    </section>
  );
}
