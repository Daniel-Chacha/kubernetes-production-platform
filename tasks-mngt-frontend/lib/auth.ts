
import type { NextRequest } from "next/server";

export const ACCESS_COOKIE = "taskflow_access";
export const REFRESH_COOKIE = "taskflow_refresh";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 24 * 60 * 60;

export function cookieOptions(
  request: NextRequest,
  maxAge: number,
) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  const secure =
    forwardedProtocol === "https" ||
    request.nextUrl.protocol === "https:";

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}


export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) return false;

  try {
    const parsedOrigin = new URL(origin);

    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();

    const host =
      forwardedHost ||
      request.headers.get("host");

    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();

    const protocol = forwardedProtocol
      ? `${forwardedProtocol.replace(/:$/, "")}:`
      : request.nextUrl.protocol;

    if (!host || !["http:", "https:"].includes(protocol)) {
      return false;
    }

    const expectedOrigin = new URL(`${protocol}//${host}`);

    return parsedOrigin.origin === expectedOrigin.origin;
  } catch {
    return false;
  }
}
