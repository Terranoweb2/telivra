import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Type non autorise (jpeg, png, webp, gif)" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (5MB max)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let finalBuffer: Buffer;
    let finalExt: string;
    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(buffer);
      const metadata = await img.metadata();
      const resized = metadata.width && metadata.width > 1200
        ? img.resize(1200, undefined, { withoutEnlargement: true })
        : img;
      finalBuffer = await resized.webp({ quality: 75 }).toBuffer();
      finalExt = "webp";
    } catch {
      finalBuffer = buffer;
      finalExt = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "jpg";
    }

    const filename = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${finalExt}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), finalBuffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
  }
}
