import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "@/lib/auth";
import { ClassManagement } from "@/components/admin/ClassManagement";
import { StudentTracking } from "@/components/admin/StudentTracking";
import { TestManagement } from "@/components/admin/TestManagement";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { JoinRequestsManagement } from "@/components/admin/JoinRequestsManagement";
import { AdminAnalytics } from "@/components/analytics/AdminAnalytics";
import { AdminMockTestAnalytics } from "@/components/analytics/AdminMockTestAnalytics";
import { JEENEETComparison } from "@/components/analytics/JEENEETComparison";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.jpeg";

interface UserRole {
  role: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

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
        navigate("/dashboard");
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <img src={logo} alt="CRACKLY" className="w-10 h-10 rounded-lg object-cover shadow-sm" />
            <div>
              <h1 className="text-2xl font-bold text-primary">CRACKLY Admin</h1>
              <p className="text-sm text-muted-foreground">
                {isSuperAdmin ? "Super Admin Panel" : "Admin Panel"}
              </p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-8'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            {!isSuperAdmin && <TabsTrigger value="requests">Requests</TabsTrigger>}
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="analytics">Chapter Analytics</TabsTrigger>
            <TabsTrigger value="mock-analytics">Mock Analytics</TabsTrigger>
            <TabsTrigger value="comparison">JEE vs NEET</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <AdminOverview userRole={userRole} />
          </TabsContent>

          <TabsContent value="classes" className="mt-6">
            <ClassManagement userRole={userRole} />
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <StudentTracking />
          </TabsContent>

          {!isSuperAdmin && (
            <TabsContent value="requests" className="mt-6">
              <JoinRequestsManagement />
            </TabsContent>
          )}

          <TabsContent value="tests" className="mt-6">
            <TestManagement userRole={userRole} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AdminAnalytics userRole={userRole} />
          </TabsContent>

          <TabsContent value="mock-analytics" className="mt-6">
            <AdminMockTestAnalytics userRole={userRole} />
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            <JEENEETComparison userRole={userRole} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;
