
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

type RegistrationBody = {
  username?: unknown;
  email?: unknown;
  password?: unknown;
};

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

  let body: RegistrationBody;

  try {
    body = (await request.json()) as RegistrationBody;
  } catch {
    return NextResponse.json(
      { detail: "A valid JSON body is required." },
      { status: 400 },
    );
  }

  if (
    typeof body.username !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    !body.username.trim() ||
    !body.email.trim() ||
    !body.password
  ) {
    return NextResponse.json(
      { detail: "Username, email, and password are required." },
      { status: 400 },
    );
  }

  const username = body.username.trim();
  const email = body.email.trim().toLowerCase();
  const password = body.password;

  try {
    const registration = await djangoRequest(
      "/api/auth/register/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      },
    );

    if (!registration.response.ok) {
      return NextResponse.json(
        {
          detail:
            typeof registration.data === "object" &&
            registration.data !== null
              ? registration.data
              : "Registration failed.",
        },
        { status: registration.response.status },
      );
    }

    const login = await djangoRequest("/api/auth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!login.response.ok) {
      return NextResponse.json(
        {
          detail:
            "Your account was created, but automatic login failed. Please log in.",
          accountCreated: true,
        },
        { status: 502 },
      );
    }

    const tokens = login.data as TokenResponse;

    if (
      typeof tokens.access !== "string" ||
      typeof tokens.refresh !== "string"
    ) {
      return NextResponse.json(
        { detail: "The authentication service returned an invalid response." },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      { ok: true },
      { status: 201 },
    );

    response.cookies.set(
      ACCESS_COOKIE,
      tokens.access,
      cookieOptions(request, ACCESS_TOKEN_MAX_AGE),
    );

    response.cookies.set(
      REFRESH_COOKIE,
      tokens.refresh,
      cookieOptions(request, REFRESH_TOKEN_MAX_AGE),
    );

    return response;
  } catch {
    return NextResponse.json(
      { detail: "The authentication service is unavailable." },
      { status: 502 },
    );
  }
}

