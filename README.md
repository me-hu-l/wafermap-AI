# WaferMap AI

WaferMap AI is an interactive wafer-layout and analysis application. Phase 1
implements UCS-compatible shot geometry and manual shot selection; later phases
will add wafer metrics, inference, and multi-wafer analysis.

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

## Geometry behavior

All dimensions and offsets are in micrometres. Layouts use UCS shot indices,
shot origins, inclusive four-corner checks against the usable wafer circle,
and UCS notch rotations. Each valid shot is an individually selectable unit
in this initial phase.
