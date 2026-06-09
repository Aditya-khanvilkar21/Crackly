import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QuestionSummary {
  qNo: number;
  yourAnswer: string;
  correctAnswer: string;
  status: 'Correct' | 'Incorrect' | 'Not Attempted';
}

interface ResultData {
  studentName: string;
  studentId: string;
  testTitle: string;
  testType: 'chapter_test' | 'mock_test';
  subject?: string;
  chapter?: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: string;
  completedAt: string;
  rank?: number | null;
  totalStudents?: number | null;
  subjectBreakdown?: {
    subject: string;
    correct: number;
    total: number;
    percentage: number;
  }[];
  weakTopics?: string[];
  questions?: QuestionSummary[];
}

// Strip LaTeX/markdown noise so PDF text is readable
const cleanText = (raw: string | undefined | null): string => {
  if (!raw) return '';
  let s = String(raw);
  // Remove $$...$$ and $...$ delimiters but keep inner content
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^$]*?)\$/g, '$1');
  // Common latex commands
  s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)');
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\mathrm\s*\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\times/g, 'x').replace(/\\cdot/g, '.').replace(/\\div/g, '/');
  s = s.replace(/\\pm/g, '+/-').replace(/\\approx/g, '~').replace(/\\neq/g, '!=');
  s = s.replace(/\\leq/g, '<=').replace(/\\geq/g, '>=');
  s = s.replace(/\\alpha/g, 'a').replace(/\\beta/g, 'b').replace(/\\gamma/g, 'g')
       .replace(/\\theta/g, 'th').replace(/\\pi/g, 'pi').replace(/\\lambda/g, 'lambda')
       .replace(/\\mu/g, 'mu').replace(/\\omega/g, 'w');
  s = s.replace(/\\[a-zA-Z]+/g, '');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\^/g, '^').replace(/_/g, '_');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
};

export const downloadResultAsPDF = (data: ResultData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(255, 106, 0);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Crackly Test Report', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    data.testType === 'mock_test' ? 'Mock Test Performance Report' : 'Chapter Test Performance Report',
    pageWidth / 2,
    24,
    { align: 'center' }
  );

  // Student details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Details', 14, 44);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${data.studentName || 'N/A'}`, 14, 52);
  doc.text(`Student ID: ${data.studentId || 'N/A'}`, 14, 58);
  doc.text(`Date: ${data.completedAt || 'N/A'}`, 14, 64);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Details', pageWidth / 2 + 5, 44);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Test: ${cleanText(data.testTitle).slice(0, 60)}`, pageWidth / 2 + 5, 52);
  if (data.subject) doc.text(`Subject: ${data.subject}`, pageWidth / 2 + 5, 58);
  if (data.chapter) doc.text(`Chapter: ${cleanText(data.chapter).slice(0, 50)}`, pageWidth / 2 + 5, 64);

  // Score box
  const scoreY = 76;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(14, scoreY, pageWidth - 28, 38, 4, 4, 'FD');

  doc.setTextColor(22, 163, 74);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.score} / ${data.totalQuestions}`, pageWidth / 2, scoreY + 14, { align: 'center' });
  doc.setFontSize(13);
  doc.text(`${(data.percentage || 0).toFixed(1)}% Accuracy`, pageWidth / 2, scoreY + 24, { align: 'center' });

  doc.setTextColor(75, 85, 99);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const metaLine = [
    `Time Taken: ${data.timeTaken}`,
    data.rank ? `Rank: ${data.rank}${data.totalStudents ? ` / ${data.totalStudents}` : ''}` : null,
  ].filter(Boolean).join('   |   ');
  doc.text(metaLine, pageWidth / 2, scoreY + 33, { align: 'center' });

  let cursorY = scoreY + 46;

  // Subject breakdown
  if (data.subjectBreakdown && data.subjectBreakdown.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Subject-wise Performance', 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 3,
      head: [['Subject', 'Score', 'Percentage']],
      body: data.subjectBreakdown.map(s => [s.subject, `${s.correct}/${s.total}`, `${s.percentage.toFixed(1)}%`]),
      theme: 'striped',
      headStyles: { fillColor: [255, 106, 0] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 10 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Question-wise analysis
  if (data.questions && data.questions.length > 0) {
    if (cursorY > 240) { doc.addPage(); cursorY = 20; }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Question-wise Analysis', 14, cursorY);

    autoTable(doc, {
      startY: cursorY + 3,
      head: [['Q No', 'Your Answer', 'Correct Answer', 'Status']],
      body: data.questions.map(q => [
        q.qNo,
        q.yourAnswer,
        q.correctAnswer,
        q.status === 'Correct' ? 'Correct' : q.status === 'Incorrect' ? 'Incorrect' : 'Not Attempted',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 },
        3: { cellWidth: 40 },
      },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 3) {
          const v = hookData.cell.raw;
          if (v === 'Correct') hookData.cell.styles.textColor = [22, 163, 74];
          else if (v === 'Incorrect') hookData.cell.styles.textColor = [220, 38, 38];
          else hookData.cell.styles.textColor = [120, 120, 120];
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Weak topics
  if (data.weakTopics && data.weakTopics.length > 0) {
    if (cursorY > 260) { doc.addPage(); cursorY = 20; }
    doc.setFillColor(255, 237, 213);
    doc.setDrawColor(249, 115, 22);
    doc.roundedRect(14, cursorY, pageWidth - 28, 28, 3, 3, 'FD');
    doc.setTextColor(194, 65, 12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Areas for Improvement', 20, cursorY + 9);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.weakTopics.join(', '), 20, cursorY + 18, { maxWidth: pageWidth - 48 });
  }

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const fy = doc.internal.pageSize.getHeight() - 8;
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'italic');
    doc.text(`Crackly  -  Generated on ${new Date().toLocaleString()}  -  Page ${i} of ${pageCount}`, pageWidth / 2, fy, { align: 'center' });
  }

  const safeName = (data.studentName || 'student').replace(/\s+/g, '_');
  const safeTitle = (data.testTitle || 'test').replace(/\s+/g, '_');
  doc.save(`result_${safeName}_${safeTitle}.pdf`);
};
