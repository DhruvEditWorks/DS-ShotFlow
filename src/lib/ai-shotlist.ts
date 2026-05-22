import OpenAI from "openai";
import type { AIShotSuggestion, SceneCard } from "@/types/shotflow";

function fallbackSuggestions(scene: SceneCard): AIShotSuggestion[] {
  const text = `${scene.heading} ${scene.scriptText || ""}`.toLowerCase();
  const kinetic = /(run|chase|fight|escape|crash|crowd|rush|panic)/.test(text);
  const emotional = /(quiet|tears|whisper|alone|confess|memory|afraid)/.test(text);
  const reveal = /(reveal|discover|find|open|enter|door|turns)/.test(text);

  return [
    {
      description: `Establish ${scene.heading} with clear geography and production design texture.`,
      subject: scene.heading.split("-")[0]?.trim() || "Location",
      shotSize: kinetic ? "WS" : "MS",
      shotType: "Eye Level",
      movement: kinetic ? "Tracking" : "Static",
      duration: kinetic ? "00:06" : "00:05",
      lens: kinetic ? "24mm" : "35mm",
      lighting: "Motivated contrast with controlled red accent",
      notes: "AI fallback composition: hold enough negative space for editorial breathing.",
      cameraHeight: "Eye Level",
      framing: "Single",
      focus: "Deep Focus"
    },
    {
      description: emotional ? "Push into the character for the emotional turn." : "Capture a story beat insert that can bridge the edit.",
      subject: emotional ? "Lead character" : "Key prop or action",
      shotSize: emotional ? "CU" : "MCU",
      shotType: emotional ? "Shallow Focus" : "OTS",
      movement: reveal ? "Push In" : "Static",
      duration: "00:04",
      lens: emotional ? "75mm" : "50mm",
      lighting: emotional ? "Soft key with deep falloff" : "Hard practical edge",
      notes: "Use as the scene's punctuation shot.",
      cameraHeight: emotional ? "Shoulder Level" : "Eye Level",
      framing: emotional ? "Single" : "OTS",
      focus: emotional ? "Shallow Focus" : "Rack Focus"
    },
    {
      description: reveal ? "Design the reveal with a motivated camera move and delayed focus handoff." : "Get a clean reaction angle for continuity and pacing.",
      subject: reveal ? "Reveal" : "Reaction",
      shotSize: reveal ? "WS" : "MCU",
      shotType: reveal ? "POV" : "Two Shot",
      movement: reveal ? "Dolly" : "Pan",
      duration: reveal ? "00:07" : "00:03",
      lens: reveal ? "32mm" : "50mm",
      lighting: reveal ? "Backlight silhouette into detail" : "Balanced contrast",
      notes: "Suggested for timeline rhythm and coverage safety.",
      cameraHeight: reveal ? "Low Angle" : "Eye Level",
      framing: reveal ? "POV" : "Two Shot",
      focus: reveal ? "Rack Focus" : "Deep Focus"
    }
  ];
}

export async function generateAIShotlist(scene: SceneCard): Promise<AIShotSuggestion[]> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackSuggestions(scene);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a senior director and cinematographer. Return JSON with key shots, an array of 4-7 shot suggestions for a professional film shotlist. Keep values concise."
      },
      {
        role: "user",
        content: JSON.stringify({
          scene: {
            number: scene.number,
            heading: scene.heading,
            synopsis: scene.synopsis,
            scriptText: scene.scriptText
          },
          requiredFields: [
            "description",
            "subject",
            "shotSize",
            "shotType",
            "movement",
            "duration",
            "lens",
            "lighting",
            "notes",
            "cameraHeight",
            "framing",
            "focus"
          ]
        })
      }
    ]
  });

  const content = response.choices[0]?.message.content;
  if (!content) return fallbackSuggestions(scene);

  try {
    const parsed = JSON.parse(content) as { shots?: AIShotSuggestion[] };
    return parsed.shots?.length ? parsed.shots : fallbackSuggestions(scene);
  } catch {
    return fallbackSuggestions(scene);
  }
}
