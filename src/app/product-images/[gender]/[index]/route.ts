import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const ALLOWED_GENDERS = new Set(["men", "women"]);

function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

export async function GET(_: Request, { params }: { params: { gender: string; index: string } }) {
  const gender = params.gender?.toLowerCase();
  if (!ALLOWED_GENDERS.has(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  const index = Number(params.index);
  if (!Number.isFinite(index) || index <= 0) {
    return NextResponse.json({ error: "Invalid index" }, { status: 400 });
  }

  const dirName = gender === "men" ? "Men_photos" : "woman_photos";
  const filePath = path.join(repoRoot(), dirName, `${index}.jpg`);

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
