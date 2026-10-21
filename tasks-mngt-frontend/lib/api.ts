
const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8081";

export type ApiResult = {
  response: Response;
  data: unknown;
};

export async function djangoRequest(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult> {
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");

  const response = await fetch(
    `${API_INTERNAL_URL}${path}`,
    {
      ...init,
      headers,
      cache: "no-store",
      redirect: "manual",
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  let data: unknown = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { detail: text.slice(0, 500) } : null;
  }

  return { response, data };
}

export function errorMessage(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail;
  }

  return "The request could not be completed.";
}

