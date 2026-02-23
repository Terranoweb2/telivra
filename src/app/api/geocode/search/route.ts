import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json([], { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "fr",
          "User-Agent": "TerranoGPS/1.0 (terranogps.thostplus.work)",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
});
