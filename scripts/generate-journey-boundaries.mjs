import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const COUNTRIES = [
  ["ATG", "Antigua and Barbuda"],
  ["BHS", "The Bahamas"],
  ["BRB", "Barbados"],
  ["CUB", "Cuba"],
  ["DMA", "Dominica"],
  ["DOM", "Dominican Republic"],
  ["GRD", "Grenada"],
  ["HTI", "Haiti"],
  ["JAM", "Jamaica"],
  ["KNA", "Saint Kitts and Nevis"],
  ["LCA", "Saint Lucia"],
  ["VCT", "Saint Vincent and the Grenadines"],
  ["TTO", "Trinidad and Tobago"],
];

const GEBOUNDARIES_API_BASE = "https://www.geoboundaries.org/api/current";
const OUTPUT_DIR = path.join("public", "data", "journey");
const PRECISION = 5;
const SOURCE_OVERRIDES = {
  BHS: "gbHumanitarian",
};
const SIMPLIFY_TOLERANCE_BY_ALPHA3 = {
  BHS: 0.0004,
};

function roundNumber(value) {
  return Number(value.toFixed(PRECISION));
}

function normalizePosition(position) {
  return [roundNumber(position[0]), roundNumber(position[1])];
}

function closeRing(ring) {
  if (ring.length === 0) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }

  return [...ring, first];
}

function squaredSegmentDistance(position, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((position[0] - x) * dx + (position[1] - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = position[0] - x;
  dy = position[1] - y;

  return dx * dx + dy * dy;
}

function simplifyRing(ring, tolerance) {
  if (!tolerance || ring.length <= 4) {
    return ring;
  }

  const isClosed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const sourceRing = isClosed ? ring.slice(0, -1) : ring;
  const squaredTolerance = tolerance * tolerance;
  const keep = new Uint8Array(sourceRing.length);
  const stack = [[0, sourceRing.length - 1]];

  keep[0] = 1;
  keep[sourceRing.length - 1] = 1;

  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let maxSquaredDistance = 0;
    let index = 0;

    for (let i = first + 1; i < last; i += 1) {
      const squaredDistance = squaredSegmentDistance(sourceRing[i], sourceRing[first], sourceRing[last]);

      if (squaredDistance > maxSquaredDistance) {
        index = i;
        maxSquaredDistance = squaredDistance;
      }
    }

    if (maxSquaredDistance > squaredTolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  const simplifiedRing = sourceRing.filter((_, index) => keep[index]);
  return isClosed ? [...simplifiedRing, simplifiedRing[0]] : simplifiedRing;
}

function polygonExteriorRings(geometry) {
  if (!geometry) {
    return [];
  }

  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((polygon) => polygon[0])
      .filter(Boolean);
  }

  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(polygonExteriorRings);
  }

  return [];
}

function updateBounds(bounds, position) {
  bounds[0] = Math.min(bounds[0], position[0]);
  bounds[1] = Math.min(bounds[1], position[1]);
  bounds[2] = Math.max(bounds[2], position[0]);
  bounds[3] = Math.max(bounds[3], position[1]);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "world-unpacked/0.1 journey boundary generator",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function buildCountryBoundary(alpha3, name) {
  const sourceSet = SOURCE_OVERRIDES[alpha3] ?? "gbOpen";
  const metadata = await fetchJson(`${GEBOUNDARIES_API_BASE}/${sourceSet}/${alpha3}/ADM0/`);
  const geojson = await fetchJson(metadata.gjDownloadURL);
  const rings = geojson.features.flatMap((feature) => polygonExteriorRings(feature.geometry));
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const simplifyTolerance = SIMPLIFY_TOLERANCE_BY_ALPHA3[alpha3] ?? 0;

  const exteriorRings = rings
    .map((ring) => closeRing(simplifyRing(ring, simplifyTolerance).map(normalizePosition)))
    .filter((ring) => ring.length >= 4);

  exteriorRings.forEach((ring) => {
    ring.forEach((position) => updateBounds(bounds, position));
  });

  const properties = {
    alpha3,
    name,
    boundaryID: metadata.boundaryID,
    boundaryYear: metadata.boundaryYearRepresented,
    boundarySource: metadata.boundarySource,
    boundaryLicense: metadata.boundaryLicense,
    licenseSource: metadata.licenseSource,
    sourceSet,
  };

  return {
    outlineFeature: {
      type: "Feature",
      properties,
      geometry: {
        type: "MultiLineString",
        coordinates: exteriorRings,
      },
    },
    metadata: {
      ...properties,
      bounds: bounds.map(roundNumber),
      downloadURL: metadata.gjDownloadURL,
    },
  };
}

const countryBoundaries = [];
for (const [alpha3, name] of COUNTRIES) {
  countryBoundaries.push(await buildCountryBoundary(alpha3, name));
  console.log(`Fetched ${alpha3}`);
}

await mkdir(OUTPUT_DIR, { recursive: true });

await writeFile(
  path.join(OUTPUT_DIR, "caribbean-country-outlines.geojson"),
  `${JSON.stringify({
    type: "FeatureCollection",
    features: countryBoundaries.map((country) => country.outlineFeature),
  })}\n`,
);

await writeFile(
  path.join(OUTPUT_DIR, "caribbean-country-boundaries-metadata.json"),
  `${JSON.stringify(
    {
      source: "geoBoundaries gbOpen ADM0",
      sourceURL: "https://www.geoboundaries.org/",
      apiURL: "https://www.geoboundaries.org/api.html",
      license: "CC BY 4.0 compatible gbOpen; see per-boundary metadata.",
      precision: PRECISION,
      countries: countryBoundaries.map((country) => country.metadata),
    },
    null,
    2,
  )}\n`,
);

await writeFile(
  path.join(OUTPUT_DIR, "SOURCES.md"),
  [
    "# Journey Boundary Sources",
    "",
    "Country intro boundaries are generated from geoBoundaries gbOpen ADM0 single-country GeoJSON files.",
    "",
    "- Dataset: geoBoundaries Global Database of Political Administrative Boundaries",
    "- API: https://www.geoboundaries.org/api.html",
    "- Project: https://www.geoboundaries.org/",
    "- Release type: gbOpen",
    "- Boundary level: ADM0",
    "",
    "The generated app files keep only exterior rings for each country. This avoids low-zoom vector-tile seams and renders a clean land outline for country intro mode.",
  ].join("\n") + "\n",
);
