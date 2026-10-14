"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { GradcamHeatmap } from "@/components/GradcamHeatmap";
import { WaferAnalytics } from "@/components/WaferAnalytics";
import { WaferMap } from "@/components/WaferMap";
import {
  calculateWaferMetrics,
  createWaferLayout,
  predictWaferMap,
} from "@/lib/api";
import { buildWaferMap } from "@/lib/wafer-map";
import type {
  NotchOrientation,
  WaferLayoutRequest,
  WaferLayoutResponse,
  WaferMapPredictionResponse,
  WaferMetricsResponse,
  WaferAnalysisRecord,
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
  { key: "shot_width", label: "Die width", step: 100 },
  { key: "shot_height", label: "Die height", step: 100 },
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

function formatConfidence(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDensity(value: number | null): string {
  if (value === null) {
    return "∞";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Home() {
  const [configuration, setConfiguration] = useState(DEFAULT_CONFIGURATION);
  const [layout, setLayout] = useState<WaferLayoutResponse | null>(null);
  const [failingShots, setFailingShots] = useState<Set<string>>(new Set());
  const [randomFailurePercent, setRandomFailurePercent] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] =
    useState<WaferMapPredictionResponse | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<WaferMetricsResponse | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [isMetricsPending, setIsMetricsPending] = useState(false);
  const [waferRecords, setWaferRecords] = useState<WaferAnalysisRecord[]>([]);
  const [nextWaferName, setNextWaferName] = useState("Wafer 1");
  const predictionRequestId = useRef(0);

  const loadLayout = useCallback(async (request: WaferLayoutRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const nextLayout = await createWaferLayout(request);
      setLayout(nextLayout);
      setFailingShots(new Set());
      setMetrics(null);
      setMetricsError(null);
      setIsMetricsPending(true);
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

  useEffect(() => {
    if (!layout) {
      return;
    }

    const controller = new AbortController();
    const failingCoordinates = Array.from(failingShots, (coordinate) => {
      const [shot_x, shot_y] = coordinate.split(",").map(Number);
      return { shot_x, shot_y };
    });
    void calculateWaferMetrics(
      {
        layout: {
          wafer_diameter: layout.wafer_diameter,
          edge_exclusion: layout.edge_exclusion,
          shot_width: layout.shot_width,
          shot_height: layout.shot_height,
          center_offset_x: layout.center_offset_x,
          center_offset_y: layout.center_offset_y,
          notch_orientation: layout.notch_orientation,
        },
        failing_shots: failingCoordinates,
      },
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setMetrics(result);
          setMetricsError(null);
          setIsMetricsPending(false);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setMetrics(null);
          setIsMetricsPending(false);
          setMetricsError(
            requestError instanceof Error
              ? requestError.message
              : "An unexpected error occurred while calculating wafer metrics.",
          );
        }
      });

    return () => controller.abort();
  }, [layout, failingShots]);

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
    setMetrics(null);
    setMetricsError(null);
    setIsMetricsPending(true);
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

  function generateRandomFailures() {
    if (!layout || layout.shots.length === 0) {
      return;
    }

    const shuffledShots = [...layout.shots];
    for (let index = shuffledShots.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledShots[index], shuffledShots[randomIndex]] = [
        shuffledShots[randomIndex],
        shuffledShots[index],
      ];
    }
    const failureCount = Math.round(
      shuffledShots.length * (randomFailurePercent / 100),
    );

    predictionRequestId.current += 1;
    setIsPredicting(false);
    setPrediction(null);
    setInferenceError(null);
    setMetrics(null);
    setMetricsError(null);
    setIsMetricsPending(true);
    setFailingShots(
      new Set(shuffledShots.slice(0, failureCount).map(shotKey)),
    );
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

  function addCurrentWafer() {
    if (!layout || layout.shots.length === 0 || !nextWaferName.trim()) {
      return;
    }

    const failingCoordinates = Array.from(failingShots, (coordinate) => {
      const [shot_x, shot_y] = coordinate.split(",").map(Number);
      return { shot_x, shot_y };
    });
    const nextCount = waferRecords.length + 2;
    setWaferRecords((current) => [
      ...current,
      {
        wafer_id: crypto.randomUUID(),
        name: nextWaferName.trim(),
        layout,
        failing_shots: failingCoordinates,
        prediction: prediction ?? undefined,
      },
    ]);
    setNextWaferName(`Wafer ${nextCount}`);
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
          <span>WAFER ANALYSIS</span>
        </div>
        <Link className="topbar-guide-link" href="/guide">
          User guide
        </Link>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow">WAFER SETUP</p>
          <h1>Wafer analysis</h1>
          <p className="page-description">
            Set up a wafer, mark failing dies, and review its performance.
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
              <p className="eyebrow">GEOMETRY</p>
              <h2>Geometry</h2>
            </div>
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
              Die positions are centered on the wafer. Offsets shift the grid
              before edge exclusion is applied.
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
                Please try again. If the problem continues, contact support.
              </span>
            </div>
          )}
        </aside>

        <section className="map-panel" aria-label="Wafer layout view">
          <div className="panel-heading map-heading">
            <div>
              <p className="eyebrow">WAFER MAP</p>
              <h2>Die distribution</h2>
            </div>
            <div className="map-heading-actions">
              <input
                className="wafer-name-input"
                aria-label="Name for wafer to add"
                value={nextWaferName}
                onChange={(event) => setNextWaferName(event.target.value)}
                maxLength={100}
                disabled={!layout}
              />
              <button
                className="secondary-button"
                type="button"
                onClick={addCurrentWafer}
                disabled={
                  !layout ||
                  layout.shots.length === 0 ||
                  !nextWaferName.trim()
                }
              >
                Add wafer
              </button>
              <label className="failure-rate-control">
                <span>Failure rate</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={randomFailurePercent}
                  onChange={(event) =>
                    setRandomFailurePercent(Number(event.target.value))
                  }
                  aria-label="Random failure rate"
                  aria-valuetext={`${randomFailurePercent}% of valid dies`}
                  disabled={!layout || layout.shots.length === 0}
                />
                <output>{randomFailurePercent}%</output>
              </label>
              <button
                className="secondary-button randomize-button"
                type="button"
                onClick={generateRandomFailures}
                disabled={!layout || layout.shots.length === 0}
              >
                Generate random failures
              </button>
              <span className="map-coordinate">ORIGIN 0, 0</span>
            </div>
          </div>

          {layout && (
            <section className="current-metrics-bar" aria-label="Current wafer analysis">
              <div className="analysis-title">
                <span className="eyebrow">CURRENT WAFER</span>
                <strong>Observed failures</strong>
              </div>
              <div className="analysis-stat">
                <span>VALID DIES</span>
                <strong>{formatNumber(layout.total_valid_shots)}</strong>
              </div>
              <div className="analysis-stat">
                <span>FAILING DIES</span>
                <strong className="failure-count">{formatNumber(failingShots.size)}</strong>
              </div>
              <div className="analysis-stat">
                <span>YIELD</span>
                <strong>{metrics ? formatPercent(metrics.yield_fraction) : "—"}</strong>
              </div>
              <div className="analysis-stat">
                <span>D0 · DEFECTS / cm²</span>
                <strong>
                  {metrics
                    ? formatDensity(metrics.d0_per_cm2)
                    : metricsError
                      ? "Error"
                      : isMetricsPending
                        ? "Updating…"
                        : "—"}
                </strong>
              </div>
              <button
                className="clear-button"
                type="button"
                onClick={() => {
                  predictionRequestId.current += 1;
                  setIsPredicting(false);
                  setFailingShots(new Set());
                  setMetrics(null);
                  setMetricsError(null);
                  setIsMetricsPending(Boolean(layout));
                  setPrediction(null);
                  setInferenceError(null);
                }}
                disabled={failingShots.size === 0}
              >
                Clear selection
              </button>
            </section>
          )}
          {metricsError && (
            <div className="metrics-error" role="alert">
              <strong>Metrics unavailable</strong>
              <span>{metricsError}</span>
            </div>
          )}

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
                <span><i className="legend-swatch normal" /> Passing die</span>
                <span><i className="legend-swatch failing" /> Marked failing</span>
                <span><i className="legend-ring" /> Edge exclusion</span>
              </div>
              <div className="map-instruction">
                Select dies on the map to mark or clear failures
              </div>
            </>
          ) : (
            <div className="map-empty">
              <div className="empty-orbit" aria-hidden="true" />
              <strong>{isLoading ? "Generating geometry" : "No layout generated"}</strong>
              <span>
                {isLoading
                  ? "Checking die positions against the wafer boundary."
                  : "Set geometry parameters and generate a wafer layout to begin."}
              </span>
            </div>
          )}
          {layout && (
            <section className="classification-panel" aria-label="Wafer classification">
              <div className="classification-heading">
                <div>
                  <p className="eyebrow">CLASSIFICATION</p>
                  <h3>Defect pattern</h3>
                </div>
              </div>
              <p className="classification-description">
                Run the trained classifier to find the defect signature that
                best matches the selected failure pattern.
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
                    The heatmap highlights the regions that most influenced
                    this prediction.
                  </p>
                  <div className="prediction-summary">
                    <div>
                      <span>PREDICTED PATTERN</span>
                      <strong>{prediction.predicted_class}</strong>
                    </div>
                    <div>
                      <span>CONFIDENCE</span>
                      <strong>{formatConfidence(prediction.confidence)}</strong>
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
                          <strong>{formatConfidence(probability)}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </section>
      </section>

      <WaferAnalytics
        wafers={waferRecords}
        onRemoveWafer={(waferId) =>
          setWaferRecords((current) =>
            current.filter((wafer) => wafer.wafer_id !== waferId),
          )
        }
      />

    </main>
  );
}
