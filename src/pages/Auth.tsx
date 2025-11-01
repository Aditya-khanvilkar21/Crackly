import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { signIn, signUp, signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";
import { emailSchema, passwordSchema, fullNameSchema } from "@/lib/validation";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", fullName: "", confirmPassword: "" });

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent, loginType: "student" | "admin") => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const emailValidation = emailSchema.safeParse(loginForm.email);
      const passwordValidation = passwordSchema.safeParse(loginForm.password);

      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { error } = await signIn(loginForm.email, loginForm.password);

      if (error) {
        toast.error("Invalid email or password");
        setLoading(false);
      } else {
        // Check user role after successful login
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);

          const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
          const isStudent = roles?.some(r => r.role === "student");

          if (loginType === "admin" && !isAdmin) {
            toast.error("You don't have admin access. Please login as a student.");
            await signOut();
            setLoading(false);
            return;
          }

          if (loginType === "student" && !isStudent) {
            toast.error("This account doesn't have student access. Please login as admin.");
            await signOut();
            setLoading(false);
            return;
          }

          toast.success("Successfully logged in!");
          navigate(isAdmin && loginType === "admin" ? "/admin" : "/dashboard");
        }
      }
    } catch (error) {
      toast.error("An error occurred during login");
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent, signupType?: "admin") => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const nameValidation = fullNameSchema.safeParse(signupForm.fullName);
      const emailValidation = emailSchema.safeParse(signupForm.email);
      const passwordValidation = passwordSchema.safeParse(signupForm.password);

      if (!nameValidation.success) {
        toast.error(nameValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (signupForm.password !== signupForm.confirmPassword) {
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }

      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data, error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);

      if (error) {
        toast.error("Failed to create account. Email may already be in use.");
        setLoading(false);
      } else if (data?.user) {
        // Assign the appropriate role based on signup type
        const role = signupType === "admin" ? "admin" : "student";
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role });

        if (roleError) {
          toast.error("Account created but role assignment failed. Please contact support.");
          setLoading(false);
          return;
        }

        toast.success("Account created! Logging you in...");
        
        // Refresh session to ensure role is available
        await supabase.auth.refreshSession();
        
        navigate(signupType === "admin" ? "/admin" : "/dashboard");
      }
    } catch (error) {
      toast.error("An error occurred during signup");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">JEE Prep Platform</h1>
          <p className="text-muted-foreground">Master your JEE preparation</p>
        </div>

        <Tabs defaultValue="student-login" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="student-login">Student Login</TabsTrigger>
            <TabsTrigger value="admin-login">Admin Login</TabsTrigger>
            <TabsTrigger value="signup">Student Signup</TabsTrigger>
            <TabsTrigger value="admin-signup">Admin Signup</TabsTrigger>
          </TabsList>

          <TabsContent value="student-login">
            <Card>
              <CardHeader>
                <CardTitle>Student Login</CardTitle>
                <CardDescription>Access your tests and track your progress</CardDescription>
              </CardHeader>
              <form onSubmit={(e) => handleLogin(e, "student")}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-email">Email</Label>
                    <Input
                      id="student-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-password">Password</Label>
                    <PasswordInput
                      id="student-password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Login as Student"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="admin-login">
            <Card>
              <CardHeader>
                <CardTitle>Admin Login</CardTitle>
                <CardDescription>Manage classes and monitor student progress</CardDescription>
              </CardHeader>
              <form onSubmit={(e) => handleLogin(e, "admin")}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <PasswordInput
                      id="admin-password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Login as Admin"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Student Account</CardTitle>
                <CardDescription>Start your JEE preparation journey</CardDescription>
              </CardHeader>
              <form onSubmit={(e) => handleSignup(e)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupForm.fullName}
                      onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <PasswordInput
                      id="signup-password"
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <PasswordInput
                      id="signup-confirm"
                      placeholder="••••••••"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up as Student"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="admin-signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Admin Account</CardTitle>
                <CardDescription>Set up your tuition class management</CardDescription>
              </CardHeader>
              <form onSubmit={(e) => handleSignup(e, "admin")}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-signup-name">Full Name</Label>
                    <Input
                      id="admin-signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupForm.fullName}
                      onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-signup-email">Email</Label>
                    <Input
                      id="admin-signup-email"
                      type="email"
                      placeholder="admin@email.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-signup-password">Password</Label>
                    <PasswordInput
                      id="admin-signup-password"
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-signup-confirm">Confirm Password</Label>
                    <PasswordInput
                      id="admin-signup-confirm"
                      placeholder="••••••••"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up as Admin"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
