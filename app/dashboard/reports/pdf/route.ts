import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { requireUser } from "@/lib/session";
import { buildReport } from "@/lib/reports";
import { formatHours, labelize, roleLabel } from "@/lib/utils";

const BATA_RED = rgb(0.8, 0.133, 0.161);
const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.45, 0.45, 0.5);
const RULE = rgb(0.85, 0.85, 0.87);

const A4: [number, number] = [595.28, 841.89];
const M = 44; // page margin

/** Generates the engagement report as a real, downloadable PDF. */
export async function GET(req: Request) {
  await requireUser(["director"]);
  const period = new URL(req.url).searchParams.get("period") ?? "month";
  const data = await buildReport(period);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Bata CSR — Engagement Report (${data.periodLabel})`);
  pdf.setAuthor("Bata CSR Portal");
  pdf.setSubject("Volunteer engagement report");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage(A4);
  let y = A4[1] - M;

  const text = (
    s: string,
    opts: { x?: number; size?: number; f?: PDFFont; color?: typeof INK; maxWidth?: number } = {}
  ) => {
    const size = opts.size ?? 10;
    const f = opts.f ?? font;
    let str = s ?? "";
    if (opts.maxWidth) {
      while (str.length > 1 && f.widthOfTextAtSize(str, size) > opts.maxWidth) {
        str = str.slice(0, -2);
      }
      if (str !== s && str.length > 1) str = str.slice(0, -1) + "…";
    }
    page.drawText(str, { x: opts.x ?? M, y, size, font: f, color: opts.color ?? INK });
  };

  const room = (needed: number) => {
    if (y - needed < M + 40) {
      page = pdf.addPage(A4);
      y = A4[1] - M;
      return true;
    }
    return false;
  };

  const rule = () => {
    page.drawLine({
      start: { x: M, y: y },
      end: { x: A4[0] - M, y: y },
      thickness: 0.7,
      color: RULE,
    });
  };

  // ── Header ────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: A4[1] - 96, width: A4[0], height: 96, color: BATA_RED });
  y = A4[1] - 40;
  text("Bata CSR Portal", { size: 20, f: bold, color: rgb(1, 1, 1) });
  y -= 20;
  text("Volunteer Engagement Report", { size: 12, color: rgb(1, 0.85, 0.86) });
  y -= 16;
  text(`${data.periodLabel}  ·  generated ${data.generatedAt.toLocaleString("en-IN")}`, {
    size: 8,
    color: rgb(1, 0.85, 0.86),
  });

  y = A4[1] - 128;

  // ── Summary tiles ─────────────────────────────────────
  const tiles: [string, string][] = [
    ["Total volunteer time", formatHours(data.totalMinutes)],
    ["Activities completed", `${data.activitiesCompleted} of ${data.activitiesTotal}`],
    ["Team members engaged", `${data.engagedCount} of ${data.peopleCount}`],
    ["Attendance rate", `${data.attendanceRate}%`],
  ];
  const tileW = (A4[0] - M * 2 - 18) / 4;
  tiles.forEach(([label, value], i) => {
    const x = M + i * (tileW + 6);
    page.drawRectangle({
      x,
      y: y - 46,
      width: tileW,
      height: 46,
      color: rgb(0.97, 0.97, 0.98),
      borderColor: RULE,
      borderWidth: 0.7,
    });
    page.drawText(value, { x: x + 8, y: y - 22, size: 14, font: bold, color: INK });
    page.drawText(label, { x: x + 8, y: y - 38, size: 6.5, font, color: MUTED });
  });
  y -= 72;

  // ── Per-person table ──────────────────────────────────
  text("Engagement by team member", { size: 12, f: bold });
  y -= 6;
  rule();
  y -= 14;

  const cols = { name: M, code: 200, att: 285, conf: 335, miss: 385, hrs: 450 };
  text("Name", { x: cols.name, size: 7.5, f: bold, color: MUTED });
  text("Employee code", { x: cols.code, size: 7.5, f: bold, color: MUTED });
  text("Attended", { x: cols.att, size: 7.5, f: bold, color: MUTED });
  text("Confirmed", { x: cols.conf, size: 7.5, f: bold, color: MUTED });
  text("No-shows", { x: cols.miss, size: 7.5, f: bold, color: MUTED });
  text("Hours", { x: cols.hrs, size: 7.5, f: bold, color: MUTED });
  y -= 6;
  rule();
  y -= 13;

  if (data.people.length === 0) {
    text("No team members yet.", { size: 9, color: MUTED });
    y -= 16;
  }

  for (const p of data.people) {
    if (room(30)) {
      text("Engagement by team member (continued)", { size: 10, f: bold });
      y -= 16;
    }
    text(p.name, { x: cols.name, size: 9, f: bold, maxWidth: 150 });
    text(p.employeeCode ?? "—", { x: cols.code, size: 8, color: MUTED, maxWidth: 80 });
    text(String(p.attended), { x: cols.att, size: 9 });
    text(String(p.confirmed), { x: cols.conf, size: 9 });
    text(String(p.noShows), { x: cols.miss, size: 9, color: p.noShows > 0 ? BATA_RED : INK });
    text(formatHours(p.minutes), { x: cols.hrs, size: 9, f: bold });
    y -= 12;

    const detail = [
      p.designation || roleLabel(p.role),
      ...p.projects.slice(0, 3).map((x) => `${x.name} ${formatHours(x.minutes)}`),
      ...p.categories.slice(0, 2).map((x) => `${labelize(x.name)} ${formatHours(x.minutes)}`),
    ]
      .filter(Boolean)
      .join("  ·  ");
    if (detail) {
      text(detail, { x: cols.name + 8, size: 7, color: MUTED, maxWidth: A4[0] - M * 2 - 8 });
      y -= 11;
    }
    y -= 3;
  }

  // ── Per-project table ─────────────────────────────────
  room(120);
  y -= 10;
  text("Engagement by project", { size: 12, f: bold });
  y -= 6;
  rule();
  y -= 14;

  const pc = { name: M, ngo: 190, act: 340, vol: 400, foll: 452, hrs: 500 };
  text("Project", { x: pc.name, size: 7.5, f: bold, color: MUTED });
  text("NGO partner", { x: pc.ngo, size: 7.5, f: bold, color: MUTED });
  text("Activities", { x: pc.act, size: 7.5, f: bold, color: MUTED });
  text("Volunteers", { x: pc.vol, size: 7.5, f: bold, color: MUTED });
  text("Follows", { x: pc.foll, size: 7.5, f: bold, color: MUTED });
  text("Hours", { x: pc.hrs, size: 7.5, f: bold, color: MUTED });
  y -= 6;
  rule();
  y -= 13;

  for (const p of data.projects) {
    if (room(20)) y -= 4;
    text(p.name, { x: pc.name, size: 9, f: bold, maxWidth: 135 });
    text(p.ngoName, { x: pc.ngo, size: 8, color: MUTED, maxWidth: 145 });
    text(`${p.completed}/${p.activities}`, { x: pc.act, size: 9 });
    text(String(p.volunteers), { x: pc.vol, size: 9 });
    text(String(p.followers), { x: pc.foll, size: 9 });
    text(formatHours(p.minutes), { x: pc.hrs, size: 9, f: bold });
    y -= 15;
  }

  // ── Footers ───────────────────────────────────────────
  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(`Bata CSR Portal  ·  ${data.periodLabel}`, {
      x: M,
      y: 24,
      size: 7,
      font,
      color: MUTED,
    });
    pg.drawText("Developed by Janman People's Foundation  ·  janmanindia.org", {
      x: M,
      y: 14,
      size: 7,
      font,
      color: MUTED,
    });
    pg.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: A4[0] - M - 60,
      y: 24,
      size: 7,
      font,
      color: MUTED,
    });
  });

  const bytes = await pdf.save();
  const stamp = data.generatedAt.toISOString().slice(0, 10);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bata-csr-report-${period}-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
