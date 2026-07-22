import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ParentReportData {
  studentName: string;
  studentId: string;
  testTitle: string;
  examType: string;
  testType: string;
  subject?: string | null;
  chapter?: string | null;
  completedAt: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  rank: number;
  totalStudents: number;
  timeTaken: string;
  correct: number;
  wrong: number;
  skipped: number;
  classAverage: number;
  highestScore: number;
  previousAverage: number | null;
  improvement: number | null;
  subjectBreakdown?: { subject: string; correct: number; total: number; percentage: number }[];
  strongTopics: string[];
  weakTopics: string[];
  teacherRemark?: string;
}

const BRAND = { r: 255, g: 106, b: 0 };
const DARK = { r: 15, g: 23, b: 42 };

const percentileFor = (rank: number, total: number) =>
  total > 0 ? Math.max(0, Math.min(100, ((total - rank) / total) * 100)) : 0;

const bandFor = (pct: number) => {
  if (pct >= 85) return { label: "Excellent", color: [22, 163, 74] as [number, number, number] };
  if (pct >= 70) return { label: "Very Good", color: [34, 197, 94] as [number, number, number] };
  if (pct >= 55) return { label: "Good", color: [59, 130, 246] as [number, number, number] };
  if (pct >= 40) return { label: "Needs Practice", color: [234, 179, 8] as [number, number, number] };
  return { label: "Requires Attention", color: [239, 68, 68] as [number, number, number] };
};

export const downloadParentReport = (d: ParentReportData) => {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Crackly", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Parent Performance Report", 14, 24);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString(), W - 14, 24, { align: "right" });

  // Student card
  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.roundedRect(10, 42, W - 20, 30, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(d.studentName || "Student", 16, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`ID: ${d.studentId}`, 16, 61);
  doc.text(`Test: ${d.testTitle}`, 16, 67);
  doc.setFontSize(9);
  doc.text(`${d.examType} • ${d.testType.replace("_", " ")}`, W - 16, 54, { align: "right" });
  if (d.subject) doc.text(`Subject: ${d.subject}`, W - 16, 61, { align: "right" });
  doc.text(`Date: ${d.completedAt}`, W - 16, 67, { align: "right" });

  // Score hero
  const pct = d.percentage || 0;
  const band = bandFor(pct);
  doc.setFillColor(band.color[0], band.color[1], band.color[2]);
  doc.roundedRect(10, 80, W - 20, 46, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text(`${pct.toFixed(1)}%`, W / 2, 100, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${d.score} / ${d.totalQuestions} • ${band.label}`, W / 2, 109, { align: "center" });
  doc.setFontSize(9);
  const percentile = percentileFor(d.rank, d.totalStudents);
  doc.text(
    `Rank ${d.rank} of ${d.totalStudents}   •   ${percentile.toFixed(0)}th percentile   •   ${d.timeTaken}`,
    W / 2, 119, { align: "center" }
  );

  // Class context
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Class Context", 14, 138);

  autoTable(doc, {
    startY: 141,
    head: [["Metric", "Value"]],
    body: [
      ["Your Score", `${pct.toFixed(1)}%`],
      ["Class Average", `${d.classAverage.toFixed(1)}%`],
      ["Highest in Class", `${d.highestScore.toFixed(1)}%`],
      ["Above Average By", `${(pct - d.classAverage).toFixed(1)}%`],
      d.previousAverage !== null
        ? ["Previous Average", `${d.previousAverage.toFixed(1)}%`]
        : ["Previous Average", "—"],
      d.improvement !== null
        ? ["Improvement", `${d.improvement > 0 ? "+" : ""}${d.improvement.toFixed(1)}%`]
        : ["Improvement", "First test"],
    ],
    theme: "grid",
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  let y = (doc as any).lastAutoTable.finalY + 6;

  // Answer breakdown
  autoTable(doc, {
    startY: y,
    head: [["Correct", "Wrong", "Skipped"]],
    body: [[String(d.correct), String(d.wrong), String(d.skipped)]],
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85], fontSize: 10 },
    styles: { halign: "center", fontSize: 11, fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Subject breakdown
  if (d.subjectBreakdown && d.subjectBreakdown.length) {
    if (y > 235) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Subject-wise Performance", 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["Subject", "Score", "Accuracy"]],
      body: d.subjectBreakdown.map(s => [s.subject, `${s.correct}/${s.total}`, `${s.percentage.toFixed(1)}%`]),
      theme: "striped",
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Strong / Weak topics
  if (y > 235) { doc.addPage(); y = 20; }
  const colW = (W - 32) / 2;

  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(14, y, colW, 42, 3, 3, "FD");
  doc.setTextColor(22, 101, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Strong Areas", 18, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const strongText = d.strongTopics.length ? d.strongTopics.join(", ") : "Keep building consistency across chapters.";
  doc.text(doc.splitTextToSize(strongText, colW - 8), 18, y + 14);

  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(18 + colW, y, colW, 42, 3, 3, "FD");
  doc.setTextColor(153, 27, 27);
  doc.setFont("helvetica", "bold");
  doc.text("Focus Areas", 22 + colW, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const weakText = d.weakTopics.length ? d.weakTopics.join(", ") : "No major weak topics detected in this test.";
  doc.text(doc.splitTextToSize(weakText, colW - 8), 22 + colW, y + 14);

  y += 50;

  // Teacher remark
  if (d.teacherRemark) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.roundedRect(14, y, W - 28, 34, 3, 3, "FD");
    doc.setTextColor(154, 52, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Teacher's Note", 18, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(d.teacherRemark, W - 40), 18, y + 14);
  }

  // Footer
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Crackly — JEE, NEET & CET  •  Parent Report  •  Page ${i} of ${pages}`,
      W / 2, H - 8, { align: "center" }
    );
  }

  const safeName = (d.studentName || "student").replace(/\s+/g, "_");
  const safeTitle = (d.testTitle || "test").replace(/\s+/g, "_");
  doc.save(`ParentReport_${safeName}_${safeTitle}.pdf`);
};
