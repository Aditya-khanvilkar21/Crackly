import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, BookOpen, Menu, User, Settings, Target, BarChart3, Clock, CheckCircle2, Users, GraduationCap, Leaf, FlaskConical, ChevronRight, ArrowLeft } from "lucide-react";
import { AdminExamDashboard } from "@/components/admin/AdminExamDashboard";
import logo from "@/assets/logo.webp";
import { SeoHead } from "@/components/SeoHead";
import { toast } from "sonner";
import { ExamSectionSelector } from "@/components/dashboard/ExamSectionSelector";
import { ExamDashboard } from "@/components/dashboard/ExamDashboard";
import { ScheduledTestsPanel } from "@/components/dashboard/ScheduledTestsPanel";
import { MyClassesBanner } from "@/components/dashboard/MyClassesBanner";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  full_name: string;
  student_id: string | null;
}

interface UserRole {
  role: string;
}

type ExamType = 'JEE' | 'NEET' | 'CET';
type AdminView = 'menu' | 'jee' | 'neet' | 'cet';

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<ExamType | null>(null);
  const [isInClass, setIsInClass] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminView, setAdminView] = useState<AdminView>('menu');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const features = [
    {
      icon: Target,
      title: "JEE, NEET & CET Style Tests",
      description: "Practice with authentic exam pattern MCQ tests",
      content: "Comprehensive tests covering Physics, Chemistry, Mathematics, and Biology with proper difficulty levels.",
    },
    {
      icon: BarChart3,
      title: "Progress Analytics",
      description: "Track your performance with detailed insights",
      content: "Chapter-wise and subject-wise performance graphs to identify your strengths and weaknesses.",
    },
    {
      icon: Clock,
      title: "Timed Practice",
      description: "Simulate real exam conditions",
      content: "Practice with timer to improve speed and time management for actual exams.",
    },
    {
      icon: CheckCircle2,
      title: "Instant Results",
      description: "Get immediate feedback on your performance",
      content: "View correct answers and your score instantly after test submission.",
    },
    {
      icon: Users,
      title: "Class Management",
      description: "For tuition classes and coaching institutes",
      content: "Admins can manage students and control test availability for their classes.",
    },
    {
      icon: GraduationCap,
      title: "Auto Student ID",
      description: "Unique identification for every student",
      content: "Automatically generated student IDs for easy tracking and management.",
    },
  ];

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async (userId: string) => {
      try {
        const [profileResult, rolesResult, classResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
          supabase.from("class_students").select("class_id").eq("student_id", userId),
        ]);

        if (!isMounted) return;

        if (profileResult.data) setProfile(profileResult.data);
        if (rolesResult.data) setRoles(rolesResult.data);
        setIsInClass(classResult.data && classResult.data.length > 0);
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Primary: check session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) {
        setIsAuthenticated(false);
        setLoading(false);
      } else {
        setIsAuthenticated(true);
        fetchUserData(session.user.id);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // Secondary: listen for auth changes (sign in/out after initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthenticated(false);
        setProfile(null);
        setRoles([]);
        setLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setIsAuthenticated(true);
        fetchUserData(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error("Logout error:", error);
    }
    // Explicitly reset state to show landing page
    setIsAuthenticated(false);
    setProfile(null);
    setRoles([]);
    setSelectedExam(null);
    toast.success("Logged out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show the redesigned landing page for unauthenticated users
  if (!isAuthenticated) {
    return <Index />;
  }


  const isStudent = roles.some(r => r.role === "student");
  const isAdmin = roles.some(r => r.role === "admin");
  const isSuperAdmin = roles.some(r => r.role === "super_admin");
  const hasAdminAccess = isAdmin || isSuperAdmin;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SeoHead
        title="Dashboard | Crackly"
        description="Your JEE, NEET and CET prep dashboard. Take tests, track progress, and master every chapter."
        path="/"
      />
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Crackly Exam Preparation Logo" className="w-10 h-8 object-contain" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-primary leading-tight">Crackly — JEE, NEET & CET</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {profile?.student_id && isStudent && !hasAdminAccess && (
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  {profile.student_id}
                </Badge>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label="Open user menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium text-sm">{profile?.full_name}</p>
                    {isStudent && !hasAdminAccess && profile?.student_id && (
                      <p className="text-xs text-muted-foreground">
                        ID: {profile.student_id}
                      </p>
                    )}
                    {isSuperAdmin && <Badge className="mt-1 bg-accent text-[10px]">Super Admin</Badge>}
                    {isAdmin && !isSuperAdmin && <Badge className="mt-1 bg-primary text-[10px]">Admin</Badge>}
                  </div>
                  <DropdownMenuSeparator />
                  {isStudent && !hasAdminAccess && (
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="h-4 w-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                  )}
                  {hasAdminAccess && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 pb-8">
        {isStudent && !hasAdminAccess && (
          <div className="max-w-lg mx-auto">
            {!isInClass ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-semibold mb-1">Join a Class</p>
                    <p className="text-sm mt-2">Share your Student ID with your admin to get added.</p>
                    <p className="text-sm mt-3 font-mono font-semibold text-primary">{profile?.student_id}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="wait">
                {!selectedExam ? (
                  <motion.div
                    key="selector"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center py-2">
                      <h2 className="text-xl font-bold mb-1">Select Exam</h2>
                      <p className="text-sm text-muted-foreground">Choose your exam type</p>
                    </div>
                    <MyClassesBanner />
                    <ScheduledTestsPanel />
                    <ExamSectionSelector 
                      selectedExam={selectedExam} 
                      onSelect={setSelectedExam} 
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <ExamDashboard 
                      examType={selectedExam}
                      studentId={profile?.id || ''}
                      onBack={() => setSelectedExam(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        )}

        {(isAdmin || isSuperAdmin) && (
          <div className="max-w-lg mx-auto space-y-4">
            <AnimatePresence mode="wait">
              {adminView === 'menu' ? (
                <motion.div
                  key="admin-menu"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center py-2">
                    <h2 className="text-xl font-bold mb-1">Admin Dashboard</h2>
                    <p className="text-sm text-muted-foreground">Analytics & Management</p>
                  </div>

                  {/* Exam Analytics Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                      Exam Analytics
                    </h3>
                    {[
                      { id: 'jee', title: 'JEE Analytics', description: 'Chapter & Mock test analysis', icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600', bgClass: 'bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20' },
                      { id: 'neet', title: 'NEET Analytics', description: 'Chapter & Mock test analysis', icon: Leaf, gradient: 'from-green-500 to-emerald-600', bgClass: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/20' },
                      { id: 'cet', title: 'CET Analytics', description: 'Chapter & Mock test analysis', icon: FlaskConical, gradient: 'from-purple-500 to-pink-600', bgClass: 'bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/20' },
                    ].map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card
                            className={`cursor-pointer hover:shadow-md active:scale-[0.98] transition-all border ${item.bgClass}`}
                            onClick={() => setAdminView(item.id as AdminView)}
                          >
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.gradient} shrink-0`}>
                                <Icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm">{item.title}</h3>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Admin Panel Link */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                      Management
                    </h3>
                    <Card
                      className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                      onClick={() => navigate("/admin")}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                          <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">Admin Panel</h3>
                          <p className="text-xs text-muted-foreground">Classes, Students & Tests</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={adminView}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <AdminExamDashboard
                    examType={adminView.toUpperCase() as ExamType}
                    userRole={isSuperAdmin ? 'super_admin' : 'admin'}
                    onBack={() => setAdminView('menu')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;