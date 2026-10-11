"use client";

import type { KeyboardEvent } from "react";
import { useMemo } from "react";
import type { WaferLayoutResponse, WaferShot } from "@/types/wafer";

interface WaferMapProps {
  layout: WaferLayoutResponse;
  failingShots: ReadonlySet<string>;
  onToggleShot: (shot: WaferShot) => void;
}

const VIEW_SIZE = 720;
const CENTER = VIEW_SIZE / 2;
const WAFER_RADIUS = 306;
const PADDING = 22;

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
}: WaferMapProps) {
  const scale = WAFER_RADIUS / layout.wafer_radius;
  const usableRadius = WAFER_RADIUS * (layout.usable_radius / layout.wafer_radius);
  const notchPosition = useMemo(() => {
    const radius = WAFER_RADIUS - PADDING * 0.65;
    switch (layout.notch_orientation) {
      case "LEFT":
        return { x: CENTER - radius, y: CENTER };
      case "UP":
        return { x: CENTER, y: CENTER - radius };
      case "RIGHT":
        return { x: CENTER + radius, y: CENTER };
      default:
        return { x: CENTER, y: CENTER + radius };
    }
  }, [layout.notch_orientation]);

  function toggleWithKeyboard(event: KeyboardEvent<SVGPolygonElement>, shot: WaferShot) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleShot(shot);
    }
  }

  return (
    <svg
      className="wafer-map"
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      role="group"
      aria-label="Interactive wafer shot map"
    >
      <defs>
        <clipPath id="wafer-clip">
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
      <g clipPath="url(#wafer-clip)">
        {layout.shots.map((shot) => {
          const key = shotKey(shot);
          const selected = failingShots.has(key);
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
                className={`shot-cell${selected ? " shot-cell-failing" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Shot ${shot.shot_x}, ${shot.shot_y}${selected ? ", marked failing" : ""}`}
                onClick={() => onToggleShot(shot)}
                onKeyDown={(event) => toggleWithKeyboard(event, shot)}
              >
                <title>
                  Shot ({shot.shot_x}, {shot.shot_y}) · origin (
                  {shot.origin_x.toLocaleString()}, {shot.origin_y.toLocaleString()}) µm
                </title>
              </polygon>
            </g>
          );
        })}
      </g>
      <circle
        cx={notchPosition.x}
        cy={notchPosition.y}
        r={Math.max(4, layout.wafer_radius * scale * 0.045)}
        className="wafer-notch"
      />
      <circle cx={CENTER} cy={CENTER} r="3" className="wafer-center" />
    </svg>
  );
}
