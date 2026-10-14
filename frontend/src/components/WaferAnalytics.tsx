"use client";

import { useEffect, useMemo, useState } from "react";
import { GradcamHeatmap } from "@/components/GradcamHeatmap";
import { WaferMap } from "@/components/WaferMap";
import { compareWafers, stackWafers } from "@/lib/api";
import type {
  WaferAnalysisInput,
  WaferAnalysisRecord,
  WaferComparisonItem,
  WaferStackResponse,
} from "@/types/wafer";

interface WaferAnalyticsProps {
  wafers: WaferAnalysisRecord[];
  onRemoveWafer: (waferId: string) => void;
}

interface WaferLayoutGroup {
  key: string;
  label: string;
  wafers: WaferAnalysisRecord[];
}

interface StackedLayoutResult extends WaferLayoutGroup {
  result?: WaferStackResponse;
  error?: string;
}

function getLayoutKey(wafer: WaferAnalysisRecord): string {
  const layout = wafer.layout;
  return JSON.stringify([
    layout.wafer_diameter,
    layout.edge_exclusion,
    layout.shot_width,
    layout.shot_height,
    layout.center_offset_x,
    layout.center_offset_y,
    layout.notch_orientation,
  ]);
}

function getLayoutLabel(wafer: WaferAnalysisRecord): string {
  const { wafer_diameter, shot_width, shot_height, notch_orientation } =
    wafer.layout;
  return `Ø ${new Intl.NumberFormat("en-US").format(wafer_diameter)} µm · die ${new Intl.NumberFormat("en-US").format(shot_width)} × ${new Intl.NumberFormat("en-US").format(shot_height)} µm · ${notch_orientation}`;
}

