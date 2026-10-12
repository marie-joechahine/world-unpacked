import { geoEqualEarth } from "d3";

export const MAP_VIEW_BOX = "0 0 980 560";
export const MAP_WIDTH = 980;
export const MAP_HEIGHT = 560;

export const projectionConfig = {
  scale: 182,
  center: [10, 4] as [number, number],
  rotate: [0, 0, 0] as [number, number, number]
};

export function createEqualEarthProjection() {
  return geoEqualEarth()
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
    .scale(projectionConfig.scale)
    .center(projectionConfig.center);
}
