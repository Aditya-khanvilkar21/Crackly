import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  subjectBreakdown?: {
    subject: string;
    correct: number;
    total: number;
    percentage: number;
  }[];
}

export const downloadResultAsPDF = (data: ResultData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Result Certificate', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.testType === 'mock_test' ? 'Mock Test Result' : 'Chapter Test Result', pageWidth / 2, 32, { align: 'center' });
  
  // Student Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Information', 14, 55);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${data.studentName}`, 14, 65);
  doc.text(`Student ID: ${data.studentId}`, 14, 73);
  doc.text(`Date: ${data.completedAt}`, 14, 81);
  
  // Test Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Details', 14, 98);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Test: ${data.testTitle}`, 14, 108);
  if (data.subject) {
    doc.text(`Subject: ${data.subject}`, 14, 116);
  }
  if (data.chapter) {
    doc.text(`Chapter: ${data.chapter}`, 14, data.subject ? 124 : 116);
  }
  
  // Score Box
  const scoreBoxY = data.chapter ? 140 : 130;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(14, scoreBoxY, pageWidth - 28, 50, 5, 5, 'FD');
  
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.score}/${data.totalQuestions}`, pageWidth / 2, scoreBoxY + 22, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`${data.percentage.toFixed(1)}%`, pageWidth / 2, scoreBoxY + 35, { align: 'center' });
  
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Time Taken: ${data.timeTaken}`, pageWidth / 2, scoreBoxY + 45, { align: 'center' });
  
  // Subject Breakdown for Mock Tests
  if (data.subjectBreakdown && data.subjectBreakdown.length > 0) {
    const tableY = scoreBoxY + 65;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Subject-wise Performance', 14, tableY);
    
    const tableData = data.subjectBreakdown.map(s => [
      s.subject,
      `${s.correct}/${s.total}`,
      `${s.percentage.toFixed(1)}%`
    ]);
    
    (doc as any).autoTable({
      startY: tableY + 5,
      head: [['Subject', 'Score', 'Percentage']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 14, right: 14 },
    });
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated document. No signature required.', pageWidth / 2, footerY, { align: 'center' });
  
  // Download
  const fileName = `${data.testTitle.replace(/\s+/g, '_')}_Result_${data.studentId}.pdf`;
  doc.save(fileName);
};
