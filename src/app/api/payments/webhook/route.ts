import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "FedaPay désactivé" }, { status: 410 });
}
