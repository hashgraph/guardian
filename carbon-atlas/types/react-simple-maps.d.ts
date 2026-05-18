declare module "react-simple-maps" {
  import { ComponentType, ReactNode } from "react"

  interface ComposableMapProps {
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    className?: string
    children?: ReactNode
  }
  export const ComposableMap: ComponentType<ComposableMapProps>

  interface GeographiesProps {
    geography: string | Record<string, unknown>
    children: (data: { geographies: GeographyType[] }) => ReactNode
  }
  export const Geographies: ComponentType<GeographiesProps>

  interface GeographyType {
    rsmKey: string
    id: string
    properties: Record<string, string>
  }

  interface GeographyProps {
    geography: GeographyType
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
    onMouseEnter?: (e: React.MouseEvent) => void
    onMouseLeave?: (e: React.MouseEvent) => void
    className?: string
  }
  export const Geography: ComponentType<GeographyProps>

  interface SphereProps {
    stroke?: string
    strokeWidth?: number
    fill?: string
    id?: string
  }
  export const Sphere: ComponentType<SphereProps>

  interface GraticuleProps {
    stroke?: string
    strokeWidth?: number
  }
  export const Graticule: ComponentType<GraticuleProps>

  interface ZoomableGroupProps {
    center?: [number, number]
    zoom?: number
    children?: ReactNode
  }
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>
}
