declare module "react-simple-maps" {
  import type { ComponentType, ReactElement, SVGProps } from "react";

  export type GeographyObject = {
    rsmKey: string;
    properties: Record<string, unknown>;
  };

  export type ComposableMapProps = SVGProps<SVGSVGElement> & {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
  };

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<{
    geography: string | Record<string, unknown>;
    children: (props: { geographies: GeographyObject[] }) => ReactElement | ReactElement[];
  }>;
  export const Geography: ComponentType<
    SVGProps<SVGPathElement> & {
      geography: GeographyObject;
      tabIndex?: number;
    }
  >;
}
