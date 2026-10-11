"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { GradcamHeatmap } from "@/components/GradcamHeatmap";
import { WaferMap } from "@/components/WaferMap";
import { createWaferLayout, predictWaferMap } from "@/lib/api";
import { buildWaferMap } from "@/lib/wafer-map";
import type {
  NotchOrientation,
  WaferLayoutRequest,
  WaferLayoutResponse,
  WaferMapPredictionResponse,
  WaferShot,
} from "@/types/wafer";

const DEFAULT_CONFIGURATION: WaferLayoutRequest = {
  wafer_diameter: 300_000,
  edge_exclusion: 3_000,
  shot_width: 10_000,
  shot_height: 10_000,
  center_offset_x: 0,
  center_offset_y: 0,
  notch_orientation: "DOWN",
};

const NUMERIC_FIELDS: {
  key: Exclude<keyof WaferLayoutRequest, "notch_orientation">;
  label: string;
  step: number;
}[] = [
  { key: "wafer_diameter", label: "Wafer diameter", step: 100 },
  { key: "edge_exclusion", label: "Edge exclusion", step: 100 },
  { key: "shot_width", label: "Shot width", step: 100 },
  { key: "shot_height", label: "Shot height", step: 100 },
  { key: "center_offset_x", label: "Center offset X", step: 100 },
  { key: "center_offset_y", label: "Center offset Y", step: 100 },
];

