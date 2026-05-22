import { NextResponse } from "next/server";
import { exportCsv, exportExcel, exportPdf } from "@/lib/exporters";
import type { ExportPayload } from "@/types/shotflow";

export const runtime = "nodejs";

function filename(title: string, extension: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "shotlist"}.${extension}`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ExportPayload;
    const format = payload.format;

    if (format === "json") {
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          "content-type": "application/json",
          "content-disposition": `attachment; filename="${filename(payload.title, "json")}"`
        }
      });
    }

    if (format === "csv") {
      return new NextResponse(exportCsv(payload), {
        headers: {
          "content-type": "text/csv",
          "content-disposition": `attachment; filename="${filename(payload.title, "csv")}"`
        }
      });
    }

    if (format === "xlsx") {
      return new NextResponse(exportExcel(payload), {
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="${filename(payload.title, "xlsx")}"`
        }
      });
    }

    const pdf = await exportPdf(payload);
    return new NextResponse(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename(payload.title, "pdf")}"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed." }, { status: 500 });
  }
}
