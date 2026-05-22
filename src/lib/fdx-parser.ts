import { XMLParser } from "fast-xml-parser";
import type { ParsedScene } from "@/types/shotflow";
import { parsePlainScreenplay } from "@/lib/screenplay-parser";

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function paragraphText(paragraph: Record<string, unknown>) {
  const text = paragraph.Text;
  if (Array.isArray(text)) {
    return text
      .map((item) => (typeof item === "string" ? item : typeof item === "object" && item ? Object.values(item).join("") : ""))
      .join("");
  }
  if (typeof text === "string") return text;
  if (text && typeof text === "object") return Object.values(text as Record<string, unknown>).join("");
  return "";
}

export function parseFdx(xml: string): ParsedScene[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text"
  });
  const parsed = parser.parse(xml);
  const content = parsed?.FinalDraft?.Content;
  const paragraphs = asArray<Record<string, unknown>>(content?.Paragraph);
  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let body: string[] = [];
  let number = 1;

  for (const paragraph of paragraphs) {
    const type = String(paragraph.Type || "");
    const text = paragraphText(paragraph).trim();
    if (!text) continue;

    if (/scene heading/i.test(type)) {
      if (current) {
        current.scriptText = body.join("\n").trim();
        current.synopsis = body.join(" ").slice(0, 142);
        scenes.push(current);
      }
      current = {
        number: String(number),
        heading: text.toUpperCase(),
        scriptText: ""
      };
      body = [];
      number += 1;
      continue;
    }

    if (current) {
      body.push(type ? `${type.toUpperCase()}: ${text}` : text);
    }
  }

  if (current) {
    current.scriptText = body.join("\n").trim();
    current.synopsis = body.join(" ").slice(0, 142);
    scenes.push(current);
  }

  return scenes.length ? scenes : parsePlainScreenplay(xml);
}
