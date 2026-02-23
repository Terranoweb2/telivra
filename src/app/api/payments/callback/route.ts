import { NextResponse } from "next/server";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET() {
  return NextResponse.json({ error: "FedaPay désactivé" }, { status: 410 });
});
