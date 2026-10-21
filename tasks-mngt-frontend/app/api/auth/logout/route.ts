
import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  cookieOptions,
  isSameOriginRequest,
  REFRESH_COOKIE,
} from "@/lib/auth";
import { djangoRequest } from "@/lib/api";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { detail: "Invalid request origin." },
      { status: 403 },
    );
  }

  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (refresh) {
    try {
      await djangoRequest("/api/auth/logout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      // Clear local cookies even if Django is unavailable.
    }
  }

  const result = NextResponse.json({ ok: true });

  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    result.cookies.set(name, "", {
      ...cookieOptions(request, 0),
      maxAge: 0,
    });
  }

  return result;
}
