"use client"

import React from "react"

import { useCallback, useState, useRef } from "react"
import { Play, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AssetLibrary } from "./asset-library"
import { Canvas } from "./canvas"
import { Timeline } from "./timeline"
import type {
  Asset,
  PlacedAsset,
  Stage,
  Storyboard,
} from "@/lib/storyboard-types"

// Sample assets for demonstration
const SAMPLE_ASSETS: Asset[] = [
  {
    id: "asset-1",
    url: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop",
    name: "Dog",
    filename: "dog.jpg",
    thumbnail: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=100&h=100&fit=crop",
  },
  {
    id: "asset-2",
    url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop",
    name: "Cat",
    filename: "cat.jpg",
    thumbnail: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&h=100&fit=crop",
  },
  {
    id: "asset-3",
    url: "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=400&fit=crop",
    name: "Puppy",
    filename: "puppy.jpg",
    thumbnail: "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=100&h=100&fit=crop",
  },
  {
    id: "asset-4",
    url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop",
    name: "Golden Retriever",
    filename: "golden-retriever.jpg",
    thumbnail: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100&h=100&fit=crop",
  },
  {
    id: "asset-5",
    url: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop",
    name: "Kitten",
    filename: "kitten.jpg",
    thumbnail: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=100&h=100&fit=crop",
  },
  {
    id: "asset-6",
    url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    name: "Fluffy Dog",
    filename: "fluffy-dog.jpg",
    thumbnail: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=100&h=100&fit=crop",
  },
]

const createInitialStage = (): Stage => ({
  id: `stage-${Date.now()}`,
  name: "Initial",
  placedAssets: [],
})

