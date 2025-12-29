import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface StudentResult {
  rank: number;
  studentName: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  attempts: number;
}

interface ChapterResultsData {
  chapterName: string;
  subject: string;
  examType: string;
  students: StudentResult[];
  classAverage: number;
  topScore: number;
  totalAttempts: number;
}

export const downloadChapterResultsAsPDF = (data: ChapterResultsData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Chapter Test Results', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(data.chapterName, pageWidth / 2, 30, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text(`${data.subject} - ${data.examType}`, pageWidth / 2, 40, { align: 'center' });
  
  // Report Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 14, 58);
  
  // Summary Stats
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(14, 65, pageWidth - 28, 28, 3, 3, 'FD');
  
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const statsY = 78;
  const colWidth = (pageWidth - 28) / 4;
  
  doc.text(`Students`, 14 + colWidth * 0.5, statsY - 5, { align: 'center' });
  doc.text(`${data.students.length}`, 14 + colWidth * 0.5, statsY + 5, { align: 'center' });
  
  doc.text(`Total Attempts`, 14 + colWidth * 1.5, statsY - 5, { align: 'center' });
  doc.text(`${data.totalAttempts}`, 14 + colWidth * 1.5, statsY + 5, { align: 'center' });
  
  doc.text(`Class Average`, 14 + colWidth * 2.5, statsY - 5, { align: 'center' });
  doc.text(`${data.classAverage.toFixed(1)}%`, 14 + colWidth * 2.5, statsY + 5, { align: 'center' });
  
  doc.text(`Top Score`, 14 + colWidth * 3.5, statsY - 5, { align: 'center' });
  doc.text(`${data.topScore.toFixed(1)}%`, 14 + colWidth * 3.5, statsY + 5, { align: 'center' });
  
  // Rankings Table
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Rankings', 14, 105);
  
  const tableData = data.students.map(s => [
    `#${s.rank}`,
    s.studentName,
    s.studentId,
    `${s.score}/${s.totalQuestions}`,
    s.attempts.toString(),
    `${s.percentage.toFixed(1)}%`
  ]);
  
  (doc as any).autoTable({
    startY: 110,
    head: [['Rank', 'Student Name', 'Student ID', 'Score', 'Attempts', 'Percentage']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' }
    },
    didParseCell: function(data: any) {
      // Highlight top 3
      if (data.section === 'body' && data.column.index === 0) {
        const rank = parseInt(data.cell.raw.replace('#', ''));
        if (rank === 1) {
          data.cell.styles.fillColor = [255, 215, 0];
          data.cell.styles.textColor = [0, 0, 0];
        } else if (rank === 2) {
          data.cell.styles.fillColor = [192, 192, 192];
          data.cell.styles.textColor = [0, 0, 0];
        } else if (rank === 3) {
          data.cell.styles.fillColor = [205, 127, 50];
          data.cell.styles.textColor = [255, 255, 255];
        }
      }
    }
  });
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated document. No signature required.', pageWidth / 2, footerY, { align: 'center' });
  
  // Download
  const fileName = `${data.chapterName.replace(/\s+/g, '_')}_${data.subject}_Results.pdf`;
  doc.save(fileName);
};
