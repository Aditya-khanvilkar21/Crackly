import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, TrendingUp, Award, Download, Eye, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  full_name: string;
  student_id: string;
  test_count?: number;
  avg_score?: number;
}

interface TestResult {
  id: string;
  test_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  time_taken_seconds: number;
  tests: {
    title: string;
    subject: string;
    chapter: string;
  };
}

interface TuitionClass {
  id: string;
  name: string;
}

interface ClassStudent {
  student_id: string;
  profiles: {
    id: string;
    full_name: string;
    student_id: string;
  } | null;
}

export const StudentTracking = () => {
  const [classes, setClasses] = useState<TuitionClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [studentIdSearch, setStudentIdSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<Student | null>(null);
  const [studentResults, setStudentResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
      fetchAvailableStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("tuition_classes")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setClasses(data || []);
      if (data && data.length > 0) {
        setSelectedClass(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching classes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    if (!selectedClass) return;

    try {
      const { data, error } = await supabase
        .from("class_students")
        .select(`
          student_id,
          profiles!class_students_student_id_fkey (
            id,
            full_name,
            student_id
          )
        `)
        .eq("class_id", selectedClass);

      if (error) throw error;

      const studentIds = data?.map((cs: ClassStudent) => cs.student_id) || [];

      const { data: resultsData } = await supabase
        .from("test_results")
        .select("student_id, score, total_questions")
        .in("student_id", studentIds);

      const studentsWithStats = data?.map((cs: ClassStudent) => {
        if (!cs.profiles) return null;
        
        const studentResults = resultsData?.filter(r => r.student_id === cs.student_id) || [];
        const testCount = studentResults.length;
        const avgScore = testCount > 0
          ? Math.round(
              studentResults.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) / testCount
            )
          : 0;

        return {
          id: cs.profiles.id,
          full_name: cs.profiles.full_name,
          student_id: cs.profiles.student_id,
          test_count: testCount,
          avg_score: avgScore,
        };
      }).filter(Boolean) || [];

      setStudents(studentsWithStats);
    } catch (error: any) {
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAvailableStudents = async () => {
    if (!selectedClass) return;

    try {
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", selectedClass);

      const enrolledIds = classStudents?.map(cs => cs.student_id) || [];

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      const studentIds = roles?.map(r => r.user_id) || [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, student_id")
        .in("id", studentIds)
        .not("id", "in", `(${enrolledIds.join(",")})`);

      if (error) throw error;
      setAvailableStudents(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching available students",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudent || !selectedClass) return;

    try {
      const { error } = await supabase
        .from("class_students")
        .insert([{ class_id: selectedClass, student_id: selectedStudent }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student added to class",
      });

      setIsAddOpen(false);
      setSelectedStudent("");
      fetchClassStudents();
      fetchAvailableStudents();
    } catch (error: any) {
      toast({
        title: "Error adding student",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addStudentByStudentId = async () => {
    if (!selectedClass || !studentIdSearch) {
      toast({
        title: "Missing information",
        description: "Please enter a student ID",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find student by student_id
      const { data: studentData, error: studentError } = await supabase
        .from("profiles")
        .select("id")
        .eq("student_id", studentIdSearch)
        .maybeSingle();

      if (studentError || !studentData) {
        toast({
          title: "Student not found",
          description: "No student found with this ID",
          variant: "destructive",
        });
        return;
      }

      // Add student to class
      const { error } = await supabase
        .from("class_students")
        .insert({
          class_id: selectedClass,
          student_id: studentData.id,
        });

      if (error) throw error;

      toast({
        title: "Student added successfully",
        description: "The student has been added to the class",
      });

      setStudentIdSearch("");
      setIsAddOpen(false);
      fetchClassStudents();
      fetchAvailableStudents();
    } catch (error: any) {
      toast({
        title: "Error adding student",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to remove this student from the class?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("class_students")
        .delete()
        .eq("class_id", selectedClass)
        .eq("student_id", studentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student removed from class",
      });

      fetchClassStudents();
      fetchAvailableStudents();
    } catch (error: any) {
      toast({
        title: "Error removing student",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const viewStudentProgress = async (student: Student) => {
    setSelectedStudentDetails(student);
    setIsProgressOpen(true);

    try {
      const { data, error } = await supabase
        .from("test_results")
        .select(`
          id,
          test_id,
          score,
          total_questions,
          completed_at,
          time_taken_seconds,
          tests (
            title,
            subject,
            chapter
          )
        `)
        .eq("student_id", student.id)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      setStudentResults(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error fetching student results",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadResults = () => {
    if (!selectedStudentDetails || studentResults.length === 0) return;

    const csvContent = [
      ["Test Title", "Subject", "Chapter", "Score", "Total Questions", "Percentage", "Time Taken", "Date"],
      ...studentResults.map(result => [
        result.tests.title,
        result.tests.subject,
        result.tests.chapter,
        result.score.toString(),
        result.total_questions.toString(),
        ((result.score / result.total_questions) * 100).toFixed(2) + "%",
        result.time_taken_seconds ? `${Math.floor(result.time_taken_seconds / 60)}:${(result.time_taken_seconds % 60).toString().padStart(2, '0')}` : "N/A",
        new Date(result.completed_at).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedStudentDetails.full_name}_Results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Results downloaded successfully",
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Student Tracking</CardTitle>
              <CardDescription>Monitor student performance across classes</CardDescription>
            </div>
            <div className="flex gap-4 items-center">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedClass}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Student to Class</DialogTitle>
                    <DialogDescription>
                      Add a student by their unique ID or select from available students
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="student-id">Search by Student ID</Label>
                      <div className="flex gap-2">
                        <Input
                          id="student-id"
                          placeholder="e.g., JEE2025XXXXX"
                          value={studentIdSearch}
                          onChange={(e) => setStudentIdSearch(e.target.value)}
                        />
                        <Button onClick={addStudentByStudentId}>
                          <Search className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or select from list
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Student</Label>
                      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.full_name} ({student.student_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddStudent} disabled={!selectedStudent}>Add Selected Student</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedClass ? (
            <div className="text-center py-8 text-muted-foreground">
              Create a class first to manage students
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students in this class. Add students to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Tests Taken</TableHead>
                  <TableHead>Average Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.student_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        {student.test_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={student.avg_score && student.avg_score >= 70 ? "default" : "secondary"}>
                          {student.avg_score || 0}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewStudentProgress(student)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Student Progress Dialog */}
      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Student Progress: {selectedStudentDetails?.full_name}
            </DialogTitle>
            <DialogDescription>
              ID: {selectedStudentDetails?.student_id} | Total Tests: {studentResults.length}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {studentResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No test results found for this student
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{studentResults.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Average Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.round(
                          studentResults.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) / studentResults.length
                        )}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Best Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.max(...studentResults.map(r => (r.score / r.total_questions) * 100)).toFixed(0)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Chapter</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.tests.title}</TableCell>
                        <TableCell>{result.tests.subject}</TableCell>
                        <TableCell>{result.tests.chapter}</TableCell>
                        <TableCell>
                          {result.score}/{result.total_questions}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            (result.score / result.total_questions) >= 0.8 ? "default" :
                            (result.score / result.total_questions) >= 0.6 ? "secondary" : "destructive"
                          }>
                            {((result.score / result.total_questions) * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(result.completed_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProgressOpen(false)}>
              Close
            </Button>
            <Button onClick={downloadResults} disabled={studentResults.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
