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

export interface WaferMapPredictionRequest {
  wafer_map: number[][];
}

export interface ClassProbability {
  class_name: string;
  probability: number;
}

export interface WaferMapPredictionResponse {
  predicted_class: string;
  confidence: number;
  class_probabilities: ClassProbability[];
  gradcam_heatmap: number[][];
}

export interface ShotCoordinate {
  shot_x: number;
  shot_y: number;
}

export interface WaferMetricsRequest {
  layout: WaferLayoutRequest;
  failing_shots: ShotCoordinate[];
}

export interface WaferMetricsResponse {
  total_valid_dies: number;
  failing_dies: number;
  passing_dies: number;
  yield_fraction: number;
  die_area_cm2: number;
  d0_per_cm2: number | null;
}

export interface WaferAnalysisInput {
  wafer_id: string;
  name: string;
  layout: WaferLayoutRequest;
  failing_shots: ShotCoordinate[];
}

export type WaferAnalysisRecord = Omit<WaferAnalysisInput, "layout"> & {
  layout: WaferLayoutResponse;
  prediction?: WaferMapPredictionResponse;
};

export interface WaferComparisonItem {
  wafer_id: string;
  name: string;
  metrics: WaferMetricsResponse;
}

export interface WaferComparisonResponse {
  wafers: WaferComparisonItem[];
}

export interface StackedDie {
  shot_x: number;
  shot_y: number;
  failing_wafers: number;
  observed_wafers: number;
  failure_fraction: number;
}

export interface WaferStackResponse {
  total_wafers: number;
  layout: WaferLayoutResponse;
  dies: StackedDie[];
}
