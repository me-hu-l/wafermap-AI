# WaferMap AI

WaferMap AI is an interactive wafer-layout and analysis application. It
implements UCS-compatible shot geometry, manual shot selection, and CNN
classification of the selected wafer pattern. Wafer metrics and multi-wafer
analysis remain planned.

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

## CNN wafer classification

The backend loads `models/plain_cnn_classifier_v1.pth` on the first prediction
request and reuses the model for subsequent requests. The classifier follows
the architecture and preprocessing in
[`notebooks/EDA+baseline_CNN.ipynb`](./notebooks/EDA+baseline_CNN.ipynb):
the categorical 0/1/2 map is resized with nearest-neighbor interpolation to
26×26, one-hot encoded into three channels, and evaluated as an NCHW tensor.

After generating a layout and marking failing shots, choose **Classify wafer
map** to view the predicted pattern, its confidence, and probabilities for
all nine classes. The API endpoint is `POST /api/inference/predict`; its
`wafer_map` input must be a square matrix containing only 0 (background),
1 (passing), and 2 (failing). In the current phase, each selectable UCS shot
is one input map cell.

## Geometry behavior

All dimensions and offsets are in micrometres. Layouts use UCS shot indices,
shot origins, inclusive four-corner checks against the usable wafer circle,
and UCS notch rotations. Each valid shot is an individually selectable unit
in this initial phase.
