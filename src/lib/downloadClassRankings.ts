import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentRanking {
  rank: number;
  studentName: string;
  studentId: string;
  testsAttempted: number;
  totalScore: number;
  totalPossible: number;
  averagePercentage: number;
}

interface ClassRankingsData {
  className: string;
  testTitle?: string;
  generatedAt: string;
  students: StudentRanking[];
}

export const downloadClassRankingsAsPDF = (data: ClassRankingsData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Class Rankings Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.className, pageWidth / 2, 32, { align: 'center' });
  
  // Report Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${data.generatedAt}`, 14, 55);
  doc.text(`Total Students: ${data.students.length}`, 14, 63);
  if (data.testTitle) {
    doc.text(`Test: ${data.testTitle}`, 14, 71);
  }
  
  // Rankings Table
  const tableStartY = data.testTitle ? 80 : 72;
  
  const tableData = data.students.map(s => [
    `#${s.rank}`,
    s.studentName,
    s.studentId,
    s.testsAttempted.toString(),
    `${s.totalScore}/${s.totalPossible}`,
    `${s.averagePercentage.toFixed(1)}%`
  ]);
  
  (doc as any).autoTable({
    startY: tableStartY,
    head: [['Rank', 'Student Name', 'Student ID', 'Tests', 'Score', 'Avg %']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' }
    },
    didParseCell: (data: any) => {
      // Highlight top 3 ranks
      if (data.section === 'body' && data.column.index === 0) {
        const rankText = data.cell.raw as string;
        if (rankText === '#1') {
          data.cell.styles.fillColor = [255, 215, 0]; // Gold
          data.cell.styles.fontStyle = 'bold';
        } else if (rankText === '#2') {
          data.cell.styles.fillColor = [192, 192, 192]; // Silver
          data.cell.styles.fontStyle = 'bold';
        } else if (rankText === '#3') {
          data.cell.styles.fillColor = [205, 127, 50]; // Bronze
          data.cell.styles.fontStyle = 'bold';
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
  const fileName = `${data.className.replace(/\s+/g, '_')}_Rankings_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
