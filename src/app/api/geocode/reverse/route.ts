import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat et lon requis" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "fr",
          "User-Agent": "TerranoGPS/1.0 (terranogps.thostplus.work)",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ display_name: `${lat}, ${lon}` });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ display_name: `${lat}, ${lon}` });
  }
});
