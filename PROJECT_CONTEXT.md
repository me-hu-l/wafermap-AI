# WaferMap AI — Project Context

## Goal

Interactive semiconductor wafer-map analysis and AI classification.

## Current ML Model

Baseline CNN:
- Test accuracy: ~96.2%
- Defect-wafer accuracy: ~80%
- Defect wafers: ~15% of test set

The model is already trained, the .pth file with weights is in ./models/plain_cnn_classifier_v1.pth
the notebook used for training and evaluation is in ./notebooks/EDA+baseline_CNN.ipynb, use this for of any 
CNN architecture, preprocessing, resizing of wafer maps, and class mapping should be referenced from this notebook, the CNN takes (26,26) wafer maps as input, so all custom wafer maps from application must be resized accordingly before inference and the labels to classes matching also given in notebook
The integrated inference path mirrors the notebook's CNN architecture and
preprocessing: categorical states are resized to 26x26 with nearest-neighbor
interpolation, one-hot encoded to three channels, and passed to the model in
NCHW order. The response reports softmax probabilities in the notebook's
training order: Center, Donut, Edge-Loc, Edge-Ring, Loc, Near-full, Random,
Scratch, none.

For the current UI, each selectable UCS shot is treated as one classifier map
cell. The square input is padded with background cells; valid unmarked shots
are state 1 and marked failing shots are state 2. Individual-die interaction
based on physical die geometry and independent die-size configuration remain
future work.
Grad-CAM is computed from the final convolution block for the predicted class;
the normalized heatmap is resized back to the original square map dimensions
and displayed beside the wafer layout.
Current objective is application integration, not model improvement.

The UI presents each selectable UCS shot as a die while keeping the existing
shot-based geometry and API representation unchanged. Users can mark failing
dies manually or generate an arbitrary randomized subset for testing. Yield
and D0 are calculated from the valid geometry and observed failing selection
by the backend metrics service; die area is converted from µm² to cm² and
D0 is reported in defects/cm². For zero yield, D0 is mathematically unbounded
and the API represents it as null for the UI to display as infinity.

## Reference Repository

../UCS/

This repository contains the existing wafer geometry implementation.

It is READ-ONLY for this project.

The geometry implementation is the source of truth for:
- die coordinates
- wafer center
- edge exclusion
- center offsets
- valid die and shot determination
- coordinate conventions
- notch orientations

## Stack

Frontend:
Next.js + TypeScript

Backend:
FastAPI + Pydantic

ML:
PyTorch

Database:
None

Persistence:
None

## Core Concepts

Wafer
- configuration
- valid dies
- failing dies
- derived metrics

Metrics
- yield
- D0

ML
- defect-pattern classification
- confidence
- Grad-CAM

Multi-wafer
- comparison
- stacking
- recurrent failure locations
- Pareto analysis

Multi-wafer comparison and stacking are implemented. Added wafers are held in
the browser session and compared by backend endpoints. Stacking aggregates
failure frequency by common UCS shot/die coordinates. Added wafers are grouped
by exact geometry and stacked separately, including one-wafer geometry groups.