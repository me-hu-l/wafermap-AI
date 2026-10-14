import type {
  WaferLayoutRequest,
  WaferLayoutResponse,
  WaferMapPredictionRequest,
  WaferMapPredictionResponse,
  WaferMetricsRequest,
  WaferMetricsResponse,
  WaferAnalysisInput,
  WaferComparisonResponse,
  WaferStackResponse,
} from "@/types/wafer";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function throwApiError(response: Response, action: string): Promise<never> {
  const responseText = await response.text();
  let detail = responseText || "The server returned an empty error response.";

  try {
    const body: unknown = JSON.parse(responseText);
    if (typeof body === "object" && body !== null && "detail" in body) {
      detail =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail);
    }
  } catch {
    // Keep the original response text when the server does not return JSON.
  }

  throw new Error(`${action} failed (${response.status}): ${detail}`);
}

export async function createWaferLayout(
  request: WaferLayoutRequest,
): Promise<WaferLayoutResponse> {
  const response = await fetch(`${API_URL}/api/wafers/layout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    await throwApiError(response, "Layout request");
  }

  return (await response.json()) as WaferLayoutResponse;
}

export async function predictWaferMap(
  request: WaferMapPredictionRequest,
): Promise<WaferMapPredictionResponse> {
  const response = await fetch(`${API_URL}/api/inference/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    await throwApiError(response, "Wafer classification");
  }

  return (await response.json()) as WaferMapPredictionResponse;
}

export async function calculateWaferMetrics(
  request: WaferMetricsRequest,
  signal?: AbortSignal,
): Promise<WaferMetricsResponse> {
  const response = await fetch(`${API_URL}/api/wafers/metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    await throwApiError(response, "Wafer metrics");
  }

  return (await response.json()) as WaferMetricsResponse;
}

export async function compareWafers(
  wafers: WaferAnalysisInput[],
  signal?: AbortSignal,
): Promise<WaferComparisonResponse> {
  const response = await fetch(`${API_URL}/api/wafers/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wafers }),
    signal,
  });

  if (!response.ok) {
    await throwApiError(response, "Wafer comparison");
  }

  return (await response.json()) as WaferComparisonResponse;
}

export async function stackWafers(
  wafers: WaferAnalysisInput[],
  signal?: AbortSignal,
): Promise<WaferStackResponse> {
  const response = await fetch(`${API_URL}/api/wafers/stack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wafers }),
    signal,
  });

  if (!response.ok) {
    await throwApiError(response, "Wafer stacking");
  }

  return (await response.json()) as WaferStackResponse;
}
