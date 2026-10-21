
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "A valid JSON body is required." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("username" in body) ||
    !("password" in body) ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    !body.username.trim() ||
    !body.password
  ) {
    return NextResponse.json(
      { detail: "Username and password are required." },
      { status: 400 },
    );
  }

  try {
    const { response, data } = await djangoRequest(
      "/api/auth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: body.username.trim(),
          password: body.password,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { detail: "Invalid username or password." },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { detail: "Login could not be completed." },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const tokens = data as TokenResponse;

    if (
      typeof tokens.access !== "string" ||
      typeof tokens.refresh !== "string"
    ) {
      return NextResponse.json(
        { detail: "The authentication service returned an invalid response." },
        { status: 502 },
      );
    }

    const result = NextResponse.json({ ok: true });

    result.cookies.set(
      ACCESS_COOKIE,
      tokens.access,
      cookieOptions(request, ACCESS_TOKEN_MAX_AGE),
    );

    result.cookies.set(
      REFRESH_COOKIE,
      tokens.refresh,
      cookieOptions(request, REFRESH_TOKEN_MAX_AGE),
    );

    return result;
  } catch {
    return NextResponse.json(
      { detail: "The authentication service is unavailable." },
      { status: 502 },
    );
  }
}

