import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, BookOpen, Award } from "lucide-react";

interface StudentPerformance {
  student_name: string;
  avg_score: number;
  tests_taken: number;
}

interface ClassPerformance {
  class_name: string;
  avg_score: number;
  student_count: number;
}

interface AdminAnalyticsProps {
  userRole: string;
}

export const AdminAnalytics = ({ userRole }: AdminAnalyticsProps) => {
  const [topStudents, setTopStudents] = useState<StudentPerformance[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isSuperAdmin = userRole === "super_admin";

      // Get classes for this admin
      let classQuery = supabase.from("tuition_classes").select("id, name");
      if (!isSuperAdmin) {
        classQuery = classQuery.eq("admin_id", session.user.id);
      }
      const { data: classes } = await classQuery;

      if (!classes || classes.length === 0) {
        setLoading(false);
        return;
      }

      const classIds = classes.map(c => c.id);

      // Get students in these classes
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id, class_id")
        .in("class_id", classIds);

      if (!classStudents || classStudents.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(classStudents.map(cs => cs.student_id))];

      // Get test results
      const { data: results } = await supabase
        .from("test_results")
        .select("student_id, score, total_questions")
        .in("student_id", studentIds);

      // Get student profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      if (results && profiles) {
        // Calculate student performance
        const studentStats = new Map<string, { total: number; count: number; name: string }>();
        
        results.forEach(r => {
          const percentage = (r.score / r.total_questions) * 100;
          const existing = studentStats.get(r.student_id) || { total: 0, count: 0, name: "" };
          studentStats.set(r.student_id, {
            total: existing.total + percentage,
            count: existing.count + 1,
            name: profiles.find(p => p.id === r.student_id)?.full_name || "Unknown"
          });
        });

        const studentPerf: StudentPerformance[] = Array.from(studentStats.entries())
          .map(([id, stats]) => ({
            student_name: stats.name,
            avg_score: Number((stats.total / stats.count).toFixed(1)),
            tests_taken: stats.count
          }))
          .sort((a, b) => b.avg_score - a.avg_score)
          .slice(0, 10);

        setTopStudents(studentPerf);

        // Calculate class performance
        const classStats = classes.map(cls => {
          const studentsInClass = classStudents.filter(cs => cs.class_id === cls.id).map(cs => cs.student_id);
          const classResults = results.filter(r => studentsInClass.includes(r.student_id));
          
          const avgScore = classResults.length > 0
            ? classResults.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) / classResults.length
            : 0;

          return {
            class_name: cls.name,
            avg_score: Number(avgScore.toFixed(1)),
            student_count: studentsInClass.length
          };
        });

        setClassPerformance(classStats);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (topStudents.length === 0 && classPerformance.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Data Yet</p>
            <p className="text-sm mt-2">Students need to complete tests to see analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Performers */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Top Performing Students
          </CardTitle>
          <CardDescription>Students with highest average scores</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topStudents} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                type="category" 
                dataKey="student_name" 
                width={150}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value: number) => [`${value}%`, "Average Score"]}
              />
              <Bar 
                dataKey="avg_score" 
                fill="hsl(var(--primary))"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Class Performance Comparison */}
      {classPerformance.length > 0 && (
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Class Performance Comparison
            </CardTitle>
            <CardDescription>Average scores across different classes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="class_name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "avg_score") return [`${value}%`, "Average Score"];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="avg_score" 
                  fill="hsl(var(--accent))"
                  radius={[8, 8, 0, 0]}
                  name="Average Score %"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Student Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-primary-foreground border-0 shadow-primary">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{topStudents.length}</div>
            <p className="text-xs opacity-80 mt-1">Students who completed tests</p>
          </CardContent>
        </Card>

        <Card className="bg-accent text-accent-foreground border-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Total Tests Taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {topStudents.reduce((sum, s) => sum + s.tests_taken, 0)}
            </div>
            <p className="text-xs opacity-80 mt-1">Across all students</p>
          </CardContent>
        </Card>

        <Card className="bg-success text-success-foreground border-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Avg Class Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {classPerformance.length > 0
                ? (classPerformance.reduce((sum, c) => sum + c.avg_score, 0) / classPerformance.length).toFixed(1)
                : "0"}%
            </div>
            <p className="text-xs opacity-80 mt-1">Overall performance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
