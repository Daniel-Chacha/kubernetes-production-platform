
import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  cookieOptions,
  isSameOriginRequest,
  REFRESH_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from "@/lib/auth";
import { djangoRequest } from "@/lib/api";

type TokenResponse = {
  access?: unknown;
  refresh?: unknown;
};

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { detail: "Invalid request origin." },
      { status: 403 },
    );
  }

  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refresh) {
    return NextResponse.json(
      { detail: "Your session has expired. Please log in again." },
      { status: 401 },
    );
  }

  try {
    const { response, data } = await djangoRequest(
      "/api/auth/token/refresh/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      },
    );

    if (!response.ok) {
      const result = NextResponse.json(
        { detail: "Your session has expired. Please log in again." },
        { status: 401 },
      );

      result.cookies.set(ACCESS_COOKIE, "", {
        ...cookieOptions(request, 0),
        maxAge: 0,
      });
      result.cookies.set(REFRESH_COOKIE, "", {
        ...cookieOptions(request, 0),
        maxAge: 0,
      });

      return result;
    }

    const tokens = data as TokenResponse;

    if (typeof tokens.access !== "string") {
      return NextResponse.json(
        { detail: "Invalid token response." },
        { status: 502 },
      );
    }

    const result = NextResponse.json({ ok: true });

    result.cookies.set(
      ACCESS_COOKIE,
      tokens.access,
      cookieOptions(request, ACCESS_TOKEN_MAX_AGE),
    );

    // SimpleJWT returns a replacement refresh token when rotation is
    // enabled. If it does not, preserve the existing refresh token.
    if (typeof tokens.refresh === "string") {
      result.cookies.set(
        REFRESH_COOKIE,
        tokens.refresh,
        cookieOptions(request, REFRESH_TOKEN_MAX_AGE),
      );
    }

    return result;
  } catch {
    return NextResponse.json(
      { detail: "The authentication service is unavailable." },
      { status: 502 },
    );
  }
}
