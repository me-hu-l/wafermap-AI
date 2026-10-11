You are working on a new full-stack application called WaferMap AI.

PROJECT GOAL
Build an interactive semiconductor wafer-map analysis application.

The application allows a user to:
1. Define a custom wafer layout.
2. Specify wafer diameter, die width, die height, center offset X/Y,
   edge exclusion, notch orientation and other geometry parameters.
3. Render the resulting wafer layout interactively.
4. Manually select individual dies as failing by clicking them.
5. Calculate wafer yield and electrical defect density (D0) from the
   selected failing dies.
6. Run an existing CNN wafer-map classifier on the resulting wafer map.
7. Display predicted defect pattern and prediction confidence.
8. Display Grad-CAM explainability for the CNN prediction.
9. Add multiple wafers and compare them side-by-side.
10. Stack multiple wafers using their common die coordinates to identify
    spatially important/recurrently failing dies.
11. Display yield and D0 comparisons/Pareto analyses across the wafers.

TECH STACK
Frontend:
- Next.js
- React
- TypeScript
- Use a clean component-based architecture.
- Use the existing project's preferred styling/component approach if one
  already exists.

Backend:
- Python
- FastAPI
- Pydantic
- No database.
- No persistent backend storage for now.
- Keep business logic in backend services rather than duplicating it
  inside the frontend.

ML:
- PyTorch.
- An already-trained baseline CNN will be provided as a .pth/.pt model.
- DO NOT retrain or modify the model.
- DO NOT invent the preprocessing pipeline or class mapping.
- The model's exact input representation, preprocessing, output class
  ordering, and architecture will be provided from the training code.
- Treat the trained CNN as an inference component.

IMPORTANT REFERENCE REPOSITORY
There is another local repository containing an already implemented
custom wafer-layout/geometry system.

That repository is the REFERENCE IMPLEMENTATION for wafer geometry.

Before implementing wafer-layout functionality:
1. Inspect the reference repository.
2. Understand how it calculates valid die locations from wafer diameter,
   die dimensions, center offsets, edge exclusion, etc.
3. Understand its coordinate system, wafer center convention,
   die indexing, and boundary/edge handling.
4. Understand how it renders or represents the wafer layout.
5. Replicate the relevant behavior in this new application.

Do NOT modify the reference repository.
Do NOT independently invent a second wafer geometry algorithm if the
reference repository already implements the required behavior.
The new application should reproduce the same geometry/results.

If something in the reference implementation is unclear, inspect more
of the repository before making assumptions.

ARCHITECTURAL PRINCIPLES

Separate these concerns:

1. Wafer geometry
   - wafer dimensions
   - die coordinates
   - valid/invalid dies
   - edge exclusion
   - center offsets
   - coordinate transformations

2. Wafer state
   - selected failing dies
   - wafer metadata
   - wafer ID/name
   - analysis results

3. Wafer metrics
   - total valid dies
   - failing dies
   - yield
   - D0
   - other derived metrics

4. ML inference
   - conversion of wafer state into CNN input
   - model inference
   - class probabilities
   - predicted class
   - confidence
   - Grad-CAM

5. Multi-wafer analytics
   - wafer comparison
   - stacking
   - failure frequency by die coordinate
   - Pareto analysis

Do not mix these responsibilities.

BACKEND API

Design clean REST endpoints using Pydantic request/response models.

Potential endpoint structure:

- POST /api/wafers/layout
- POST /api/wafers/metrics
- POST /api/inference/predict
- POST /api/inference/gradcam
- POST /api/wafers/compare
- POST /api/wafers/stack

You may adjust endpoint names if a cleaner architecture is appropriate.

Every API request and response should have explicit Pydantic models.
Avoid untyped dictionaries wherever a proper schema can be defined.

FRONTEND REQUIREMENTS

The UI should feel like an engineering analysis tool rather than a
generic dashboard.

The main workflow should be:

Create/configure wafer
        ↓
Interactive wafer layout
        ↓
Select failing dies
        ↓
View yield/D0
        ↓
