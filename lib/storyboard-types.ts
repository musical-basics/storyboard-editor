export interface PlacedAsset {
  id: string
  assetUrl: string
  filename: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  layerOrder: number
  animationStyle?: string
}

export interface Stage {
  id: string
  name: string
  placedAssets: PlacedAsset[]
}

export interface Storyboard {
  stages: Stage[]
  activeStageId: string
}

export interface Asset {
  id: string
  url: string
  name: string
  filename: string
  thumbnail: string
}