function shotKey(shot: WaferShot): string {
  return `${shot.shot_x},${shot.shot_y}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function Home() {
  const [configuration, setConfiguration] = useState(DEFAULT_CONFIGURATION);
  const [layout, setLayout] = useState<WaferLayoutResponse | null>(null);
  const [failingShots, setFailingShots] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] =
    useState<WaferMapPredictionResponse | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const predictionRequestId = useRef(0);

  const loadLayout = useCallback(async (request: WaferLayoutRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const nextLayout = await createWaferLayout(request);
      setLayout(nextLayout);
      setFailingShots(new Set());
      predictionRequestId.current += 1;
      setIsPredicting(false);
      setPrediction(null);
      setInferenceError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "An unexpected error occurred while generating the layout.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  function updateNumber(
    key: Exclude<keyof WaferLayoutRequest, "notch_orientation">,
    value: string,
  ) {
    setConfiguration((current) => ({ ...current, [key]: Number(value) }));
  }

  function toggleShot(shot: WaferShot) {
    const key = shotKey(shot);
    predictionRequestId.current += 1;
    setIsPredicting(false);
    setPrediction(null);
    setInferenceError(null);
    setFailingShots((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function classifyWafer() {
    if (!layout || layout.shots.length === 0) {
      return;
    }

    const requestId = ++predictionRequestId.current;
    setIsPredicting(true);
    setInferenceError(null);
    try {
      const waferMap = buildWaferMap(layout, failingShots);
      const result = await predictWaferMap({ wafer_map: waferMap });
      if (predictionRequestId.current === requestId) {
        setPrediction(result);
      }
    } catch (requestError) {
      if (predictionRequestId.current === requestId) {
        setPrediction(null);
        setInferenceError(
          requestError instanceof Error
            ? requestError.message
            : "An unexpected error occurred during wafer classification.",
        );
      }
    } finally {
      if (predictionRequestId.current === requestId) {
        setIsPredicting(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadLayout(configuration);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="WaferMap AI home">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>WAFERMAP<span className="brand-accent">.AI</span></span>
        </Link>
        <div className="topbar-meta">
          <span className="status-dot" />
          <span>LAYOUT WORKSPACE</span>
          <span className="phase-tag">PHASE 03</span>
        </div>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">ENGINEERING / WAFER SETUP</p>
          <h1>Wafer layout</h1>
          <p className="page-description">
            Configure wafer geometry, then mark failing shots directly on the map.
          </p>
        </div>
        <div className="unit-badge">
          <span className="unit-indicator" />
          DIMENSIONS IN <strong>µm</strong>
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="configuration-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">01 / PARAMETERS</p>
              <h2>Geometry</h2>
            </div>
            <span className="panel-index">01</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field-grid">
              {NUMERIC_FIELDS.map(({ key, label, step }) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      min={key === "edge_exclusion" ? 0 : undefined}
                      step={step}
                      value={configuration[key]}
                      onChange={(event) => updateNumber(key, event.target.value)}
                      required
                    />
                    <span>µm</span>
                  </div>
                </label>
              ))}
            </div>
            <label className="field orientation-field">
              <span>Notch orientation</span>
              <select
                value={configuration.notch_orientation}
                onChange={(event) =>
                  setConfiguration((current) => ({
                    ...current,
                    notch_orientation: event.target.value as NotchOrientation,
                  }))
                }
              >
                {(["DOWN", "LEFT", "UP", "RIGHT"] as const).map((orientation) => (
                  <option key={orientation} value={orientation}>
                    {orientation}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-footnote">
              Shot grid is aligned to the wafer coordinate origin. Offsets shift
              the complete grid before edge filtering.
            </div>
            <button className="primary-button" type="submit" disabled={isLoading}>
              <span>{isLoading ? "Calculating layout…" : "Generate layout"}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </form>
          {error && (
            <div className="error-message" role="alert">
              <strong>Layout unavailable</strong>
              <span>{error}</span>
              <span className="error-hint">
                Confirm the FastAPI service is running at localhost:8000.
              </span>
            </div>
          )}
        </aside>

        <section className="map-panel" aria-label="Wafer layout view">
          <div className="panel-heading map-heading">
            <div>
              <p className="eyebrow">02 / INTERACTIVE MAP</p>
              <h2>Shot distribution</h2>
            </div>
            <span className="map-coordinate">ORIGIN 0, 0</span>
          </div>

          {layout ? (
            <>
              <div
                className={`wafer-visualizations${prediction ? " has-gradcam" : ""}`}
              >
                <div className="map-canvas">
                  <WaferMap
                    layout={layout}
                    failingShots={failingShots}
                    onToggleShot={toggleShot}
                  />
                  <div className="map-axis-label map-axis-x">X</div>
                  <div className="map-axis-label map-axis-y">Y</div>
                  <div className="map-edge-label">
                    Ø {formatNumber(layout.wafer_diameter)} µm
                  </div>
                </div>
                {prediction && (
                  <GradcamHeatmap
                    layout={layout}
                    heatmap={prediction.gradcam_heatmap}
                    predictedClass={prediction.predicted_class}
                  />
                )}
              </div>
              <div className="map-legend" aria-label="Map legend">
                <span><i className="legend-swatch normal" /> Valid shot</span>
                <span><i className="legend-swatch failing" /> Marked failing</span>
                <span><i className="legend-ring" /> Edge exclusion</span>
              </div>
              <div className="map-instruction">
                SELECT A SHOT TO TOGGLE ITS FAILING STATE
              </div>
            </>
          ) : (
            <div className="map-empty">
              <div className="empty-orbit" aria-hidden="true" />
              <strong>{isLoading ? "Generating geometry" : "No layout generated"}</strong>
              <span>
                {isLoading
                  ? "Evaluating shot corners against the usable wafer boundary."
                  : "Set geometry parameters and generate a wafer layout to begin."}
              </span>
            </div>
          )}
          {layout && (
            <section className="classification-panel" aria-label="Wafer classification">
              <div className="classification-heading">
                <div>
                  <p className="eyebrow">03 / CNN EXPLAINABILITY</p>
                  <h3>Defect pattern</h3>
                </div>
                <span className="classification-input-note">
                  CATEGORICAL MAP → 26 × 26
                </span>
              </div>
              <p className="classification-description">
                Classify the current shot pattern. Valid unmarked shots are
                passing (1), marked shots are failing (2), and wafer-background
                cells are 0.
              </p>
              <button
                className="primary-button classify-button"
                type="button"
                onClick={() => void classifyWafer()}
                disabled={isPredicting || layout.shots.length === 0}
              >
                <span>
                  {isPredicting ? "Classifying wafer…" : "Classify wafer map"}
                </span>
                <span aria-hidden="true">↗</span>
              </button>
              {inferenceError && (
                <div className="error-message" role="alert">
                  <strong>Classification unavailable</strong>
                  <span>{inferenceError}</span>
                </div>
              )}
              {prediction && (
                <div className="prediction-result" aria-live="polite">
                  <p className="gradcam-description">
                    Grad-CAM highlights the spatial regions that most
                    influenced this prediction and is shown beside the wafer
                    layout.
                  </p>
                  <div className="prediction-summary">
                    <div>
                      <span>PREDICTED PATTERN</span>
                      <strong>{prediction.predicted_class}</strong>
                    </div>
                    <div>
                      <span>CONFIDENCE</span>
                      <strong>{formatPercent(prediction.confidence)}</strong>
                    </div>
                  </div>
                  <div className="probability-list" aria-label="Class probabilities">
                    {[...prediction.class_probabilities]
                      .sort((left, right) => right.probability - left.probability)
                      .map(({ class_name, probability }) => (
                        <div className="probability-row" key={class_name}>
                          <span>{class_name}</span>
                          <div
                            className="probability-track"
                            role="meter"
                            aria-label={`${class_name} probability`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={probability * 100}
                          >
                            <span
                              style={{ width: `${probability * 100}%` }}
                            />
                          </div>
                          <strong>{formatPercent(probability)}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </section>
      </section>

      <footer className="analysis-strip">
        <div className="analysis-title">
          <span className="eyebrow">03 / SELECTION</span>
          <strong>Observed failures</strong>
        </div>
        <div className="analysis-stat">
          <span>VALID SHOTS</span>
          <strong>{layout ? formatNumber(layout.total_valid_shots) : "—"}</strong>
        </div>
        <div className="analysis-stat">
          <span>MARKED FAILING</span>
          <strong className="failure-count">{formatNumber(failingShots.size)}</strong>
        </div>
        <div className="analysis-stat">
          <span>NORMAL</span>
          <strong>{layout ? formatNumber(layout.total_valid_shots - failingShots.size) : "—"}</strong>
        </div>
        <button
          className="clear-button"
          type="button"
          onClick={() => {
            predictionRequestId.current += 1;
            setIsPredicting(false);
            setFailingShots(new Set());
            setPrediction(null);
            setInferenceError(null);
          }}
          disabled={failingShots.size === 0}
        >
          Clear selection
        </button>
      </footer>
      <p className="phase-note">
        For this phase, each valid UCS shot is treated as one classifier map cell.
      </p>
    </main>
  );
}