Run AI classification
        ↓
View prediction/confidence/Grad-CAM
        ↓
Add additional wafers
        ↓
Compare wafers
        ↓
Stack wafers
        ↓
Analyze recurrent failing die locations
        ↓
View yield/D0 Pareto

The wafer visualization must be interactive.

Each valid die should be individually addressable/clickable.

The frontend should distinguish clearly between:
- valid die
- non-existent/outside-wafer area
- normal die
- manually selected failing die
- selected/highlighted die during analysis

Do not use a static image of a wafer if the existing geometry can be
rendered as interactive SVG/canvas elements.

PERFORMANCE

The wafer layout may contain many dies.

Do not create unnecessarily expensive React state updates for every
interaction.

Use appropriate memoization/component decomposition and choose SVG,
Canvas, or another rendering approach based on the requirements and
existing reference implementation.

Do not prematurely optimize, but avoid obviously inefficient
per-die rendering/state patterns.

CURRENT ML MODEL

The baseline CNN currently achieves approximately:
- 96.2% overall test accuracy.
- Approximately 80% accuracy on the subset of test wafers containing
  actual defects.
- Approximately 15% of the test set contains actual defects.

These numbers are contextual only. Do not hard-code them into the
application.

The current priority is NOT improving the CNN.

The priority is to integrate the existing baseline model into a complete
end-to-end application.

Later, the CNN may be replaced with improved models without requiring
major frontend/backend architectural changes.

D0 / YIELD

Implement these as backend domain calculations.

Do not derive them from CNN predictions.

The user-selected failing dies represent the observed failing dies for
the wafer.

The metric calculation should use the valid die count from the wafer
geometry.

Implement the exact Poisson-based D0 formula specified by the project
requirements rather than inventing an alternative definition.

Keep the calculation isolated in a testable service.

TESTING

Create unit tests for:
- wafer geometry
- edge exclusion
- center offsets
- valid die generation
- yield calculation
- D0 calculation
- coordinate transformations
- multi-wafer stacking

For geometry tests, use examples/results from the reference repository
where possible.

Do not write superficial tests that merely assert that functions run.

PROJECT STRUCTURE

Use a clean separation such as:

frontend/
backend/

Backend should have clear modules for:
- API/routes
- schemas
- services
- ML/inference
- domain calculations
- configuration

Frontend should have clear modules for:
- pages/routes
- wafer visualization
- wafer configuration
- wafer state
- analytics
- API client
- reusable UI components

Do not introduce a database, authentication, cloud infrastructure,
background workers, Redis, Docker orchestration, or other infrastructure
unless explicitly requested.

IMPORTANT DEVELOPMENT PROCESS

Do not implement the entire application blindly in one pass.

First inspect:
1. The current repository.
2. The reference wafer-layout repository.
3. The existing CNN/model files once provided.

Then propose a concise implementation plan and identify any assumptions.

After that, implement incrementally.

Start with:
PHASE 1:
- project structure
- frontend/backend setup
- reference wafer geometry replication
- custom wafer configuration
- interactive wafer rendering
- manual failing-die selection

Do not start with CNN, Grad-CAM, stacking, or Pareto analysis until
the wafer geometry and interactive die-selection workflow are working
correctly.

For every major phase:
- explain what files you will create/change
- implement it
- run/build/test it
- fix errors
- then proceed

Do not silently rewrite working parts of the project.
Prefer small, understandable changes over large generated files.

Before writing new geometry code, inspect and reuse concepts from the
reference repository.

## Current implementation status

- Phase 1 geometry and interactive UCS-shot selection are implemented.
- Phase 2 model integration is implemented: shot selections are converted to
  a square categorical map, resized/encoded per the notebook, classified by
  the saved CNN, and shown with probabilities for every class.
- Phase 3 explainability is implemented: Grad-CAM uses the final convolution
  block and its heatmap is rescaled to the submitted map dimensions and
  displayed beside the wafer layout.
- The current selection granularity is one UCS shot per map cell. Individual
  die geometry/selection and multi-wafer analysis are still future phases.