export function StoryboardEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<Asset[]>(SAMPLE_ASSETS)
  const [storyboard, setStoryboard] = useState<Storyboard>(() => {
    const initialStage = createInitialStage()
    return {
      stages: [initialStage],
      activeStageId: initialStage.id,
    }
  })
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)

  const activeStage = storyboard.stages.find(
    (s) => s.id === storyboard.activeStageId
  )

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      if (!activeStage) return

      const newPlacedAsset: PlacedAsset = {
        id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        assetUrl: asset.url,
        filename: asset.filename,
        x: 360 / 2 - 60, // Center of artboard
        y: 640 / 2 - 60,
        width: 120,
        height: 120,
        rotation: 0,
        layerOrder: activeStage.placedAssets.length,
      }

      setStoryboard((prev) => ({
        ...prev,
        stages: prev.stages.map((stage) =>
          stage.id === prev.activeStageId
            ? { ...stage, placedAssets: [...stage.placedAssets, newPlacedAsset] }
            : stage
        ),
      }))

      setSelectedAssetId(newPlacedAsset.id)
    },
    [activeStage]
  )

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        const newAsset: Asset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url,
          name: file.name.replace(/\.[^/.]+$/, ""),
          filename: file.name,
          thumbnail: url,
        }
        setAssets((prev) => [...prev, newAsset])
      }
    })

    e.target.value = ""
  }, [])

  const handleUpdateAsset = useCallback(
    (id: string, updates: Partial<PlacedAsset>) => {
      setStoryboard((prev) => ({
        ...prev,
        stages: prev.stages.map((stage) =>
          stage.id === prev.activeStageId
            ? {
              ...stage,
              placedAssets: stage.placedAssets.map((asset) =>
                asset.id === id ? { ...asset, ...updates } : asset
              ),
            }
            : stage
        ),
      }))
    },
    []
  )

  const handleDeleteAsset = useCallback((id: string) => {
    setStoryboard((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === prev.activeStageId
          ? {
            ...stage,
            placedAssets: stage.placedAssets.filter((asset) => asset.id !== id),
          }
          : stage
      ),
    }))
    setSelectedAssetId(null)
  }, [])

  const handleSelectStage = useCallback((id: string) => {
    setStoryboard((prev) => ({ ...prev, activeStageId: id }))
    setSelectedAssetId(null)
  }, [])

  const handleAddStage = useCallback(() => {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${storyboard.stages.length + 1}`,
      placedAssets: [],
    }

    setStoryboard((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
      activeStageId: newStage.id,
    }))
    setSelectedAssetId(null)
  }, [storyboard.stages.length])

  const handleDuplicateStage = useCallback(() => {
    if (!activeStage) return

    const duplicatedAssets = activeStage.placedAssets.map((asset) => ({
      ...asset,
      id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }))

    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      name: `${activeStage.name} (copy)`,
      placedAssets: duplicatedAssets,
    }

    setStoryboard((prev) => {
      const currentIndex = prev.stages.findIndex(
        (s) => s.id === prev.activeStageId
      )
      const newStages = [...prev.stages]
      newStages.splice(currentIndex + 1, 0, newStage)
      return {
        ...prev,
        stages: newStages,
        activeStageId: newStage.id,
      }
    })
    setSelectedAssetId(null)
  }, [activeStage])

  const handleDeleteStage = useCallback(
    (id: string) => {
      if (storyboard.stages.length <= 1) return

      setStoryboard((prev) => {
        const newStages = prev.stages.filter((s) => s.id !== id)
        const newActiveId =
          prev.activeStageId === id ? newStages[0].id : prev.activeStageId
        return {
          ...prev,
          stages: newStages,
          activeStageId: newActiveId,
        }
      })
      setSelectedAssetId(null)
    },
    [storyboard.stages.length]
  )

  const handleExport = useCallback(() => {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      artboard: {
        width: 360,
        height: 640,
      },
      stages: storyboard.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        assets: stage.placedAssets.map((asset) => ({
          id: asset.id,
          assetUrl: asset.assetUrl,
          filename: asset.filename,
          position: { x: asset.x, y: asset.y },
          size: { width: asset.width, height: asset.height },
          rotation: asset.rotation,
          layerOrder: asset.layerOrder,
        })),
      })),
    }

    console.log("Storyboard Export:", exportData)

    // Create downloadable file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `storyboard-export-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    URL.revokeObjectURL(url)
  }, [storyboard])

  const handleGenerateVideo = useCallback(async () => {
    setIsRendering(true)
    setGeneratedVideoUrl(null)

    // Prepare export data (same as export)
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      artboard: {
        width: 360,
        height: 640,
      },
      stages: storyboard.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        assets: stage.placedAssets.map((asset) => ({
          id: asset.id,
          assetUrl: asset.assetUrl,
          filename: asset.filename,
          position: { x: asset.x, y: asset.y },
          size: { width: asset.width, height: asset.height },
          rotation: asset.rotation,
          layerOrder: asset.layerOrder,
          animationStyle: asset.animationStyle, // Ensure this is included
        })),
      })),
    }

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedVideoUrl(`${data.videoUrl}?t=${Date.now()}`) // Cache bust
      } else {
        console.error("Render failed:", data.error)
        alert(`Render failed: ${data.error}`)
      }
    } catch (error) {
      console.error("Render error:", error)
      alert("Render failed. Check console.")
    } finally {
      setIsRendering(false)
    }
  }, [storyboard])

  const handleRemoveAssetFromLibrary = useCallback((id: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== id))
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <svg
              className="size-4 text-primary-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-card-foreground">
            Storyboard Editor
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleGenerateVideo}
            disabled={isRendering}
            className="gap-2"
          >
            {isRendering ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
            {isRendering ? "Rendering..." : "Generate Video"}
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Delete
            </kbd>
            <span>to remove selected</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Left Sidebar */}
        <AssetLibrary
          assets={assets}
          onAssetClick={handleAssetClick}
          onUpload={handleUpload}
          onDeleteAsset={handleRemoveAssetFromLibrary}
        />

        {/* Center Canvas */}
        <Canvas
          placedAssets={activeStage?.placedAssets || []}
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedAssetId}
          onUpdateAsset={handleUpdateAsset}
          onDeleteAsset={handleDeleteAsset}
        />
      </div>

      {/* Bottom Timeline */}
      <Timeline
        stages={storyboard.stages}
        activeStageId={storyboard.activeStageId}
        onSelectStage={handleSelectStage}
        onAddStage={handleAddStage}
        onDuplicateStage={handleDuplicateStage}
        onDeleteStage={handleDeleteStage}
        onExport={handleExport}
        storyboard={storyboard}
      />

      {/* Video Preview Modal */}
      {generatedVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Rendered Video</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setGeneratedVideoUrl(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="bg-black p-4">
              <video
                src={generatedVideoUrl}
                controls
                autoPlay
                className="max-h-[70vh] w-auto rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
