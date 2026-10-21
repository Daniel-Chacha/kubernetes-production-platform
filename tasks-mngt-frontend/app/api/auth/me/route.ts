
import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE } from "@/lib/auth";
import { djangoRequest } from "@/lib/api";

export async function GET(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!access) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const { response, data } = await djangoRequest(
      "/api/auth/me/",
      {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { detail: response.status === 401
            ? "Your session has expired."
            : "Could not retrieve your profile." },
        { status: response.status === 401 ? 401 : 502 },
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { detail: "The authentication service is unavailable." },
      { status: 502 },
    );
  }
}
