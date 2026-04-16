import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, GraduationCap, TrendingUp, BarChart3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAnalytics } from "@/components/analytics/AdminAnalytics";

interface OverviewStats {
  totalClasses: number;
  totalStudents: number;
  totalTests: number;
  totalTestResults: number;
  averageScore: number;
}

interface RecentActivity {
  student_name: string;
  test_title: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

interface AdminOverviewProps {
  userRole: string;
}

export const AdminOverview = ({ userRole }: AdminOverviewProps) => {
  const [stats, setStats] = useState<OverviewStats>({
    totalClasses: 0,
    totalStudents: 0,
    totalTests: 0,
    totalTestResults: 0,
    averageScore: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isSuperAdmin = userRole === "super_admin";

      // Fetch class count
      let classQuery = supabase.from("tuition_classes").select("id", { count: "exact" });
      if (!isSuperAdmin) {
        classQuery = classQuery.eq("admin_id", session.user.id);
      }
      const { count: classCount } = await classQuery;

      // Fetch student count (students in admin's classes)
      let studentQuery = supabase
        .from("class_students")
        .select("student_id", { count: "exact" });
      
      if (!isSuperAdmin) {
        const { data: adminClasses } = await supabase
          .from("tuition_classes")
          .select("id")
          .eq("admin_id", session.user.id);
        
        const classIds = adminClasses?.map(c => c.id) || [];
        if (classIds.length > 0) {
          studentQuery = studentQuery.in("class_id", classIds);
        } else {
          studentQuery = studentQuery.eq("class_id", "00000000-0000-0000-0000-000000000000");
        }
      }
      
      const { count: studentCount } = await studentQuery;

      // Fetch test count
      const { count: testCount } = await supabase
        .from("tests")
        .select("id", { count: "exact" })
        .eq("is_active", true);

      // Fetch test results and average score
      let resultsQuery = supabase.from("test_results").select("score, total_questions");
      
      if (!isSuperAdmin) {
        const { data: adminClasses } = await supabase
          .from("tuition_classes")
          .select("id")
          .eq("admin_id", session.user.id);
        
        const classIds = adminClasses?.map(c => c.id) || [];
        if (classIds.length > 0) {
          const { data: classStudents } = await supabase
            .from("class_students")
            .select("student_id")
            .in("class_id", classIds);
          
          const studentIds = classStudents?.map(cs => cs.student_id) || [];
          if (studentIds.length > 0) {
            resultsQuery = resultsQuery.in("student_id", studentIds);
          } else {
            resultsQuery = resultsQuery.eq("student_id", "00000000-0000-0000-0000-000000000000");
          }
        } else {
          resultsQuery = resultsQuery.eq("student_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data: results } = await resultsQuery;

      const totalResults = results?.length || 0;
      const avgScore = totalResults > 0
        ? results.reduce((sum, r) => sum + ((r.score / r.total_questions) * 100), 0) / totalResults
        : 0;

      setStats({
        totalClasses: classCount || 0,
        totalStudents: studentCount || 0,
        totalTests: testCount || 0,
        totalTestResults: totalResults,
        averageScore: Math.round(avgScore),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isSuperAdmin = userRole === "super_admin";

      let query = supabase
        .from("test_results")
        .select(`
          score,
          total_questions,
          completed_at,
          student_id,
          test_id
        `)
        .order("completed_at", { ascending: false })
        .limit(10);

      if (!isSuperAdmin) {
        const { data: adminClasses } = await supabase
          .from("tuition_classes")
          .select("id")
          .eq("admin_id", session.user.id);
        
        const classIds = adminClasses?.map(c => c.id) || [];
        if (classIds.length > 0) {
          const { data: classStudents } = await supabase
            .from("class_students")
            .select("student_id")
            .in("class_id", classIds);
          
          const studentIds = classStudents?.map(cs => cs.student_id) || [];
          if (studentIds.length > 0) {
            query = query.in("student_id", studentIds);
          } else {
            query = query.eq("student_id", "00000000-0000-0000-0000-000000000000");
          }
        } else {
          query = query.eq("student_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data: results } = await query;

      if (results && results.length > 0) {
        // Fetch student names and test titles
        const studentIds = [...new Set(results.map(r => r.student_id))];
        const testIds = [...new Set(results.map(r => r.test_id))];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);

        const { data: tests } = await supabase
          .from("tests")
          .select("id, title")
          .in("id", testIds);

        const activity: RecentActivity[] = results.map(r => {
          const profile = profiles?.find(p => p.id === r.student_id);
          const test = tests?.find(t => t.id === r.test_id);
          
          return {
            student_name: profile?.full_name || "Unknown",
            test_title: test?.title || "Unknown Test",
            score: r.score,
            total_questions: r.total_questions,
            completed_at: r.completed_at,
          };
        });

        setRecentActivity(activity);
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="bg-muted">
        <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Overview
        </TabsTrigger>
        <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all rounded-2xl border-0 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
            <div className="p-2 rounded-xl bg-primary/10">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {userRole === "super_admin" ? "Across all admins" : "Your classes"}
            </p>
          </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all rounded-2xl border-0 bg-gradient-to-br from-accent/5 to-accent/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <div className="p-2 rounded-xl bg-accent/10">
              <Users className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Enrolled students
            </p>
          </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all rounded-2xl border-0 bg-gradient-to-br from-success/5 to-success/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Tests</CardTitle>
            <div className="p-2 rounded-xl bg-success/10">
              <BookOpen className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalTests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active tests
            </p>
          </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all rounded-2xl border-0 bg-gradient-to-br from-warning/5 to-warning/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <div className="p-2 rounded-xl bg-warning/10">
              <TrendingUp className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {stats.totalTestResults} attempts
            </p>
          </CardContent>
          </Card>
        </div>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Recent Test Submissions</CardTitle>
          <CardDescription>Latest test results from your students</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No test submissions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{activity.student_name}</TableCell>
                    <TableCell>{activity.test_title}</TableCell>
                    <TableCell>
                      <span className={getScoreColor(activity.score, activity.total_questions)}>
                        {activity.score}/{activity.total_questions} (
                        {Math.round((activity.score / activity.total_questions) * 100)}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(activity.completed_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analytics">
        <AdminAnalytics userRole={userRole} />
      </TabsContent>
    </Tabs>
  );
};
