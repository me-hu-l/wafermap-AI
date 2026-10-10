"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { WaferMap } from "@/components/WaferMap";
import { createWaferLayout } from "@/lib/api";
import type {
  NotchOrientation,
  WaferLayoutRequest,
  WaferLayoutResponse,
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

export default function Home() {
  const [configuration, setConfiguration] = useState(DEFAULT_CONFIGURATION);
  const [layout, setLayout] = useState<WaferLayoutResponse | null>(null);
  const [failingShots, setFailingShots] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLayout = useCallback(async (request: WaferLayoutRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const nextLayout = await createWaferLayout(request);
      setLayout(nextLayout);
      setFailingShots(new Set());
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
          <span className="phase-tag">PHASE 01</span>
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
          onClick={() => setFailingShots(new Set())}
          disabled={failingShots.size === 0}
        >
          Clear selection
        </button>
      </footer>
      <p className="phase-note">
        This phase treats each valid UCS shot as the selectable failure unit.
      </p>
    </main>
  );
}
