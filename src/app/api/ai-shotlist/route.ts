import { NextResponse } from "next/server";
import { generateAIShotlist } from "@/lib/ai-shotlist";
import { requireUser } from "@/lib/supabase/server";
import type { SceneCard } from "@/types/shotflow";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = (await request.json()) as { scene?: SceneCard };
    if (!body.scene) {
      return NextResponse.json({ error: "Scene is required." }, { status: 400 });
    }
    const shots = await generateAIShotlist(body.scene);
    return NextResponse.json({ shots });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI shotlist generation failed." }, { status: 500 });
  }
}
