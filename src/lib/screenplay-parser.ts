import type { ParsedScene } from "@/types/shotflow";

const SCENE_HEADING_PATTERN =
  /^\s*((?:\d+[A-Z]?\s+)?(?:INT|EXT|EST|I\/E|INT\.\/EXT|EXT\.\/INT)[.\s/-]+.+|(?:\.\s*)?[A-Z0-9'"\- ]+\s+-\s+(?:DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|CONTINUOUS|LATER))\s*$/i;

function cleanLine(line: string) {
  return line.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}

function makeSynopsis(lines: string[]) {
  const prose = lines
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !/^(CUT TO:|FADE IN:|FADE OUT\.|DISSOLVE TO:)/i.test(line))
    .join(" ");
  return prose.length > 142 ? `${prose.slice(0, 139).trim()}...` : prose;
}

export function parsePlainScreenplay(source: string): ParsedScene[] {
  const normalized = source.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let body: string[] = [];
  let number = 1;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line) {
      if (current) body.push("");
      continue;
    }

    const isHeading = SCENE_HEADING_PATTERN.test(line) || /^#+\s*(INT|EXT|I\/E|EST)/i.test(line);

    if (isHeading) {
      if (current) {
        current.scriptText = body.join("\n").trim();
        current.synopsis = makeSynopsis(body);
        scenes.push(current);
      }
      const heading = line.replace(/^#+\s*/, "").replace(/^\d+[A-Z]?\s+/, "").trim().toUpperCase();
      const explicit = line.match(/^\s*(\d+[A-Z]?)\s+/);
      current = {
        number: explicit?.[1] ?? String(number),
        heading,
        scriptText: ""
      };
      body = [];
      number += 1;
      continue;
    }

    if (!current && line.length > 0) {
      current = {
        number: String(number),
        heading: "UNTITLED SCENE",
        scriptText: ""
      };
      number += 1;
    }

    if (current) body.push(rawLine.trimEnd());
  }

  if (current) {
    current.scriptText = body.join("\n").trim();
    current.synopsis = makeSynopsis(body);
    scenes.push(current);
  }

  if (scenes.length === 0 && normalized.trim()) {
    return [
      {
        number: "1",
        heading: "UNTITLED SCENE",
        scriptText: normalized.trim(),
        synopsis: makeSynopsis(normalized.split("\n"))
      }
    ];
  }

  return scenes;
}

export function sceneShotSeed(scene: ParsedScene, sceneId: string) {
  const text = `${scene.heading} ${scene.scriptText}`.toLowerCase();
  const isAction = /(runs?|chase|fight|escape|crash|explosion|sprint|gun|falls?)/.test(text);
  const isIntimate = /(whispers?|tears?|stares?|confesses?|silence|alone|touches?)/.test(text);
  const isReveal = /(reveals?|discovers?|opens?|sees?|finds?|enters?)/.test(text);
  const now = new Date().toISOString();

  return [
    {
      id: `${sceneId}_shot_master`,
      sceneId,
      sceneNumber: scene.number,
      shotNumber: `${scene.number}A`,
      description: `Establish the geography of ${scene.heading}.`,
      subject: scene.heading.split("-")[0]?.trim() || "Scene",
      shotSize: isAction ? "WS" : "MS",
      shotType: isReveal ? "POV" : "Single",
      movement: isAction ? "Tracking" : "Static",
      duration: isAction ? "00:06" : "00:05",
      lens: isIntimate ? "50mm" : "35mm",
      lighting: isIntimate ? "Soft motivated contrast" : "Cinematic practicals",
      notes: "Generated from screenplay import. Refine with director and DP notes.",
      status: "TODO" as const,
      order: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: `${sceneId}_shot_detail`,
      sceneId,
      sceneNumber: scene.number,
      shotNumber: `${scene.number}B`,
      description: isIntimate ? "Hold on the emotional beat and let the performance breathe." : "Capture a motivated insert or key reaction.",
      subject: isIntimate ? "Lead performance" : "Story detail",
      shotSize: isIntimate ? "CU" : "MCU",
      shotType: isIntimate ? "Shallow Focus" : "OTS",
      movement: isReveal ? "Push In" : "Static",
      duration: "00:04",
      lens: isIntimate ? "75mm" : "50mm",
      lighting: isReveal ? "Edge light reveal" : "Controlled contrast",
      notes: "Use for editorial punctuation.",
      status: "TODO" as const,
      order: 1,
      createdAt: now,
      updatedAt: now
    }
  ];
}
