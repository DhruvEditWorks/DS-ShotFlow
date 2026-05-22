import { NextResponse } from "next/server";
import { parseFdx } from "@/lib/fdx-parser";
import { parsePlainScreenplay } from "@/lib/screenplay-parser";

export const runtime = "nodejs";

async function parsePdf(buffer: Buffer) {
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule.default || pdfModule) as unknown as (data: Buffer) => Promise<{ text: string }>;
  const parsed = await pdfParse(buffer);
  return parsePlainScreenplay(parsed.text);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a screenplay file." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString("utf8");
    const scenes =
      extension === "fdx"
        ? parseFdx(text)
        : extension === "pdf"
          ? await parsePdf(buffer)
          : parsePlainScreenplay(text);

    return NextResponse.json({
      sourceName: file.name,
      sourceType: extension || "txt",
      scenes
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import script." }, { status: 500 });
  }
}
