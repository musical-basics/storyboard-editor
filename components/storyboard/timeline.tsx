"use client"

import { Copy, Download, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import type { Stage, Storyboard } from "@/lib/storyboard-types"

interface TimelineProps {
  stages: Stage[]
  activeStageId: string
  onSelectStage: (id: string) => void
  onAddStage: () => void
  onDuplicateStage: () => void
  onDeleteStage: (id: string) => void
  onExport: () => void
  storyboard: Storyboard
}

export function Timeline({
  stages,
  activeStageId,
  onSelectStage,
  onAddStage,
  onDuplicateStage,
  onDeleteStage,
  onExport,
}: TimelineProps) {
  return (
    <div className="flex h-32 flex-col border-t border-border bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-card-foreground">Timeline</h3>
          <span className="text-xs text-muted-foreground">
            {stages.length} {stages.length === 1 ? "stage" : "stages"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddStage}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Add Stage
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDuplicateStage}
            className="gap-1.5"
          >
            <Copy className="size-4" />
            Duplicate Stage
          </Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <Button
            variant="default"
            size="sm"
            onClick={onExport}
            className="gap-1.5"
          >
            <Download className="size-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stage thumbnails */}
      <ScrollArea className="flex-1">
        <div className="flex h-full items-center gap-3 p-3">
          {stages.map((stage, index) => (
            <button
              key={stage.id}
              onClick={() => onSelectStage(stage.id)}
              className={`group relative flex h-full shrink-0 flex-col overflow-hidden rounded-lg border transition-all ${
                stage.id === activeStageId
                  ? "border-primary bg-primary/10 ring-2 ring-primary/50"
                  : "border-border bg-muted hover:border-muted-foreground/50"
              }`}
              style={{ width: 90 }}
            >
              {/* Mini preview */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-white/5">
                <div
                  className="relative bg-white"
                  style={{
                    width: 36,
                    height: 64,
                    transform: "scale(0.9)",
                  }}
                >
                  {stage.placedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="absolute"
                      style={{
                        left: asset.x / 10,
                        top: asset.y / 10,
                        width: asset.width / 10,
                        height: asset.height / 10,
                        transform: `rotate(${asset.rotation}deg)`,
                      }}
                    >
                      <img
                        src={asset.assetUrl || "/placeholder.svg"}
                        alt=""
                        className="size-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage name */}
              <div className="flex items-center justify-between border-t border-border/50 px-2 py-1">
                <span className="truncate text-xs font-medium text-foreground">
                  {stage.name || `Stage ${index + 1}`}
                </span>
                {stages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteStage(stage.id)
                    }}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            </button>
          ))}

          {/* Add stage button */}
          <button
            onClick={onAddStage}
            className="flex h-full w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          >
            <Plus className="size-5" />
            <span className="mt-1 text-xs">Add</span>
          </button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
