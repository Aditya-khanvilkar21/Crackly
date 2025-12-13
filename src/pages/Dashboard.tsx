import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, BookOpen, Menu, User, Settings } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { ExamSectionSelector } from "@/components/dashboard/ExamSectionSelector";
import { ExamDashboard } from "@/components/dashboard/ExamDashboard";
import { motion, AnimatePresence } from "framer-motion";
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<ExamType | null>(null);
  const [isInClass, setIsInClass] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

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

      const { data: classData } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", session.user.id);

      setIsInClass(classData && classData.length > 0);
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Crackly" className="w-10 h-8 object-contain" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-primary leading-tight">Crackly</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {profile?.student_id && (
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  {profile.student_id}
                </Badge>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium text-sm">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.student_id && `ID: ${profile.student_id}`}
                    </p>
                    {isSuperAdmin && <Badge className="mt-1 bg-accent text-[10px]">Super Admin</Badge>}
                    {isAdmin && !isSuperAdmin && <Badge className="mt-1 bg-primary text-[10px]">Admin</Badge>}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
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
        {isStudent && (
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
            <div className="text-center py-2">
              <h2 className="text-xl font-bold mb-1">Admin Dashboard</h2>
              <p className="text-sm text-muted-foreground">Manage students and tests</p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Access the Admin Panel for full control
                  </p>
                  <Button onClick={() => navigate("/admin")} className="w-full">
                    Go to Admin Panel
                  </Button>
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