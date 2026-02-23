import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_AUDIO_TYPES = [
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
  "audio/mp3", "audio/m4a", "audio/aac", "audio/wav",
  "audio/x-m4a", "audio/x-wav",
  "video/webm", // some browsers report webm audio as video/webm
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_VIDEO_TYPES = [
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska",
];
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB

export const POST = withTenant(async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type) || file.name.match(/.(mp4|webm|mov|mkv)$/i);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type) ||
      file.name.match(/\.(webm|ogg|mp3|m4a|aac|wav|mpeg)$/i);

    if (!isImage && !isAudio && !isVideo) {
      return NextResponse.json(
        { error: "Type non autorise (images, audio ou video)" },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : isAudio ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${isVideo ? "30" : isAudio ? "10" : "5"}MB max)` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    if (isVideo) {
      const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "mp4";
      const filename = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await writeFile(path.join(uploadDir, filename), buffer);
      return NextResponse.json({ url: `/uploads/${filename}` });
    }

    if (isAudio) {
      // Save audio directly (no processing)
      const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "webm";
      const filename = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await writeFile(path.join(uploadDir, filename), buffer);
      return NextResponse.json({ url: `/uploads/${filename}` });
    }

    // Process image with sharp
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
    await writeFile(path.join(uploadDir, filename), finalBuffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
  }
});
