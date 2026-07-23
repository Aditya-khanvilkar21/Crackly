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

  // Show landing page design for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        {/* Navigation Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Crackly Exam Preparation Logo" className="w-12 h-8 object-contain" />
              <span className="font-bold text-lg text-foreground">Crackly</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button size="sm" className="font-medium" onClick={() => navigate("/auth")}>
                Login
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-primary text-white pt-16">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          {/* Light rays effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-white/10 via-transparent to-transparent" />
          </div>
          <div className="relative container mx-auto px-4 py-16 md:py-24">
            <motion.div
              className="max-w-3xl mx-auto text-center"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Logo */}
              <motion.div className="mb-6" variants={itemVariants}>
                <img 
                  src={logo} 
                  alt="Crackly Exam Preparation Logo" 
                  className="w-48 h-32 md:w-64 md:h-40 mx-auto drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] object-contain"
                />
              </motion.div>
              <motion.h1 
                className="text-4xl md:text-6xl font-bold mb-4 leading-tight tracking-tight"
                variants={itemVariants}
              >
                Crackly — JEE, NEET & CET
              </motion.h1>
              <motion.p 
                className="text-2xl md:text-3xl font-semibold mb-2 text-white/95"
                variants={itemVariants}
              >
                Crack Your Limits,
              </motion.p>
              <motion.p 
                className="text-2xl md:text-3xl font-semibold mb-6 text-white/95"
                variants={itemVariants}
              >
                Unlock Your Future.
              </motion.p>
              <motion.p 
                className="text-lg md:text-xl mb-8 text-white/80"
                variants={itemVariants}
              >
                Your Gateway to JEE, NEET & CET Success
              </motion.p>
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center"
                variants={itemVariants}
              >
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 font-semibold" onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Inspirational Quote Section */}
        <motion.section 
          className="py-12 bg-muted/30 border-b"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <blockquote className="text-xl md:text-2xl italic text-muted-foreground">
                "Success is not final, failure is not fatal: 
                <span className="text-primary font-medium"> it is the courage to continue that counts.</span>"
              </blockquote>
            </div>
          </div>
        </motion.section>

        {/* Features Section */}
        <section className="py-20 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Crackly?</h2>
              <p className="text-xl text-muted-foreground">Everything you need for JEE, NEET & CET success</p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              {features.map((feature, index) => (
                <motion.div key={index} variants={cardVariants}>
                  <Card className="border-2 hover:border-primary transition-smooth hover:shadow-lg h-full">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{feature.content}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <motion.section 
          className="py-20 bg-muted/30"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="container mx-auto px-4">
            <motion.div 
              className="max-w-3xl mx-auto text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <img 
                src={logo} 
                alt="Crackly Exam Preparation Logo" 
                className="w-40 h-24 mx-auto mb-6 drop-shadow-lg object-contain"
              />
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Begin Your Journey?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of students preparing for JEE, NEET & CET with Crackly
              </p>
              <Button size="lg" className="text-lg px-8 font-semibold" onClick={() => navigate("/auth")}>
                Start Practicing Now
              </Button>
            </motion.div>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="bg-card border-t py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Crackly Exam Preparation Logo" className="w-16 h-10 object-contain" />
                <span className="font-bold text-lg">Crackly</span>
              </div>
              <p className="text-muted-foreground text-sm">&copy; 2026 Crackly. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    );
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