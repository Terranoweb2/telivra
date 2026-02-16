import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Paiement en ligne desactive. Utilisez MTN MoMo via USSD." }, { status: 410 });
}
