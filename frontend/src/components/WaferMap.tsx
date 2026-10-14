"use client";

import type { KeyboardEvent } from "react";
import { useId, useMemo } from "react";
import type { WaferLayoutResponse, WaferShot } from "@/types/wafer";

interface WaferMapProps {
  layout: WaferLayoutResponse;
  failingShots: ReadonlySet<string>;
  onToggleShot?: (shot: WaferShot) => void;
  interactive?: boolean;
  failureFrequency?: ReadonlyMap<string, number>;
}

const VIEW_SIZE = 720;
const CENTER = VIEW_SIZE / 2;
const WAFER_RADIUS = 306;
const NOTCH_HALF_WIDTH = 9;
const NOTCH_DEPTH = 8;

function shotKey(shot: WaferShot): string {
  return `${shot.shot_x},${shot.shot_y}`;
}

function coordinateToView(value: number, radius: number): number {
  return CENTER + (value / radius) * WAFER_RADIUS;
}

export function WaferMap({
  layout,
  failingShots,
  onToggleShot,
  interactive = true,
  failureFrequency,
}: WaferMapProps) {
  const clipPathId = useId().replaceAll(":", "");
  const usableRadius = WAFER_RADIUS * (layout.usable_radius / layout.wafer_radius);
  const notchRotation = useMemo(() => {
    switch (layout.notch_orientation) {
      case "LEFT":
        return -90;
      case "UP":
        return 180;
      case "RIGHT":
        return 90;
      default:
        return 0;
    }
  }, [layout.notch_orientation]);
  const notchHalfHeight = Math.sqrt(
    WAFER_RADIUS ** 2 - NOTCH_HALF_WIDTH ** 2,
  );
  const notchPath = [
    `M ${CENTER - NOTCH_HALF_WIDTH} ${CENTER + notchHalfHeight}`,
    `L ${CENTER} ${CENTER + WAFER_RADIUS - NOTCH_DEPTH}`,
    `L ${CENTER + NOTCH_HALF_WIDTH} ${CENTER + notchHalfHeight}`,
  ].join(" ");

  function toggleWithKeyboard(event: KeyboardEvent<SVGPolygonElement>, shot: WaferShot) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleShot?.(shot);
    }
  }

  return (
    <svg
      className="wafer-map"
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      role="group"
      aria-label="Interactive wafer die map"
    >
      <defs>
        <clipPath id={`wafer-clip-${clipPathId}`}>
          <circle cx={CENTER} cy={CENTER} r={WAFER_RADIUS} />
        </clipPath>
      </defs>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={WAFER_RADIUS}
        className="wafer-surface"
      />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={usableRadius}
        className="usable-boundary"
      />
      <line
        x1={CENTER - WAFER_RADIUS}
        y1={CENTER}
        x2={CENTER + WAFER_RADIUS}
        y2={CENTER}
        className="wafer-axis"
      />
      <line
        x1={CENTER}
        y1={CENTER - WAFER_RADIUS}
        x2={CENTER}
        y2={CENTER + WAFER_RADIUS}
        className="wafer-axis"
      />
      <g clipPath={`url(#wafer-clip-${clipPathId})`}>
        {layout.shots.map((shot) => {
          const key = shotKey(shot);
          const selected = failingShots.has(key);
          const frequency = failureFrequency?.get(key) ?? 0;
          const points = shot.corners
            .map((corner) => {
              const x = coordinateToView(corner.x, layout.wafer_radius);
              const y = CENTER - (corner.y / layout.wafer_radius) * WAFER_RADIUS;
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <g key={key}>
              <polygon
                points={points}
                className={`shot-cell${selected ? " shot-cell-failing" : ""}${frequency > 0 ? " shot-cell-stacked" : ""}`}
                style={
                  frequency > 0
                    ? {
                        fill: `rgb(255, ${Math.round(239 - frequency * 130)}, ${Math.round(220 - frequency * 170)})`,
                      }
                    : undefined
                }
                role={interactive ? "button" : "img"}
                tabIndex={interactive ? 0 : undefined}
                aria-pressed={interactive ? selected : undefined}
                aria-label={
                  interactive
                    ? `Die ${shot.shot_x}, ${shot.shot_y}${selected ? ", marked failing" : ""}`
                    : frequency > 0
                      ? `Die ${shot.shot_x}, ${shot.shot_y}, failed on ${Math.round(frequency * 100)}% of wafers`
                      : `Die ${shot.shot_x}, ${shot.shot_y}, no failures`
                }
                onClick={interactive ? () => onToggleShot?.(shot) : undefined}
                onKeyDown={
                  interactive
                    ? (event) => toggleWithKeyboard(event, shot)
                    : undefined
                }
              >
                <title>
                  Die ({shot.shot_x}, {shot.shot_y}) · origin (
                  {shot.origin_x.toLocaleString()}, {shot.origin_y.toLocaleString()}) µm
                  {frequency > 0
                    ? ` · failing in ${Math.round(frequency * 100)}% of wafers`
                    : ""}
                </title>
              </polygon>
            </g>
          );
        })}
      </g>
      <g transform={`rotate(${notchRotation} ${CENTER} ${CENTER})`}>
        <path d={`${notchPath} Z`} className="wafer-notch-cutout" />
        <path d={notchPath} className="wafer-notch" />
      </g>
      <circle cx={CENTER} cy={CENTER} r="3" className="wafer-center" />
    </svg>
  );
}
