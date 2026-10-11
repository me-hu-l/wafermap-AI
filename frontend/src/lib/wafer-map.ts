import type {
  NotchOrientation,
  WaferLayoutResponse,
  WaferShot,
} from "@/types/wafer";

function orientShot(
  shot: WaferShot,
  orientation: NotchOrientation,
): [number, number] {
  switch (orientation) {
    case "LEFT":
      return [shot.shot_y, -shot.shot_x];
    case "UP":
      return [-shot.shot_x, -shot.shot_y];
    case "RIGHT":
      return [-shot.shot_y, shot.shot_x];
    default:
      return [shot.shot_x, shot.shot_y];
  }
}

export interface WaferMapPosition {
  row: number;
  column: number;
}

export interface WaferMapGrid {
  dimension: number;
  positions: ReadonlyMap<string, WaferMapPosition>;
}

export function getWaferMapGrid(layout: WaferLayoutResponse): WaferMapGrid {
  if (layout.shots.length === 0) {
    throw new Error("The current layout has no valid shots to classify.");
  }

  const orientedShots = layout.shots.map((shot) => ({
    shot,
    position: orientShot(shot, layout.notch_orientation),
  }));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const { position } of orientedShots) {
    minX = Math.min(minX, position[0]);
    maxX = Math.max(maxX, position[0]);
    minY = Math.min(minY, position[1]);
    maxY = Math.max(maxY, position[1]);
  }
  const columns = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const dimension = Math.max(columns, rows);
  const columnPadding = Math.floor((dimension - columns) / 2);
  const rowPadding = Math.floor((dimension - rows) / 2);
  const positions = new Map<string, WaferMapPosition>();

  for (const { shot, position } of orientedShots) {
    const [x, y] = position;
    positions.set(`${shot.shot_x},${shot.shot_y}`, {
      column: x - minX + columnPadding,
      row: maxY - y + rowPadding,
    });
  }

  return { dimension, positions };
}

export function buildWaferMap(
  layout: WaferLayoutResponse,
  failingShots: ReadonlySet<string>,
): number[][] {
  const grid = getWaferMapGrid(layout);
  const waferMap = Array.from({ length: grid.dimension }, () =>
    Array<number>(grid.dimension).fill(0),
  );

  for (const [key, position] of grid.positions) {
    waferMap[position.row][position.column] = failingShots.has(key)
      ? 2
      : 1;
  }

  return waferMap;
}
