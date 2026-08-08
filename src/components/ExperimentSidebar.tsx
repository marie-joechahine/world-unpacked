"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./ExperimentSidebar.module.css";

const EXPERIMENTS = [
  {
    path: "",
    eyebrow: "MapLibre",
    title: "Tile Lab",
    description: "Satellite, terrain, flags, hover overlays, and R3F effects.",
  },
  {
    path: "/mapbox",
    eyebrow: "Mapbox",
    title: "GL JS Lab",
    description: "Basemap styles, weather, terrain, camera presets, and route layers.",
  },
  {
    path: "/three",
    eyebrow: "Three.js",
    title: "3D Sandbox",
    description: "React Three Fiber scenes, shaders, geometry, and camera controls.",
  },
  {
    path: "/country",
    eyebrow: "Country Data",
    title: "Country Cards",
    description: "Live country facts, flags, and Wikimedia place imagery.",
  },
] as const;

function isActiveRoute(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function experimentHref(basePath: string, path: string) {
  const normalizedBasePath = basePath === "/" ? "" : basePath.replace(/\/$/, "");
  const href = `${normalizedBasePath}${path}`;
  return href || "/";
}

type ExperimentSidebarProps = {
  basePath?: string;
};

export function ExperimentSidebar({ basePath = "" }: ExperimentSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen(true)}
        aria-controls="experiment-navigation"
        aria-expanded={open}
      >
        Menu
      </button>

      {open ? (
        <button
          type="button"
          className={styles.scrim}
          onClick={() => setOpen(false)}
          aria-label="Dismiss experiment navigation"
        />
      ) : null}

      {open ? (
        <aside
          id="experiment-navigation"
          className={styles.sidebar}
          data-open={open}
          aria-label="Experiment navigation"
        >
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              WU
            </span>
            <div>
              <p className={styles.kicker}>World Unpacked</p>
              <h1>Experiments</h1>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setOpen(false)}
              aria-label="Close experiment navigation"
            >
              Close
            </button>
          </div>

          <nav className={styles.nav} aria-label="Experiments">
            {EXPERIMENTS.map((experiment) => {
              const href = experimentHref(basePath, experiment.path);
              const active = isActiveRoute(pathname, href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={styles.navLink}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.navEyebrow}>{experiment.eyebrow}</span>
                  <span className={styles.navTitle}>{experiment.title}</span>
                  <span className={styles.navDescription}>{experiment.description}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
      ) : null}
    </>
  );
}
