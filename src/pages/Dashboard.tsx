import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, BookOpen, Clock, Target, PlayCircle, Award, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentAnalytics } from "@/components/analytics/StudentAnalytics";

interface Profile {
  id: string;
  full_name: string;
  student_id: string | null;
}

interface UserRole {
  role: string;
}

interface Test {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  difficulty: string;
  duration_minutes: number;
}

interface TestResult {
  score: number;
  total_questions: number;
  test_id: string;
  completed_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [recentResults, setRecentResults] = useState<TestResult[]>([]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch profile and roles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        toast.error("Error loading profile");
      } else {
        setProfile(profileData);
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      } else {
        setRoles(rolesData);
      }

      setLoading(false);
    };

    initAuth();
    fetchTests();
    fetchRecentResults();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchTests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get student's classes
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", session.user.id);

    if (!classData || classData.length === 0) {
      // If student is not in any class, show all tests
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTests(data as unknown as Test[]);
      }
      return;
    }

    const classIds = classData.map(c => c.class_id);

    // Get unlocked tests for student's classes
    const { data: availabilityData } = await supabase
      .from("test_availability")
      .select("test_id")
      .in("class_id", classIds)
      .eq("is_locked", false);

    if (!availabilityData || availabilityData.length === 0) {
      setTests([]);
      return;
    }

    const testIds = availabilityData.map(a => a.test_id);

    // Get test details
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .in("id", testIds)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTests(data as unknown as Test[]);
    }
  };

  const fetchRecentResults = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .eq("student_id", session.user.id)
      .order("completed_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentResults(data as TestResult[]);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500 hover:bg-green-600";
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "hard":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isStudent = roles.some(r => r.role === "student");
  const isAdmin = roles.some(r => r.role === "admin");
  const isSuperAdmin = roles.some(r => r.role === "super_admin");
  const hasAdminAccess = isAdmin || isSuperAdmin;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">JEE Prep Platform</h1>
            <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-4">
            {profile?.student_id && (
              <Badge variant="outline" className="text-sm">
                ID: {profile.student_id}
              </Badge>
            )}
            {isSuperAdmin && <Badge className="bg-accent">Super Admin</Badge>}
            {isAdmin && !isSuperAdmin && <Badge className="bg-primary">Admin</Badge>}
            {hasAdminAccess && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                Admin Panel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
              My Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isStudent && (
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Your Dashboard</h2>
                <p className="text-muted-foreground">Track your progress and attempt tests</p>
              </div>
              <TabsList className="bg-muted">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tests Attempted</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{recentResults.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {recentResults.length === 0 ? "No tests completed yet" : "Total tests completed"}
                  </p>
                </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {recentResults.length > 0
                      ? (
                          (recentResults.reduce((acc, r) => acc + r.score, 0) /
                            recentResults.reduce((acc, r) => acc + r.total_questions, 0)) *
                          100
                        ).toFixed(1) + "%"
                      : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {recentResults.length === 0 ? "Complete tests to see stats" : "Across all tests"}
                  </p>
                </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tests Available</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tests.length}</div>
                  <p className="text-xs text-muted-foreground">Ready to attempt</p>
                </CardContent>
                </Card>
              </div>

              {/* Available Tests - Organized by Subject */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Available Tests</h3>
              {tests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tests available yet</p>
                      <p className="text-sm mt-2">Check back later or contact your admin</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {/* Physics Tests */}
                  {tests.filter(t => t.subject.toLowerCase() === 'physics').length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                        Physics Tests
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tests.filter(t => t.subject.toLowerCase() === 'physics').map((test) => (
                          <Card key={test.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <Badge className={getDifficultyColor(test.difficulty)}>
                                  {test.difficulty}
                                </Badge>
                              </div>
                              <CardTitle className="text-lg">{test.title}</CardTitle>
                              <CardDescription>{test.chapter}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  25 Questions
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {test.duration_minutes} min
                                </span>
                              </div>
                              <Button onClick={() => navigate(`/take-test/${test.id}`)} className="w-full">
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Start Test
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chemistry Tests */}
                  {tests.filter(t => t.subject.toLowerCase() === 'chemistry').length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                        Chemistry Tests
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tests.filter(t => t.subject.toLowerCase() === 'chemistry').map((test) => (
                          <Card key={test.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <Badge className={getDifficultyColor(test.difficulty)}>
                                  {test.difficulty}
                                </Badge>
                              </div>
                              <CardTitle className="text-lg">{test.title}</CardTitle>
                              <CardDescription>{test.chapter}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  25 Questions
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {test.duration_minutes} min
                                </span>
                              </div>
                              <Button onClick={() => navigate(`/take-test/${test.id}`)} className="w-full">
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Start Test
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mathematics Tests */}
                  {tests.filter(t => t.subject.toLowerCase() === 'mathematics').length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                        Mathematics Tests
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tests.filter(t => t.subject.toLowerCase() === 'mathematics').map((test) => (
                          <Card key={test.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <Badge className={getDifficultyColor(test.difficulty)}>
                                  {test.difficulty}
                                </Badge>
                              </div>
                              <CardTitle className="text-lg">{test.title}</CardTitle>
                              <CardDescription>{test.chapter}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  25 Questions
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {test.duration_minutes} min
                                </span>
                              </div>
                              <Button onClick={() => navigate(`/take-test/${test.id}`)} className="w-full">
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Start Test
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Results */}
            {recentResults.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Recent Test Results</h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {recentResults.map((result) => (
                        <div
                          key={result.test_id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Award
                                className={`w-5 h-5 ${
                                  result.score / result.total_questions >= 0.8
                                    ? "text-green-600"
                                    : result.score / result.total_questions >= 0.6
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              />
                              <p className="text-sm text-muted-foreground">
                                {new Date(result.completed_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {result.score}/{result.total_questions}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {((result.score / result.total_questions) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            </TabsContent>

            <TabsContent value="analytics">
              <StudentAnalytics />
            </TabsContent>
          </Tabs>
        )}

        {(isAdmin || isSuperAdmin) && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
              <p className="text-muted-foreground">Manage students and tests</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Admin Features</CardTitle>
                <CardDescription>Coming soon: Manage your tuition class</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    You can manage students, control test availability, and monitor performance.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    More features will be added in upcoming updates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
