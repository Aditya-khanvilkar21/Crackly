import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, BookOpen } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { ExamSectionSelector } from "@/components/dashboard/ExamSectionSelector";
import { ExamDashboard } from "@/components/dashboard/ExamDashboard";
import { motion, AnimatePresence } from "framer-motion";

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

      // Check if student is in a class
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
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Crackly" className="w-16 h-10 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Crackly</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
            </div>
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
          <div className="space-y-8">
            {!isInClass ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-semibold text-lg mb-2">Join a Tuition Class to Access Tests</p>
                    <p className="text-sm mt-2">You need to be enrolled in at least one tuition class to see and attempt tests.</p>
                    <p className="text-sm mt-1">Your Student ID: <span className="font-mono font-semibold text-primary">{profile?.student_id}</span></p>
                    <p className="text-sm mt-4">Share your Student ID with your admin to get added to a class.</p>
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
                    className="space-y-8"
                  >
                    <div className="text-center">
                      <h2 className="text-3xl font-bold mb-2">Choose Your Exam</h2>
                      <p className="text-muted-foreground">Select an exam type to view available tests and analytics</p>
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
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
              <p className="text-muted-foreground">Manage students and tests</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Admin Features</CardTitle>
                <CardDescription>Access the Admin Panel for full control</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Use the Admin Panel to manage classes, students, tests, and view analytics.
                  </p>
                  <Button onClick={() => navigate("/admin")}>
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
