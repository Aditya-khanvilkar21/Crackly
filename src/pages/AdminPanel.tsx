import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "@/lib/auth";
import { ClassManagement } from "@/components/admin/ClassManagement";
import { StudentTracking } from "@/components/admin/StudentTracking";
import { TestManagement } from "@/components/admin/TestManagement";
import { JoinRequestsManagement } from "@/components/admin/JoinRequestsManagement";
import { AdminExamDashboard } from "@/components/admin/AdminExamDashboard";
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  FileText,
  Inbox,
  Menu,
  LogOut,
  ChevronRight,
  GraduationCap,
  FlaskConical,
  Leaf
} from "lucide-react";
import logo from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserRole {
  role: string;
}

type AdminView = 'menu' | 'classes' | 'students' | 'requests' | 'tests' | 'jee' | 'neet' | 'cet';
type ExamType = 'JEE' | 'NEET' | 'CET';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [activeView, setActiveView] = useState<AdminView>('menu');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) throw error;

      const isAdmin = roles?.some((r: UserRole) => 
        r.role === "admin" || r.role === "super_admin"
      );

      if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin panel",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const adminRole = roles?.find((r: UserRole) => 
        r.role === "super_admin"
      )?.role || "admin";
      
      setUserRole(adminRole);
      setLoading(false);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out successfully",
      description: "You have been logged out",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isSuperAdmin = userRole === "super_admin";

  // Management section items
  const managementItems = [
    { id: 'classes', title: 'Classes', description: 'Manage tuition classes', icon: BookOpen },
    { id: 'students', title: 'Students', description: 'Track student progress', icon: Users },
    ...(!isSuperAdmin ? [{ id: 'requests', title: 'Join Requests', description: 'Pending approvals', icon: Inbox }] : []),
    { id: 'tests', title: 'Tests', description: 'Manage tests', icon: FileText },
  ];

  // Exam analytics items
  const examItems = [
    { 
      id: 'jee', 
      title: 'JEE Analytics', 
      description: 'Chapter & Mock test analysis', 
      icon: GraduationCap,
      gradient: 'from-blue-500 to-indigo-600',
      bgClass: 'bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20'
    },
    { 
      id: 'neet', 
      title: 'NEET Analytics', 
      description: 'Chapter & Mock test analysis', 
      icon: Leaf,
      gradient: 'from-green-500 to-emerald-600',
      bgClass: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/20'
    },
    { 
      id: 'cet', 
      title: 'CET Analytics', 
      description: 'Chapter & Mock test analysis', 
      icon: FlaskConical,
      gradient: 'from-purple-500 to-pink-600',
      bgClass: 'bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/20'
    },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'classes':
        return <ClassManagement userRole={userRole} />;
      case 'students':
        return <StudentTracking />;
      case 'requests':
        return <JoinRequestsManagement />;
      case 'tests':
        return <TestManagement userRole={userRole} />;
      case 'jee':
        return <AdminExamDashboard examType="JEE" userRole={userRole} onBack={() => setActiveView('menu')} />;
      case 'neet':
        return <AdminExamDashboard examType="NEET" userRole={userRole} onBack={() => setActiveView('menu')} />;
      case 'cet':
        return <AdminExamDashboard examType="CET" userRole={userRole} onBack={() => setActiveView('menu')} />;
      default:
        return null;
    }
  };

  const getViewTitle = () => {
    const allItems = [...managementItems, ...examItems];
    const item = allItems.find(m => m.id === activeView);
    return item?.title || 'Admin';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => activeView === 'menu' ? navigate("/") : setActiveView('menu')}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={logo} alt="CRACKLY" className="w-8 h-6 object-contain" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-primary leading-tight">CRACKLY Admin</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    Home
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 pb-8">
        <AnimatePresence mode="wait">
          {activeView === 'menu' ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto space-y-6"
            >
              <div className="text-center py-2">
                <h2 className="text-xl font-bold mb-1">Admin Panel</h2>
                <p className="text-sm text-muted-foreground">
                  {isSuperAdmin ? "Full system control" : "Manage your classes"}
                </p>
              </div>

              {/* Exam Analytics Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Exam Analytics
                </h3>
                {examItems.map((item, index) => {
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
                        onClick={() => setActiveView(item.id as AdminView)}
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

              {/* Management Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Management
                </h3>
                {managementItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index + examItems.length) * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                        onClick={() => setActiveView(item.id as AdminView)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
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
            </motion.div>
          ) : (
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Only show back button for non-exam views since exam views have their own */}
              {!['jee', 'neet', 'cet'].includes(activeView) && (
                <div className="flex items-center gap-3 mb-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setActiveView('menu')}
                    className="shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-xl font-bold">{getViewTitle()}</h2>
                </div>
              )}
              {renderContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AdminPanel;
