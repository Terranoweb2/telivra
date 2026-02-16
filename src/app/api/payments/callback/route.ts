import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "FedaPay désactivé" }, { status: 410 });
}
