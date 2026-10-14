import Image from "next/image";
import Link from "next/link";

const CLASS_SAMPLE_IMAGES = [
  {
    src: "/Center_Donut_Edge_Loc.png",
    alt: "WM-811K wafer-map samples for Center, Donut, and Edge-Loc patterns",
  },
  {
    src: "/Edge_Ring_Loc_Random.png",
    alt: "WM-811K wafer-map samples for Edge-Ring, Loc, and Random patterns",
  },
  {
    src: "/Scratch_Near_full.png",
    alt: "WM-811K wafer-map samples for Scratch and Near-full patterns",
  },
  {
    src: "/None.png",
    alt: "WM-811K wafer-map samples for the none class",
  },
];

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Set the wafer geometry",
    description:
      "Choose wafer diameter, die dimensions, edge exclusion, center offsets, and notch orientation, then generate the valid layout.",
  },
  {
    number: "02",
    title: "Mark observed failures",
    description:
      "Click dies on the interactive map to mark or clear failures. Or choose a failure percentage and generate a random pattern for testing.",
  },
  {
    number: "03",
    title: "Review metrics and classify",
    description:
      "Check yield and D0 as selections change, then run the CNN to see the predicted signature, class probabilities, and Grad-CAM explanation.",
  },
  {
    number: "04",
    title: "Compare wafers",
    description:
      "Name and add wafers to compare their maps and metrics, inspect yield/D0 Pareto analysis, and stack matching layouts to find recurring failures.",
  },
];

