# Journey Boundary Sources

Country intro boundaries are generated from geoBoundaries gbOpen ADM0 single-country GeoJSON files.

- Dataset: geoBoundaries Global Database of Political Administrative Boundaries
- API: https://www.geoboundaries.org/api.html
- Project: https://www.geoboundaries.org/
- Release type: gbOpen
- Boundary level: ADM0

The generated app files keep only exterior rings for each country. This avoids low-zoom vector-tile seams and renders a clean land outline for country intro mode.
