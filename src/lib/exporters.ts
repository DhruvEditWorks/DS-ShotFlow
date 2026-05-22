import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import type { ExportPayload, Shot } from "@/types/shotflow";

function shotRows(shots: Shot[]) {
  return shots
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((shot) => ({
      Scene: shot.sceneNumber,
      Shot: shot.shotNumber,
      Description: shot.description,
      Subject: shot.subject,
      "Shot Size": shot.shotSize,
      "Shot Type": shot.shotType,
      Movement: shot.movement,
      Duration: shot.duration,
      Lens: shot.lens || "",
      FPS: shot.fps || "",
      Audio: shot.audio || "",
      Lighting: shot.lighting || "",
      Notes: shot.notes || "",
      Props: shot.props || "",
      VFX: shot.vfx || "",
      "Camera Height": shot.cameraHeight || "",
      Image: shot.imageUrl || "",
      Status: shot.status
    }));
}

export function exportCsv(payload: ExportPayload) {
  const rows = shotRows(payload.shots);
  const headers = Object.keys(rows[0] || { Scene: "", Shot: "" });
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(","))].join("\n");
}

export function exportExcel(payload: ExportPayload) {
  const workbook = XLSX.utils.book_new();
  const scenes = payload.scenes.length ? payload.scenes : payload.scene ? [payload.scene] : [];

  for (const scene of scenes) {
    const rows = shotRows(payload.shots.filter((shot) => shot.sceneId === scene.id));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Scene: scene.number, Shot: "", Description: "No shots" }]);
    XLSX.utils.book_append_sheet(workbook, sheet, `Scene ${scene.number}`.slice(0, 31));
  }

  if (workbook.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(shotRows(payload.shots)), "Shotlist");
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function drawShotImage(doc: PDFKit.PDFDocument, imageUrl: string | undefined, x: number, y: number) {
  doc.roundedRect(x, y, 78, 44, 4).strokeColor("#393a40").stroke();
  if (!imageUrl) {
    doc.fillColor("#777").fontSize(7).text("No image", x + 22, y + 18);
    return;
  }

  if (imageUrl.startsWith("data:image")) {
    const [, payload] = imageUrl.split(",");
    const buffer = Buffer.from(payload, "base64");
    doc.image(buffer, x + 2, y + 2, { width: 74, height: 40 });
    return;
  }

  doc.fillColor("#d71920").fontSize(6).text("Image linked", x + 18, y + 15);
}

export async function exportPdf(payload: ExportPayload) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 34, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#070707");
    doc.fillColor("#ffffff").fontSize(22).text("DS SHOTFLOW", 34, 32);
    doc.fillColor("#d71920").fontSize(10).text("PRODUCTION SHOTLIST", 36, 58);
    doc.moveTo(34, 78).lineTo(578, 78).strokeColor("#d71920").lineWidth(1).stroke();

    doc.fillColor("#ffffff").fontSize(16).text(payload.title, 34, 96);
    if (payload.scene) {
      doc.fillColor("#cfcfd4").fontSize(10).text(`Scene ${payload.scene.number}: ${payload.scene.heading}`, 34, 118);
    }

    let y = 148;
    const rows = payload.shots.slice().sort((a, b) => a.order - b.order);

    for (const shot of rows) {
      if (y > 690) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill("#070707");
        y = 42;
      }
      doc.roundedRect(34, y, 544, 76, 6).fillAndStroke("#111114", "#2b2c31");
      drawShotImage(doc, shot.imageUrl, 46, y + 15);
      doc.fillColor("#ffffff").fontSize(12).text(`${shot.shotNumber}  ${shot.shotSize} / ${shot.shotType}`, 138, y + 14, { width: 250 });
      doc.fillColor("#d71920").fontSize(8).text(`${shot.movement}  |  ${shot.duration}  |  ${shot.status}`, 138, y + 31);
      doc.fillColor("#d9d9df").fontSize(8).text(shot.description || "No description", 138, y + 45, { width: 300, height: 24 });
      doc.fillColor("#aaaaaf").fontSize(7).text(shot.notes || shot.lighting || "", 452, y + 14, { width: 104, height: 50 });
      y += 88;
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(i);
      doc.fillColor("#777").fontSize(8).text(`Page ${i + 1} of ${pages.count}`, 500, 750);
      doc.fillColor("#d71920").fontSize(8).text("DS ShotFlow", 34, 750);
    }

    doc.end();
  });
}