function toAnalysisInputs(wafers: WaferAnalysisRecord[]): WaferAnalysisInput[] {
  return wafers.map((wafer) => ({
    wafer_id: wafer.wafer_id,
    name: wafer.name,
    layout: {
      wafer_diameter: wafer.layout.wafer_diameter,
      edge_exclusion: wafer.layout.edge_exclusion,
      shot_width: wafer.layout.shot_width,
      shot_height: wafer.layout.shot_height,
      center_offset_x: wafer.layout.center_offset_x,
      center_offset_y: wafer.layout.center_offset_y,
      notch_orientation: wafer.layout.notch_orientation,
    },
    failing_shots: wafer.failing_shots,
  }));
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

function ParetoChart({ results }: { results: WaferComparisonItem[] }) {
  const chartWidth = Math.max(800, results.length * 74 + 128);
  const chartHeight = 300;
  const padding = { top: 30, right: 58, bottom: 58, left: 70 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const sortedResults = [...results].sort(
    (left, right) =>
      (right.metrics.d0_per_cm2 ?? Infinity) -
      (left.metrics.d0_per_cm2 ?? Infinity),
  );
  const maxDensity = Math.max(
    ...sortedResults.map((result) => result.metrics.d0_per_cm2 ?? 0),
    1,
  );
  const slotWidth = plotWidth / sortedResults.length;
  const points = sortedResults.map((result, index) => ({
    result,
    x: padding.left + slotWidth * (index + 0.5),
    y: padding.top + (1 - result.metrics.yield_fraction) * plotHeight,
    barHeight:
      ((result.metrics.d0_per_cm2 ?? maxDensity) / maxDensity) * plotHeight,
  }));
  const yieldPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="pareto-chart-wrap">
      <svg
        className="pareto-chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ minWidth: `${chartWidth}px` }}
        role="img"
        aria-label="D0 and yield Pareto chart for added wafers"
      >
        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          className="chart-axis"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          className="chart-axis"
        />
        {[0, 0.5, 1].map((fraction) => {
          const y = padding.top + (1 - fraction) * plotHeight;
          return (
            <g key={fraction}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                className="chart-gridline"
              />
              <text
                x={padding.left - 10}
                y={y + 3}
                className="chart-tick"
                textAnchor="end"
              >
                {formatDensity(maxDensity * fraction)}
              </text>
              <text
                x={padding.left + plotWidth + 10}
                y={y + 3}
                className="chart-tick"
              >
                {formatPercent(fraction)}
              </text>
            </g>
          );
        })}
        {points.map(({ result, x, barHeight }) => (
          <g key={result.wafer_id}>
            <rect
              x={x - slotWidth * 0.23}
              y={padding.top + plotHeight - barHeight}
              width={slotWidth * 0.46}
              height={barHeight}
              rx="3"
              className="pareto-bar"
            >
              <title>
                {result.name}: D0 {formatDensity(result.metrics.d0_per_cm2)} defects/cm²
              </title>
            </rect>
            <text
              x={x}
              y={chartHeight - padding.bottom + 19}
              className="chart-label"
              textAnchor="middle"
            >
              {result.name.length > 12
                ? `${result.name.slice(0, 11)}…`
                : result.name}
            </text>
          </g>
        ))}
        <path d={yieldPath} className="yield-line" />
        {points.map(({ result, x, y }) => (
          <circle key={result.wafer_id} cx={x} cy={y} r="4.5" className="yield-point">
            <title>
              {result.name}: yield {formatPercent(result.metrics.yield_fraction)}
            </title>
          </circle>
        ))}
        <text
          x={padding.left + plotWidth / 2}
          y={chartHeight - 10}
          className="chart-axis-label"
          textAnchor="middle"
        >
          Wafers (ordered by descending D0)
        </text>
        <text
          transform={`translate(16 ${padding.top + plotHeight / 2}) rotate(-90)`}
          className="chart-axis-label"
          textAnchor="middle"
        >
          D0 · defects / cm²
        </text>
        <text
          transform={`translate(${chartWidth - 10} ${padding.top + plotHeight / 2}) rotate(90)`}
          className="chart-axis-label"
          textAnchor="middle"
        >
          Yield
        </text>
      </svg>
      <div className="chart-legend">
        <span><i className="chart-legend-bar" /> D0</span>
        <span><i className="chart-legend-line" /> Yield</span>
      </div>
    </div>
  );
}

function StackedWafer({ result }: { result: WaferStackResponse }) {
  const frequencies = useMemo(
    () =>
      new Map(
        result.dies.map((die) => [
          `${die.shot_x},${die.shot_y}`,
          die.failure_fraction,
        ]),
      ),
    [result.dies],
  );

  return (
    <div className="stack-result">
      <div className="stack-map-wrap">
        <WaferMap
          layout={result.layout}
          failingShots={new Set()}
          interactive={false}
          failureFrequency={frequencies}
        />
      </div>
      <div className="stack-legend">
        <span>0%</span>
        <i aria-hidden="true" />
        <span>100% of wafers failing</span>
      </div>
      <p className="stack-caption">
        Color shows the share of analyzed wafers where each die failed. Hover a
        die for its coordinate and failure frequency.
      </p>
    </div>
  );
}

export function WaferAnalytics({
  wafers,
  onRemoveWafer,
}: WaferAnalyticsProps) {
  const analysisInputs = useMemo(() => toAnalysisInputs(wafers), [wafers]);
  const analysisKey = useMemo(
    () => JSON.stringify(analysisInputs),
    [analysisInputs],
  );
  const [comparisonState, setComparisonState] = useState<{
    key: string;
    results?: WaferComparisonItem[];
    error?: string;
  } | null>(null);
  const [stackState, setStackState] = useState<{
    key: string;
    results: StackedLayoutResult[];
  } | null>(null);
  const [stackPendingKey, setStackPendingKey] = useState<string | null>(null);
  const [showGradcams, setShowGradcams] = useState(false);
  const [showPareto, setShowPareto] = useState(false);
  const comparison =
    comparisonState?.key === analysisKey
      ? comparisonState.results ?? []
      : [];
  const comparisonError =
    comparisonState?.key === analysisKey ? comparisonState.error ?? null : null;
  const isComparing =
    wafers.length >= 2 && comparisonState?.key !== analysisKey;
  const stackResults =
    stackState?.key === analysisKey ? stackState.results : [];
  const isStacking = stackPendingKey === analysisKey;
  const layoutGroups = useMemo(() => {
    const groups = new Map<string, WaferLayoutGroup>();
    for (const wafer of wafers) {
      const key = getLayoutKey(wafer);
      const group = groups.get(key);
      if (group) {
        group.wafers.push(wafer);
      } else {
        groups.set(key, {
          key,
          label: getLayoutLabel(wafer),
          wafers: [wafer],
        });
      }
    }
    return Array.from(groups.values());
  }, [wafers]);

  useEffect(() => {
    if (wafers.length < 2) {
      return;
    }

    const controller = new AbortController();
    void compareWafers(analysisInputs, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setComparisonState({
            key: analysisKey,
            results: response.wafers,
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setComparisonState({
            key: analysisKey,
            error: error instanceof Error ? error.message : "Wafer comparison failed.",
          });
        }
      });

    return () => controller.abort();
  }, [analysisInputs, analysisKey, wafers.length]);

  async function createStack() {
    setStackPendingKey(analysisKey);
    const results = await Promise.all(
      layoutGroups.map(async (group): Promise<StackedLayoutResult> => {
        try {
          const result = await stackWafers(toAnalysisInputs(group.wafers));
          return { ...group, result };
        } catch (error) {
          return {
            ...group,
            error:
              error instanceof Error ? error.message : "Wafer stacking failed.",
          };
        }
      }),
    );
    setStackState({ key: analysisKey, results });
    setStackPendingKey(null);
  }

  if (wafers.length === 0) {
    return null;
  }

  return (
    <section className="wafer-analytics" aria-label="Multi-wafer analytics">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">MULTI-WAFER ANALYSIS</p>
          <h2>Wafer comparison</h2>
          <p>Compare observed failure patterns and per-wafer metrics.</p>
        </div>
        <span className="wafer-count">
          {wafers.length} {wafers.length === 1 ? "wafer" : "wafers"}
        </span>
      </div>

      {wafers.length < 2 ? (
        <p className="analytics-empty">
          Add at least one more wafer to compare maps, yield, D0, and failure
          frequencies.
        </p>
      ) : (
        <>
          {isComparing && <p className="analytics-status">Updating comparison…</p>}
          {comparisonError && (
            <div className="error-message" role="alert">
              <strong>Comparison unavailable</strong>
              <span>{comparisonError}</span>
            </div>
          )}
          {comparison.length > 0 && (
            <>
              <div className="wafer-comparison-grid">
                {wafers.map((wafer) => {
                  const analysis = comparison.find(
                    (item) => item.wafer_id === wafer.wafer_id,
                  );
                  if (!analysis) {
                    return null;
                  }
                  const displayLayout = {
                    ...wafer.layout,
                    wafer_radius: wafer.layout.wafer_diameter / 2,
                    usable_radius:
                      wafer.layout.wafer_diameter / 2 -
                      wafer.layout.edge_exclusion,
                    total_valid_shots: wafer.layout.shots.length,
                  };
                  const failures = new Set(
                    wafer.failing_shots.map(
                      ({ shot_x, shot_y }) => `${shot_x},${shot_y}`,
                    ),
                  );
                  const probabilities = wafer.prediction
                    ? [...wafer.prediction.class_probabilities].sort(
                        (left, right) => right.probability - left.probability,
                      )
                    : [];
                  return (
                    <article className="wafer-comparison-card" key={wafer.wafer_id}>
                      <div className="comparison-card-heading">
                        <div>
                          <span className="eyebrow">WAFER ANALYSIS</span>
                          <h3>{wafer.name}</h3>
                        </div>
                        <button
                          className="remove-wafer-button"
                          type="button"
                          onClick={() => onRemoveWafer(wafer.wafer_id)}
                          aria-label={`Remove ${wafer.name}`}
                        >
                          Remove
                        </button>
                      </div>
                      <WaferMap
                        layout={displayLayout}
                        failingShots={failures}
                        interactive={false}
                      />
                      <div className="comparison-legend">
                        <span><i className="legend-swatch normal" /> Passing</span>
                        <span><i className="legend-swatch failing" /> Failing</span>
                      </div>
                      <dl className="comparison-metrics">
                        <div>
                          <dt>Yield</dt>
                          <dd>{formatPercent(analysis.metrics.yield_fraction)}</dd>
                        </div>
                        <div>
                          <dt>D0 · defects/cm²</dt>
                          <dd>{formatDensity(analysis.metrics.d0_per_cm2)}</dd>
                        </div>
                        <div>
                          <dt>Failing dies</dt>
                          <dd>{analysis.metrics.failing_dies.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>Total valid dies</dt>
                          <dd>{analysis.metrics.total_valid_dies.toLocaleString()}</dd>
                        </div>
                      </dl>
                      {wafer.prediction && (
                        <section
                          className="comparison-classification"
                          aria-label={`${wafer.name} classifier probabilities`}
                        >
                          <div className="classifier-summary">
                            <span>PREDICTED PATTERN</span>
                            <strong>
                              {wafer.prediction.predicted_class} ·{" "}
                              {formatConfidence(wafer.prediction.confidence)}
                            </strong>
                          </div>
                          <div
                            className="probability-list"
                            aria-label={`${wafer.name} prediction probabilities`}
                          >
                            {probabilities.map(({ class_name, probability }) => (
                              <div className="probability-row" key={class_name}>
                                <span>{class_name}</span>
                                <div className="probability-track">
                                  <span
                                    style={{
                                      width: `${probability * 100}%`,
                                    }}
                                  />
                                </div>
                                <strong>{formatConfidence(probability)}</strong>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </article>
                  );
                })}
              </div>

              <section className="analytics-subpanel classifier-comparison-panel">
                <div className="subpanel-heading">
                  <div>
                    <p className="eyebrow">CLASSIFICATION</p>
                    <h3>Class probabilities and Grad-CAM</h3>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setShowGradcams((visible) => !visible)}
                    aria-expanded={showGradcams}
                    disabled={!wafers.some((wafer) => wafer.prediction)}
                  >
                    {showGradcams ? "Hide Grad-CAM comparison" : "Show Grad-CAM comparison"}
                  </button>
                </div>
                <p className="subpanel-description">
                  Class probabilities are listed on each wafer card. Compare
                  the saved heatmaps below to see where each prediction focused.
                </p>
                {wafers.some((wafer) => wafer.prediction) ? (
                  showGradcams && (
                    <div className="gradcam-comparison-grid">
                      {wafers.map((wafer) => {
                        if (!wafer.prediction) {
                          return (
                            <article
                              className="gradcam-comparison-card gradcam-unavailable"
                              key={wafer.wafer_id}
                            >
                              <h4>{wafer.name}</h4>
                              <p>No saved classifier result for this wafer.</p>
                            </article>
                          );
                        }
                        const displayLayout = {
                          ...wafer.layout,
                          wafer_radius: wafer.layout.wafer_diameter / 2,
                          usable_radius:
                            wafer.layout.wafer_diameter / 2 -
                            wafer.layout.edge_exclusion,
                          total_valid_shots: wafer.layout.shots.length,
                        };
                        return (
                          <article
                            className="gradcam-comparison-card"
                            key={wafer.wafer_id}
                          >
                            <h4>{wafer.name}</h4>
                            <GradcamHeatmap
                              layout={displayLayout}
                              heatmap={wafer.prediction.gradcam_heatmap}
                              predictedClass={wafer.prediction.predicted_class}
                            />
                          </article>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <p className="analytics-empty">
                    No saved classifier results. Classify a wafer before adding
                    it to include its probabilities and Grad-CAM.
                  </p>
                )}
              </section>

              <section className="analytics-subpanel">
                <div className="subpanel-heading">
                  <div>
                    <p className="eyebrow">YIELD AND D0</p>
                    <h3>Yield and D0 Pareto</h3>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setShowPareto((visible) => !visible)}
                    aria-expanded={showPareto}
                  >
                    {showPareto ? "Hide Pareto chart" : "Plot yield and D0 Pareto"}
                  </button>
                </div>
                {showPareto && (
                  <>
                    <p className="subpanel-description">
                      D0 bars are ordered highest to lowest; the line shows each
                      wafer’s yield on the right axis.
                    </p>
                    <ParetoChart results={comparison} />
                  </>
                )}
              </section>

              <section className="analytics-subpanel stack-panel">
                <div className="subpanel-heading">
                  <div>
                    <p className="eyebrow">FAILURE FREQUENCY</p>
                    <h3>Stacked wafer views</h3>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void createStack()}
                    disabled={isStacking || isComparing}
                  >
                    {isStacking ? "Stacking layouts…" : "Generate stacked views"}
                  </button>
                </div>
                <p className="subpanel-description">
                  Wafers are grouped by geometry. Each view aligns matching die
                  coordinates within that layout and colors dies by their
                  failure frequency.
                </p>
                {stackResults.length > 0 && (
                  <div className="stacked-layout-grid">
                    {stackResults.map((group, index) => (
                      <article className="stacked-layout-card" key={group.key}>
                        <div className="stacked-layout-heading">
                          <div>
                            <h4>Layout {index + 1}</h4>
                            <p>{group.label}</p>
                          </div>
                          <span>
                            {group.wafers.length}{" "}
                            {group.wafers.length === 1 ? "WAFER" : "WAFERS"}
                          </span>
                        </div>
                        <p className="stacked-wafer-names">
                          {group.wafers.map((wafer) => wafer.name).join(" · ")}
                        </p>
                        {group.error && (
                          <div className="error-message" role="alert">
                            <strong>Stack unavailable</strong>
                            <span>{group.error}</span>
                          </div>
                        )}
                        {group.result && (
                          <StackedWafer result={group.result} />
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
