"use client"

import React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import { Trash2, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlacedAsset } from "@/lib/storyboard-types"

interface CanvasProps {
  placedAssets: PlacedAsset[]
  selectedAssetId: string | null
  onSelectAsset: (id: string | null) => void
  onUpdateAsset: (id: string, updates: Partial<PlacedAsset>) => void
  onDeleteAsset: (id: string) => void
}

const ARTBOARD_WIDTH = 360
const ARTBOARD_HEIGHT = 640

export function Canvas({
  placedAssets,
  selectedAssetId,
  onSelectAsset,
  onUpdateAsset,
  onDeleteAsset,
}: CanvasProps) {
  const artboardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeCorner, setResizeCorner] = useState<string | null>(null)
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 })
  const [startMouse, setStartMouse] = useState({ x: 0, y: 0 })

  const selectedAsset = placedAssets.find((a) => a.id === selectedAssetId)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, assetId: string) => {
      e.stopPropagation()
      if (artboardRef.current) {
        const rect = artboardRef.current.getBoundingClientRect()
        const asset = placedAssets.find((a) => a.id === assetId)
        if (asset) {
          setDragOffset({
            x: e.clientX - rect.left - asset.x,
            y: e.clientY - rect.top - asset.y,
          })
          setIsDragging(true)
          onSelectAsset(assetId)
        }
      }
    },
    [placedAssets, onSelectAsset]
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.stopPropagation()
      if (selectedAsset) {
        setIsResizing(true)
        setResizeCorner(corner)
        setInitialSize({ width: selectedAsset.width, height: selectedAsset.height })
        setInitialPos({ x: selectedAsset.x, y: selectedAsset.y })
        setStartMouse({ x: e.clientX, y: e.clientY })
      }
    },
    [selectedAsset]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && selectedAssetId && artboardRef.current) {
        const rect = artboardRef.current.getBoundingClientRect()
        const newX = e.clientX - rect.left - dragOffset.x
        const newY = e.clientY - rect.top - dragOffset.y

        // Clamp within artboard bounds
        const asset = placedAssets.find((a) => a.id === selectedAssetId)
        if (asset) {
          const clampedX = Math.max(0, Math.min(ARTBOARD_WIDTH - asset.width, newX))
          const clampedY = Math.max(0, Math.min(ARTBOARD_HEIGHT - asset.height, newY))
          onUpdateAsset(selectedAssetId, { x: clampedX, y: clampedY })
        }
      }

      if (isResizing && selectedAssetId && resizeCorner) {
        const deltaX = e.clientX - startMouse.x
        const deltaY = e.clientY - startMouse.y

        let newWidth = initialSize.width
        let newHeight = initialSize.height
        let newX = initialPos.x
        let newY = initialPos.y

        const aspectRatio = initialSize.width / initialSize.height

        switch (resizeCorner) {
          case "se":
            newWidth = Math.max(30, initialSize.width + deltaX)
            newHeight = newWidth / aspectRatio
            break
          case "sw":
            newWidth = Math.max(30, initialSize.width - deltaX)
            newHeight = newWidth / aspectRatio
            newX = initialPos.x + (initialSize.width - newWidth)
            break
          case "ne":
            newWidth = Math.max(30, initialSize.width + deltaX)
            newHeight = newWidth / aspectRatio
            newY = initialPos.y + (initialSize.height - newHeight)
            break
          case "nw":
            newWidth = Math.max(30, initialSize.width - deltaX)
            newHeight = newWidth / aspectRatio
            newX = initialPos.x + (initialSize.width - newWidth)
            newY = initialPos.y + (initialSize.height - newHeight)
            break
        }

        onUpdateAsset(selectedAssetId, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        })
      }
    },
    [isDragging, isResizing, selectedAssetId, dragOffset, placedAssets, onUpdateAsset, resizeCorner, startMouse, initialSize, initialPos]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeCorner(null)
  }, [])

  const handleCanvasClick = useCallback(() => {
    onSelectAsset(null)
  }, [onSelectAsset])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Backspace" || e.key === "Delete") && selectedAssetId) {
        e.preventDefault()
        onDeleteAsset(selectedAssetId)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedAssetId, onDeleteAsset])

  const handleRotate = useCallback(() => {
    if (selectedAssetId && selectedAsset) {
      onUpdateAsset(selectedAssetId, {
        rotation: (selectedAsset.rotation + 45) % 360,
      })
    }
  }, [selectedAssetId, selectedAsset, onUpdateAsset])

  const sortedAssets = [...placedAssets].sort((a, b) => a.layerOrder - b.layerOrder)

  return (
    <div
      className="flex flex-1 flex-col bg-background"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Artboard: {ARTBOARD_WIDTH} × {ARTBOARD_HEIGHT}
          </span>
        </div>

        {selectedAssetId && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRotate}
              title="Rotate 45°"
            >
              <RotateCw className="size-4" />
            </Button>

            <div className="w-[140px]">
              <select
                className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                value={selectedAsset?.animationStyle || "fade_in"}
                onChange={(e) => onUpdateAsset(selectedAssetId, { animationStyle: e.target.value })}
              >
                <option value="fade_in">Fade In</option>
                <option value="slide_from_bottom">Slide Up</option>
                <option value="slide_from_side">Slide Side</option>
                <option value="scale_up">Scale Up</option>
                <option value="wipe_reveal">Wipe Reveal</option>
              </select>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDeleteAsset(selectedAssetId)}
              title="Delete (Backspace)"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-auto bg-muted/30"
        onClick={handleCanvasClick}
      >
        {/* Artboard */}
        <div
          ref={artboardRef}
          className="relative bg-white shadow-2xl"
          style={{
            width: ARTBOARD_WIDTH,
            height: ARTBOARD_HEIGHT,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, #ccc 1px, transparent 1px),
                linear-gradient(to bottom, #ccc 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
            }}
          />

          {/* Placed Assets */}
          {sortedAssets.map((asset) => (
            <div
              key={asset.id}
              className={`absolute cursor-move select-none ${asset.id === selectedAssetId
                ? "ring-2 ring-primary ring-offset-2 ring-offset-white"
                : ""
                }`}
              style={{
                left: asset.x,
                top: asset.y,
                width: asset.width,
                height: asset.height,
                transform: `rotate(${asset.rotation}deg)`,
                zIndex: asset.layerOrder,
              }}
              onMouseDown={(e) => handleMouseDown(e, asset.id)}
            >
              <img
                src={asset.assetUrl || "/placeholder.svg"}
                alt=""
                className="pointer-events-none size-full object-contain"
                draggable={false}
              />

              {/* Resize handles */}
              {asset.id === selectedAssetId && (
                <>
                  <div
                    className="absolute -left-1.5 -top-1.5 size-3 cursor-nw-resize rounded-sm bg-primary"
                    onMouseDown={(e) => handleResizeStart(e, "nw")}
                  />
                  <div
                    className="absolute -right-1.5 -top-1.5 size-3 cursor-ne-resize rounded-sm bg-primary"
                    onMouseDown={(e) => handleResizeStart(e, "ne")}
                  />
                  <div
                    className="absolute -bottom-1.5 -left-1.5 size-3 cursor-sw-resize rounded-sm bg-primary"
                    onMouseDown={(e) => handleResizeStart(e, "sw")}
                  />
                  <div
                    className="absolute -bottom-1.5 -right-1.5 size-3 cursor-se-resize rounded-sm bg-primary"
                    onMouseDown={(e) => handleResizeStart(e, "se")}
                  />
                </>
              )}
            </div>
          ))}

          {/* Empty state */}
          {placedAssets.length === 0 && (
            <div className="flex size-full items-center justify-center text-muted-foreground/50">
              <p className="text-sm">Click an asset to add it here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
