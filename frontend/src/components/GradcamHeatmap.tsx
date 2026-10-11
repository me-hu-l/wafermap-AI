import { useMemo } from "react";
import type { WaferLayoutResponse } from "@/types/wafer";
import { getWaferMapGrid } from "@/lib/wafer-map";

interface GradcamHeatmapProps {
  layout: WaferLayoutResponse;
  heatmap: number[][];
  predictedClass: string;
}

export function GradcamHeatmap({
  layout,
  heatmap,
  predictedClass,
}: GradcamHeatmapProps) {
  const grid = useMemo(() => getWaferMapGrid(layout), [layout]);

  return (
    <section className="gradcam-panel" aria-label="Grad-CAM heatmap">
      <div className="gradcam-panel-heading">
        <div>
          <p className="eyebrow">MODEL EXPLANATION</p>
          <h3>{predictedClass} importance</h3>
        </div>
        <span>HIGHER = MORE IMPORTANT</span>
      </div>
      <div
        className="gradcam-grid"
        role="img"
        aria-label={`Grad-CAM importance heatmap for ${predictedClass}`}
        style={{
          gridTemplateColumns: `repeat(${grid.dimension}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: grid.dimension * grid.dimension }, (_, index) => {
          const row = Math.floor(index / grid.dimension);
          const column = index % grid.dimension;
          const value = heatmap[row]?.[column] ?? 0;
          const intensity = Math.min(1, Math.max(0, value));

          return (
            <span
              className="gradcam-cell"
              key={`${row},${column}`}
              style={{
                backgroundColor: `rgba(235, 69, 39, ${intensity * 0.9})`,
              }}
              title={`Importance: ${(intensity * 100).toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="gradcam-scale" aria-hidden="true">
        <span>LOW</span>
        <i />
        <span>HIGH</span>
      </div>
    </section>
  );
}
