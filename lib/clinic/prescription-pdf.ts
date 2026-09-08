import { BRAND } from "@/lib/brand/site";
import type { ClinicPrescriptionItem } from "./types";

export interface PrescriptionPdfInput {
  doctorName: string;
  specialization?: string | null;
  pmdcNumber?: string | null;
  patientName: string;
  patientCode?: string | null;
  age?: number | null;
  gender?: string | null;
  dateLabel: string;
  token?: string | null;
  diagnosis?: string | null;
  items: ClinicPrescriptionItem[];
  instructions?: string | null;
  followUp?: string | null;
  notes?: string | null;
}

function pdfEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, width = 88): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildPrescriptionPdf(input: PrescriptionPdfInput): Blob {
  const lines: string[] = [];
  const push = (text: string, size = 11) => lines.push(`${size}|${text}`);

  push(BRAND.name, 18);
  push(`${input.doctorName}${input.specialization ? `  ·  ${input.specialization}` : ""}`, 12);
  if (input.pmdcNumber) push(`PMDC ${input.pmdcNumber}`, 10);
  push(`${BRAND.phone}  ·  ${BRAND.supportEmail}  ·  ${BRAND.citiesLabel}`, 9);
  push("—", 10);
  push(
    `Patient: ${input.patientName}${input.patientCode ? ` (${input.patientCode})` : ""}    Date: ${input.dateLabel}`,
    11
  );
  push(
    `Age / Gender: ${input.age ?? "—"} / ${input.gender ?? "—"}${input.token ? `    Token: ${input.token}` : ""}`,
    11
  );
  if (input.diagnosis) push(`Diagnosis: ${input.diagnosis}`, 11);
  push("Rx", 14);

  const meds = input.items.filter((i) => i.medicine_name.trim());
  if (meds.length === 0) {
    push("No medicines listed.", 11);
  } else {
    meds.forEach((item, index) => {
      push(`${index + 1}. ${item.medicine_name}`, 12);
      const detail = [item.dose, item.frequency, item.duration].filter(Boolean).join("  ·  ");
      if (detail) push(`    ${detail}`, 10);
      if (item.instructions) push(`    ${item.instructions}`, 10);
    });
  }

  if (input.instructions) {
    push("Instructions", 12);
    wrap(input.instructions).forEach((line) => push(line, 10));
  }
  if (input.notes) {
    push("Doctor notes", 12);
    wrap(input.notes).forEach((line) => push(line, 10));
  }
  if (input.followUp) push(`Follow-up: ${input.followUp}`, 11);
  push("—", 10);
  push("Signature ______________________", 11);

  let y = 800;
  const contentOps: string[] = [];
  for (const row of lines) {
    const sep = row.indexOf("|");
    const size = Number(row.slice(0, sep));
    const text = row.slice(sep + 1);
    if (text === "—") {
      contentOps.push(`0.7 G 40 ${y} m 555 ${y} l S 0 G`);
      y -= 16;
      continue;
    }
    contentOps.push(`BT /F1 ${size} Tf 40 ${y} Td (${pdfEscape(text)}) Tj ET`);
    y -= size === 18 ? 24 : size === 14 ? 20 : 16;
    if (y < 50) break;
  }

  const stream = contentOps.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadPrescriptionPdf(input: PrescriptionPdfInput, filename: string) {
  const blob = buildPrescriptionPdf(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens a clean A4 sheet (no app header/sidebar) and prints only the Rx. */
export function printPrescriptionPad(input: PrescriptionPdfInput) {
  const meds = input.items.filter((i) => i.medicine_name.trim());
  const medHtml = meds.length
    ? meds
        .map((item) => {
          const detail = [item.dose, item.frequency, item.duration].filter(Boolean).join(" · ");
          const extra = item.instructions
            ? `<div style="font-size:12px;color:#475569">${htmlEscape(item.instructions)}</div>`
            : "";
          return `<li style="margin-bottom:12px"><strong>${htmlEscape(item.medicine_name)}</strong>${
            detail ? `<div style="color:#334155">${htmlEscape(detail)}</div>` : ""
          }${extra}</li>`;
        })
        .join("")
    : `<p style="color:#64748b">No medicines listed.</p>`;

  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Prescription — ${htmlEscape(input.patientName)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; color: #0f172a; }
      .pad { max-width: 190mm; margin: 0 auto; }
      h1 { font-size: 26px; margin: 0 0 4px; }
      .muted { color: #475569; font-size: 12px; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 14px; margin-top: 16px; }
      ol { padding-left: 22px; }
      .sign { margin-top: 64px; text-align: right; }
      .sign span { display: inline-block; width: 220px; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; color: #475569; text-align: center; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <div class="pad">
      <div style="display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #0f172a;padding-bottom:12px">
        <div>
          <h1>${htmlEscape(BRAND.name)}</h1>
          <div style="font-weight:600">${htmlEscape(input.doctorName)}</div>
          <div class="muted">${htmlEscape(
            [input.specialization, input.pmdcNumber ? `PMDC ${input.pmdcNumber}` : null]
              .filter(Boolean)
              .join(" · "),
          )}</div>
        </div>
        <div class="muted" style="text-align:right">
          <div>${htmlEscape(BRAND.phone)}</div>
          <div>${htmlEscape(BRAND.supportEmail)}</div>
        </div>
      </div>
      <div class="row">
        <div><strong>Patient:</strong> ${htmlEscape(input.patientName)}${
          input.patientCode ? ` (${htmlEscape(input.patientCode)})` : ""
        }</div>
        <div><strong>Date:</strong> ${htmlEscape(input.dateLabel)}</div>
        <div><strong>Age / Gender:</strong> ${htmlEscape(String(input.age ?? "—"))} / ${htmlEscape(
          input.gender ?? "—",
        )}</div>
        <div><strong>Token:</strong> ${htmlEscape(input.token ?? "—")}</div>
      </div>
      ${
        input.diagnosis
          ? `<p style="margin-top:14px;font-size:14px"><strong>Diagnosis:</strong> ${htmlEscape(input.diagnosis)}</p>`
          : ""
      }
      <p style="font-family:Georgia,serif;font-size:28px;margin:20px 0 8px">℞</p>
      <ol>${medHtml}</ol>
      ${
        input.instructions
          ? `<p style="font-size:14px"><strong>Instructions:</strong> ${htmlEscape(input.instructions)}</p>`
          : ""
      }
      ${
        input.notes
          ? `<p style="font-size:14px"><strong>Notes:</strong> ${htmlEscape(input.notes)}</p>`
          : ""
      }
      ${
        input.followUp
          ? `<p style="font-size:14px"><strong>Follow-up:</strong> ${htmlEscape(input.followUp)}</p>`
          : ""
      }
      <div class="sign"><span>Doctor signature</span></div>
    </div>
  </body>
</html>`;

  const printWindow = window.open("", "_blank", "width=820,height=1000");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}
