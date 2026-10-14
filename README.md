# WaferMap AI

WaferMap AI is an interactive wafer-layout and analysis application. It
implements UCS-compatible shot geometry, manual or generated die-failure
patterns, yield and D0 calculations, and CNN classification of the selected
wafer pattern. Multiple wafer patterns can be compared side by side, analyzed
with a yield/D0 Pareto chart, and stacked by recurring failing-die location.

## Run locally

Start the FastAPI backend from `backend/`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

In another terminal, start the Next.js frontend from `frontend/`:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend calls the backend at
`http://localhost:8000`; set `NEXT_PUBLIC_API_URL` to override that URL.

## Backend deployment settings

The backend accepts these optional environment variables:

- `FRONTEND_URL`: deployed frontend origin allowed by CORS. Localhost remains
  allowed for development. Defaults to no additional origin.
- `REPO_ID`: Hugging Face model repository ID, such as `owner/repository`.
- `FILENAME`: checkpoint file path within that repository.

For example, set these in the backend hosting environment:

```text
FRONTEND_URL=https://your-frontend.example.com
REPO_ID=your-account/wafermap-classifier
FILENAME=plain_cnn_classifier_v1.pth
```

The backend downloads the checkpoint with `huggingface_hub` and loads it at
startup. For a private repository, configure the `HF_TOKEN` environment
variable with a read-access token. If both `REPO_ID` and `FILENAME` are unset,
the backend uses the bundled
`models/plain_cnn_classifier_v1.pth` checkpoint. Configure both Hugging Face
variables together; setting only one is a startup error.

## CNN wafer classification

The backend loads the checkpoint at startup and reuses the model for prediction
requests. The classifier follows
the architecture and preprocessing in
[`notebooks/EDA+baseline_CNN.ipynb`](./notebooks/EDA+baseline_CNN.ipynb):
the categorical 0/1/2 map is resized with nearest-neighbor interpolation to
26×26, one-hot encoded into three channels, and evaluated as an NCHW tensor.

After generating a layout, click valid dies to mark them as failing or choose
**Generate random failures** to create a fresh, arbitrary pattern affecting
about 5–20% of the valid dies. Choose **Classify wafer map** to view the
predicted pattern, its confidence, and probabilities for all nine classes.
The API endpoint is `POST /api/inference/predict`; its
`wafer_map` input must be a square matrix containing only 0 (background),
1 (passing), and 2 (failing). In the current phase, each selectable die is
one input map cell. The response also contains a Grad-CAM heatmap for the
predicted class, computed from the CNN's final convolution block, resized back
to the submitted map dimensions, and displayed as a separate heatmap beside
the wafer layout.

## Yield and electrical defect density

The analysis strip reports yield and D0 for the current failing-die selection.
Yield is passing valid dies divided by total valid dies. D0 uses the Poisson
model `Y = e^(-D0 × A)`, with die area converted from the configured µm
dimensions to cm², so D0 is reported in defects/cm². A zero-yield wafer has an
unbounded D0, displayed as `∞`. Metrics are calculated by
`POST /api/wafers/metrics` from the UCS-compatible valid layout and selected
die coordinates; CNN predictions do not affect these values.

## Multi-wafer analysis

Generate a layout, select or generate its failing-die pattern, name the wafer,
and choose **Add wafer**. Repeat to build an in-memory comparison set. Added
wafers are shown side by side with their failure maps, yield, D0, and die
counts; any saved CNN predictions, class probabilities, and Grad-CAM maps are
also available on each wafer card, with all class probabilities displayed for
comparison. Use **Show Grad-CAM comparison** to show or hide the saved heatmaps
side by side. Classify a wafer before adding it to preserve its CNN result in
the comparison. Wafers can be removed from the set. Use **Plot yield and D0
Pareto** to show the chart on demand, just as **Generate stacked views** creates
frequency maps only when requested. Stacked views are generated separately for
each unique wafer geometry, including a single-wafer group, so different layouts
are never combined by incompatible die coordinates. The current wafer’s valid-die count,
failing count, yield, and D0 are displayed beside its map.
The **Yield and D0 Pareto** chart orders wafers by D0 and plots yield on a
second axis. **Generate stacked views** aggregates failing frequency by UCS
die coordinate for each unique geometry group and shows a color gradient from
rarely to frequently failing locations.
Comparison and stacking are computed by `POST /api/wafers/compare` and
`POST /api/wafers/stack`; the wafer collection is held in browser memory and is
not persisted.

## Geometry behavior

All dimensions and offsets are in micrometres. Layouts use UCS shot indices,
shot origins, inclusive four-corner checks against the usable wafer circle,
and UCS notch rotations. Each valid shot is an individually selectable unit
in this initial phase and is presented as a die in the UI.
