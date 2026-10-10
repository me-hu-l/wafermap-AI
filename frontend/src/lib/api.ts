import type { WaferLayoutRequest, WaferLayoutResponse } from "@/types/wafer";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function createWaferLayout(
  request: WaferLayoutRequest,
): Promise<WaferLayoutResponse> {
  const response = await fetch(`${API_URL}/api/wafers/layout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const responseText = await response.text();
    let detail = responseText;
    try {
      const body: unknown = JSON.parse(responseText);
      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        typeof body.detail === "string"
      ) {
        detail = body.detail;
      }
    } catch {
      if (!responseText) {
        detail = "The server returned an empty error response.";
      }
    }
    throw new Error(`Layout request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as WaferLayoutResponse;
}
