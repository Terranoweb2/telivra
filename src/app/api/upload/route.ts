import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const POST = withTenant(async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MANAGER"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Type de fichier non autorisé (jpeg, png, webp, gif)" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (5MB max)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Optimiser avec Sharp : redimensionner + convertir WebP
    let finalBuffer: Buffer;
    let finalExt: string;

    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(buffer);
      const metadata = await img.metadata();

      // Redimensionner si > 1200px de large
      const resized = metadata.width && metadata.width > 1200
        ? img.resize(1200, undefined, { withoutEnlargement: true })
        : img;

      if (file.type === "image/png") {
        finalBuffer = await resized.png({ quality: 85 }).toBuffer();
        finalExt = "png";
      } else {
        finalBuffer = await resized.webp({ quality: 80 }).toBuffer();
        finalExt = "webp";
      }
    } catch {
      // Fallback si sharp échoue
      finalBuffer = buffer;
      const rawExt = file.name.split(".").pop() || "jpg";
      finalExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "jpg";
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${finalExt}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, finalBuffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
});
