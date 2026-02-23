import { NextResponse } from "next/server";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  if (!publicKey) {
    return NextResponse.json({ error: "VAPID non configure" }, { status: 500 });
  }
  return NextResponse.json({ publicKey });
});