export default function GuidePage() {
  return (
    <main className="app-shell guide-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="WaferMap AI home">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>
            WAFERMAP<span className="brand-accent">.AI</span>
          </span>
        </Link>
        <div className="guide-topbar-label">
          <span className="status-dot" />
          USER GUIDE
        </div>
        <Link className="guide-workspace-link" href="/">
          Open workspace <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className="guide-hero">
        <div className="guide-hero-copy">
          <p className="eyebrow">A WAFER ANALYSIS WORKSPACE</p>
          <h1>Turn wafer maps into actionable insight.</h1>
          <p className="guide-hero-description">
            WaferMap AI brings custom wafer layouts, interactive failure
            mapping, yield and D0 analytics, and CNN-based defect signature
            classification into one engineering workflow.
          </p>
          <Link className="primary-button guide-hero-button" href="/">
            <span>Start analyzing</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <figure className="guide-hero-visual">
          <Image
            src="/Interactive_wafermap.png"
            alt="Interactive wafer map with selected failing dies and a grayscale Grad-CAM heatmap"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 52vw"
          />
          <figcaption>
            Interactive wafer view · selected failures · model explanation
          </figcaption>
        </figure>
      </section>

      <section className="guide-workflow" aria-labelledby="workflow-title">
        <div className="guide-section-heading">
          <div>
            <p className="eyebrow">FROM SETUP TO COMPARISON</p>
            <h2 id="workflow-title">One connected workflow</h2>
          </div>
          <p>
            Explore a wafer on its own, then bring multiple wafers together to
            spot patterns.
          </p>
        </div>
        <ol className="guide-step-grid">
          {WORKFLOW_STEPS.map((step) => (
            <li className="guide-step" key={step.number}>
              <span className="guide-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="guide-capabilities"
        id="features"
        aria-labelledby="capabilities-title"
      >
        <div className="guide-section-heading">
          <div>
            <p className="eyebrow">WHAT YOU CAN DO</p>
            <h2 id="capabilities-title">Built for wafer-map analysis</h2>
          </div>
          <p>
            Geometry, observed failures, model predictions, and comparative
            analytics stay connected while you work.
          </p>
        </div>

        <div className="guide-feature-grid">
          <article className="guide-feature-card">
            <div className="guide-feature-copy">
              <span className="guide-feature-index">GEOMETRY</span>
              <h3>Configure and explore</h3>
              <p>
                Define wafer size, die grid, edge exclusion, center offsets,
                and notch orientation. The generated map distinguishes valid
                positions from wafer background and lets you mark failures
                directly.
              </p>
            </div>
            <div className="guide-feature-images guide-layout-images">
              <figure>
                <Image
                  src="/Wafer_layout.png"
                  alt="Wafer geometry configuration fields"
                  fill
                  sizes="(max-width: 760px) 100vw, 35vw"
                />
                <figcaption>Custom geometry</figcaption>
              </figure>
              <figure>
                <Image
                  src="/Interactive_wafermap.png"
                  alt="Interactive wafer map showing selectable die positions"
                  fill
                  sizes="(max-width: 760px) 100vw, 35vw"
                />
                <figcaption>Interactive failure selection</figcaption>
              </figure>
            </div>
          </article>

          <article className="guide-feature-card">
            <div className="guide-feature-copy">
              <span className="guide-feature-index">CLASSIFICATION</span>
              <h3>Classify signatures with a CNN</h3>
              <p>
                The trained CNN, based on the WM-811K wafer-map dataset,
                predicts among nine patterns: Center, Donut, Edge-Loc,
                Edge-Ring, Loc, Near-full, Random, Scratch, and none. Review
                the predicted class alongside probabilities for every class.
              </p>
            </div>
            <div className="guide-class-gallery" aria-label="WM-811K class samples">
              {CLASS_SAMPLE_IMAGES.map((image) => (
                <figure key={image.src}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 760px) 100vw, 36vw"
                  />
                </figure>
              ))}
            </div>
          </article>

          <article className="guide-feature-card">
            <div className="guide-feature-copy">
              <span className="guide-feature-index">EXPLAINABILITY</span>
              <h3>See what influenced the prediction</h3>
              <p>
                Grad-CAM highlights the map regions most influential to the
                predicted class. Its grayscale display keeps model importance
                visually distinct from the orange-red marks used for failing
                dies.
              </p>
            </div>
            <figure className="guide-feature-visual guide-gradcam-visual">
              <Image
                src="/GradCam.png"
                alt="Grayscale Grad-CAM explanations displayed for multiple wafer predictions"
                fill
                sizes="(max-width: 760px) 100vw, 48vw"
              />
              <figcaption>Dark regions indicate higher importance</figcaption>
            </figure>
          </article>

          <article className="guide-feature-card">
            <div className="guide-feature-copy">
              <span className="guide-feature-index">METRICS</span>
              <h3>Track yield and D0</h3>
              <p>
                Yield and Poisson-model D0 are calculated from the valid wafer
                geometry and selected failing dies—not inferred from the CNN.
                D0 is reported as defects per cm².
              </p>
            </div>
            <figure className="guide-feature-visual guide-pareto-visual">
              <Image
                src="/Yield_D0_pareto.png"
                alt="Pareto chart comparing wafer D0 bars and yield line"
                fill
                sizes="(max-width: 760px) 100vw, 48vw"
              />
              <figcaption>D0 ranked with yield shown alongside</figcaption>
            </figure>
          </article>

          <article className="guide-feature-card guide-feature-card-wide">
            <div className="guide-feature-copy">
              <span className="guide-feature-index">MULTI-WAFER ANALYSIS</span>
              <h3>Compare, stack, and find recurring locations</h3>
              <p>
                Add named wafers to compare failure maps, yield, D0, and
                classifications. Pareto analysis ranks wafers by D0; stacked
                maps show how often each shared die coordinate fails. Different
                geometries are analyzed in separate stacks.
              </p>
              <p className="guide-session-note">
                Added wafers are held in your current browser session and are
                not saved permanently.
              </p>
            </div>
            <div className="guide-feature-images guide-analytics-images">
              <figure>
                <Image
                  src="/Wafer_side_by_side_comparison.png"
                  alt="Wafer comparison cards showing failure maps and metrics"
                  fill
                  sizes="(max-width: 760px) 100vw, 30vw"
                />
                <figcaption>Side-by-side comparison</figcaption>
              </figure>
              <figure>
                <Image
                  src="/stacked_wafermap.png"
                  alt="Stacked wafer map colored by the fraction of wafers with each die failing"
                  fill
                  sizes="(max-width: 760px) 100vw, 30vw"
                />
                <figcaption>Recurring failure frequency</figcaption>
              </figure>
              <figure>
                <Image
                  src="/Yield_D0_pareto.png"
                  alt="Yield and D0 Pareto analysis across wafers"
                  fill
                  sizes="(max-width: 760px) 100vw, 30vw"
                />
                <figcaption>Yield and D0 Pareto</figcaption>
              </figure>
            </div>
          </article>
        </div>
      </section>

      <section className="guide-d0" aria-labelledby="d0-title">
        <div className="guide-d0-heading">
          <p className="eyebrow">DEFECTIVITY AND YIELD</p>
          <h2 id="d0-title">D₀: one number, a bigger story</h2>
          <p>
            D₀ is the effective density of defects that cause die failures. It
            connects observed yield to an estimated killer-defect density.
          </p>
        </div>
        <div className="guide-d0-formula" aria-label="D zero equals negative natural logarithm of yield divided by die area">
          <span>D₀</span>
          <span>=</span>
          <span className="guide-d0-fraction">
            <span>−ln(Y)</span>
            <span>A</span>
          </span>
          <span className="guide-d0-unit">defects / cm²</span>
        </div>
        <div className="guide-d0-details">
          <article>
            <h3>Poisson yield model</h3>
            <p>
              <strong>Y</strong> is die yield and <strong>A</strong> is die
              area in cm². For example, 80% yield on a 1 cm² die gives
              <strong> D₀ ≈ 0.223 defects/cm²</strong>.
            </p>
          </article>
          <article>
            <h3>Not every defect is a killer</h3>
            <p>
              Inspection may find particles, scratches, or pattern defects,
              but not all cause electrical failure. D₀ estimates effective
              yield-limiting defects; it is not a raw inspection count.
            </p>
          </article>
          <article>
            <h3>Why it matters</h3>
            <p>
              Compare D₀ across wafers, then investigate yield loss with
              defect Pareto, electrical test, failure analysis, and process
              history. Lower D₀ generally means higher yield. Here it is
              estimated from marked failing dies, not CNN predictions.
            </p>
          </article>
        </div>
      </section>

      <footer className="guide-footer">
        <span>WaferMap AI · Semiconductor wafer-map analysis</span>
        <Link href="/">Go to the workspace ↗</Link>
      </footer>
    </main>
  );
}
