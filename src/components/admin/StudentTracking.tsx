import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, TrendingUp, Award } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
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
                      Select a student to add to this class
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
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
                    <Button onClick={handleAddStudent}>Add</Button>
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
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveStudent(student.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
