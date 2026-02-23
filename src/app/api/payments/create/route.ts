import { NextResponse } from "next/server";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST() {
  return NextResponse.json({ error: "Paiement en ligne desactive. Utilisez MTN MoMo via USSD." }, { status: 410 });
});
