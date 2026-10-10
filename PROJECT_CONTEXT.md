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
Current objective is application integration, not model improvement.

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