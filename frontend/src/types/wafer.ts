export type NotchOrientation = "DOWN" | "LEFT" | "UP" | "RIGHT";

export interface WaferLayoutRequest {
  wafer_diameter: number;
  edge_exclusion: number;
  shot_width: number;
  shot_height: number;
  center_offset_x: number;
  center_offset_y: number;
  notch_orientation: NotchOrientation;
}

export interface Point {
  x: number;
  y: number;
}

export interface WaferShot {
  shot_x: number;
  shot_y: number;
  origin_x: number;
  origin_y: number;
  center_x: number;
  center_y: number;
  corners: Point[];
}

export interface WaferLayoutResponse extends WaferLayoutRequest {
  wafer_radius: number;
  usable_radius: number;
  total_valid_shots: number;
  shots: WaferShot[];
}
