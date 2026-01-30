"use client"

import { Upload, ImageIcon, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Asset } from "@/lib/storyboard-types"

interface AssetLibraryProps {
  assets: Asset[]
  onAssetClick: (asset: Asset) => void
  onUpload: () => void
  onDeleteAsset?: (id: string) => void
}

export function AssetLibrary({ assets, onAssetClick, onUpload, onDeleteAsset }: AssetLibraryProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-sidebar-foreground">Assets</h2>
      </div>

      <div className="p-3">
        <Button
          variant="outline"
          className="w-full gap-2 bg-transparent"
          onClick={onUpload}
        >
          <Upload className="size-4" />
          Upload Assets
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 p-3">
          {assets.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ImageIcon className="mb-2 size-8 opacity-50" />
              <p className="text-center text-xs">No assets yet</p>
            </div>
          ) : (
            assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted transition-all hover:border-primary hover:ring-2 hover:ring-primary/20"
              >
                <button
                  onClick={() => onAssetClick(asset)}
                  className="size-full"
                >
                  <img
                    src={asset.thumbnail || "/placeholder.svg"}
                    alt={asset.name}
                    className="size-full object-cover"
                  />
                </button>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-xs text-foreground">{asset.name}</p>
                </div>

                {onDeleteAsset && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteAsset(asset.id)
                    }}
                    className="absolute right-1 top-1 rounded-sm bg-black/50 p-1 text-white opacity-0 hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                    title="Delete Asset"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
