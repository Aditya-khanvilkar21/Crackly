import * as XLSX from 'xlsx';

interface StudentResultRow {
  rank: number;
  studentName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTakenSeconds?: number | null;
}

interface DownloadResultsParams {
  testTitle: string;
  examType: string;
  subject?: string;
  chapter?: string;
  students: StudentResultRow[];
  totalStudents?: number;
}

const formatTime = (seconds?: number | null): string => {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

export const downloadTestResultsAsXlsx = (data: DownloadResultsParams) => {
  const wb = XLSX.utils.book_new();

  // Summary sheet data
  const summaryData = [
    ['Test Results Report'],
    [''],
    ['Test Title', data.testTitle],
    ['Exam Type', data.examType],
    ...(data.subject ? [['Subject', data.subject]] : []),
    ...(data.chapter ? [['Chapter', data.chapter]] : []),
    ['Generated', new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })],
    [''],
    ['Total Students', data.totalStudents?.toString() || 'N/A'],
    ['Appeared Students', data.students.length.toString()],
    ['Average Score', data.students.length > 0 ? `${(data.students.reduce((s, r) => s + r.percentage, 0) / data.students.length).toFixed(1)}%` : 'N/A'],
    ['Top Score', data.students.length > 0 ? `${data.students[0]?.percentage.toFixed(1)}%` : 'N/A'],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Rankings sheet
  const rankingsHeader = ['Rank', 'Student Name', 'Score', 'Percentage', 'Time Taken'];
  const rankingsRows = data.students.map(s => [
    s.rank,
    s.studentName,
    `${s.score}/${s.totalQuestions}`,
    `${s.percentage.toFixed(1)}%`,
    formatTime(s.timeTakenSeconds),
  ]);

  const rankingsSheet = XLSX.utils.aoa_to_sheet([rankingsHeader, ...rankingsRows]);
  rankingsSheet['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, rankingsSheet, 'Rankings');

  const fileName = `${data.testTitle.replace(/\s+/g, '_')}_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
