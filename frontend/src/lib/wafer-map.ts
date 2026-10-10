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

export function buildWaferMap(
  layout: WaferLayoutResponse,
  failingShots: ReadonlySet<string>,
): number[][] {
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
  const waferMap = Array.from({ length: dimension }, () =>
    Array<number>(dimension).fill(0),
  );

  for (const { shot, position } of orientedShots) {
    const [x, y] = position;
    const column = x - minX + columnPadding;
    const row = maxY - y + rowPadding;
    waferMap[row][column] = failingShots.has(
      `${shot.shot_x},${shot.shot_y}`,
    )
      ? 2
      : 1;
  }

  return waferMap;
}
