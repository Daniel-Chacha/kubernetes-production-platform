
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

type ForwardResult = {
  response: Response;
  data: unknown;
  access: string;
  refresh?: string;
};

async function forwardToDjango(
  request: NextRequest,
  method: "GET" | "POST",
  body?: string,
): Promise<ForwardResult | null> {
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  let refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!access && !refresh) {
    return null;
  }

  if (!access && refresh) {
    const refreshed = await refreshAccessToken(refresh);

    if (!refreshed) {
      return null;
    }

    access = refreshed.access;
    refresh = refreshed.refresh ?? refresh;
  }

  let result = await sendTaskRequest(access!, method, body);

  if (result.response.status !== 401 || !refresh) {
    return {
      ...result,
      access: access!,
      refresh,
    };
  }

  const refreshed = await refreshAccessToken(refresh);

  if (!refreshed) {
    return null;
  }

  access = refreshed.access;
  refresh = refreshed.refresh ?? refresh;

  result = await sendTaskRequest(access, method, body);

  if (result.response.status === 401) {
    return null;
  }

  return {
    ...result,
    access,
    refresh,
  };
}

async function sendTaskRequest(
  access: string,
  method: "GET" | "POST",
  body?: string,
) {
  const headers = new Headers({
    Authorization: `Bearer ${access}`,
  });

  if (method === "POST") {
    headers.set("Content-Type", "application/json");
  }

  return djangoRequest("/api/tasks/", {
    method,
    headers,
    ...(method === "POST" ? { body } : {}),
  });
}

async function refreshAccessToken(
  refresh: string,
): Promise<{ access: string; refresh?: string } | null> {
  const { response, data } = await djangoRequest(
    "/api/auth/token/refresh/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const tokens = data as TokenResponse;

  if (typeof tokens.access !== "string") {
    return null;
  }

  return {
    access: tokens.access,
    refresh:
      typeof tokens.refresh === "string"
        ? tokens.refresh
        : undefined,
  };
}

function jsonResponse(
  data: unknown,
  status: number,
  request: NextRequest,
  tokens?: { access: string; refresh?: string },
) {
  const response = NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

  if (tokens) {
    response.cookies.set(
      ACCESS_COOKIE,
      tokens.access,
      cookieOptions(request, ACCESS_TOKEN_MAX_AGE),
    );

    if (tokens.refresh) {
      response.cookies.set(
        REFRESH_COOKIE,
        tokens.refresh,
        cookieOptions(request, REFRESH_TOKEN_MAX_AGE),
      );
    }
  }

  return response;
}

async function handleTasks(
  request: NextRequest,
  method: "GET" | "POST",
) {
  if (method === "POST" && !isSameOriginRequest(request)) {
    return NextResponse.json(
      { detail: "Invalid request origin." },
      { status: 403 },
    );
  }

  let body: string | undefined;

  if (method === "POST") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return NextResponse.json(
        { detail: "A valid JSON body is required." },
        { status: 400 },
      );
    }
  }

  try {
    const result = await forwardToDjango(request, method, body);

    if (!result) {
      const response = jsonResponse(
        { detail: "Your session has expired. Please log in again." },
        401,
        request,
      );

      response.cookies.set(ACCESS_COOKIE, "", {
        ...cookieOptions(request, 0),
        maxAge: 0,
      });
      response.cookies.set(REFRESH_COOKIE, "", {
        ...cookieOptions(request, 0),
        maxAge: 0,
      });

      return response;
    }

    return jsonResponse(
      result.data,
      result.response.status,
      request,
      {
        access: result.access,
        refresh: result.refresh,
      },
    );
  } catch {
    return NextResponse.json(
      { detail: "The task service is unavailable." },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleTasks(request, "GET");
}

export async function POST(request: NextRequest) {
  return handleTasks(request, "POST");
}
