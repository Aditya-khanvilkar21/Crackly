import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { signIn, signUp, signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle, Shield } from "lucide-react";
import { emailSchema, passwordSchema, fullNameSchema } from "@/lib/validation";
import logo from "@/assets/logo.webp";
import { SeoHead } from "@/components/SeoHead";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<"student" | "admin">("student");
  const [signupType, setSignupType] = useState<"student" | "admin">("student");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", fullName: "", confirmPassword: "" });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent, loginType: "student" | "admin") => {
    e.preventDefault();
    setLoading(true);

    try {
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

      let signInData, error;
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await signIn(loginForm.email, loginForm.password);
          signInData = result.data;
          error = result.error;
          break;
        } catch (networkErr) {
          if (attempt === maxRetries) {
            toast.error("Unable to connect to server. Please try opening the app directly at crackly.lovable.app or check your internet.");
            setLoading(false);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (error) {
        if (error.message?.includes("Invalid login")) {
          toast.error("Invalid email or password");
        } else if (error.message?.includes("Email not confirmed")) {
          toast.error("Please verify your email before logging in.");
        } else {
          toast.error(error.message || "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Use session from signIn response directly instead of re-fetching
      const session = signInData?.session;
      if (session) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);

          const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
          const isStudent = roles?.some(r => r.role === "student");

          // Check if admin request is pending
          if (loginType === "admin" && !isAdmin) {
            const { data: request } = await supabase
              .from("admin_requests")
              .select("status")
              .eq("user_id", session.user.id)
              .single();

            if (request?.status === "pending") {
              toast.error("Your admin request is still pending approval.");
              await signOut();
              setLoading(false);
              return;
            } else if (request?.status === "rejected") {
              toast.error("Your admin request was rejected.");
              await signOut();
              setLoading(false);
              return;
            }
          }

          toast.success("Successfully logged in!");
          
          if (isAdmin) {
            navigate("/admin");
          } else if (isStudent) {
            navigate("/");
          } else {
            toast.error("No role assigned to your account. Contact support.");
            navigate("/");
          }
      } else {
        toast.error("Login failed. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      toast.error("An error occurred during login");
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      let data, error;
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
          data = result.data;
          error = result.error;
          break;
        } catch (networkErr) {
          if (attempt === maxRetries) {
            toast.error("Unable to connect to server. Please try opening the app directly at crackly.lovable.app or check your internet.");
            setLoading(false);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (error) {
        if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else if (error.message?.includes("valid email")) {
          toast.error("Please enter a valid email address.");
        } else if (error.message?.includes("password")) {
          toast.error("Password must be at least 6 characters.");
        } else {
          toast.error(error.message || "Failed to create account. Please try again.");
        }
        setLoading(false);
        return;
      }
      
      // Check if user was created successfully (session might be null with auto-confirm disabled)
      if (!data?.user) {
        toast.error("Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Check for fake user (identities array empty means user already exists)
      if (data.user.identities && data.user.identities.length === 0) {
        toast.error("This email is already registered. Please login instead.");
        setLoading(false);
        return;
      }

      if (signupType === "admin") {
        // Create admin request for super admin approval
        const { error: requestError } = await supabase
          .from("admin_requests")
          .insert({
            user_id: data.user.id,
            full_name: signupForm.fullName,
            email: signupForm.email,
            status: "pending"
          });

        if (requestError) {
          toast.error("Account created but admin request failed. Please contact support.");
        } else {
          toast.success("Admin request submitted! Please wait for Super Admin approval.");
        }
        await signOut();
        setLoading(false);
      } else {
        // Student signup - role auto-assigned by trigger
        toast.success("Account created successfully! Logging you in...");
        try {
          await supabase.auth.refreshSession();
        } catch (e) {
          console.warn("Session refresh failed, proceeding anyway");
        }
        setLoading(false);
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error?.message || "An error occurred during signup");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle px-4 py-12">
      <SeoHead
        title="Sign In or Sign Up | Crackly"
        description="Sign in or create your Crackly account to start preparing for JEE, NEET, or CET with mock tests and analytics."
        path="/auth"
      />
      <main className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={logo} 
            alt="Crackly Exam Preparation Logo" 
            className="w-40 h-24 mx-auto mb-4 drop-shadow-lg object-contain"
          />
          <h1 className="text-3xl font-bold mb-2">Crackly — JEE, NEET & CET</h1>
          <p className="text-muted-foreground">Crack Your Limits, Unlock Your Future</p>
        </div>

        <Tabs defaultValue="signup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signup" className="text-base">
              <UserCircle className="w-4 h-4 mr-2" />
              Sign Up
            </TabsTrigger>
            <TabsTrigger value="login" className="text-base">
              <Shield className="w-4 h-4 mr-2" />
              Login
            </TabsTrigger>
          </TabsList>

          {/* Signup Tab - Student or Admin Request */}
          <TabsContent value="signup">
            <Card className="border-2">
              <CardHeader className="bg-gradient-subtle">
                <CardTitle className="text-xl">Create Account</CardTitle>
                <CardDescription>
                  {signupType === "student" 
                    ? "Start your JEE, NEET & CET preparation journey today" 
                    : "Request admin access (requires Super Admin approval)"}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4 pt-6">
                  {/* Signup Type Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Account Type</Label>
                    <RadioGroup 
                      value={signupType} 
                      onValueChange={(value) => setSignupType(value as "student" | "admin")}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="student" id="signup-student" className="peer sr-only" />
                        <Label
                          htmlFor="signup-student"
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                        >
                          <UserCircle className="mb-2 h-6 w-6" />
                          <span className="font-semibold text-sm">Student</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="admin" id="signup-admin" className="peer sr-only" />
                        <Label
                          htmlFor="signup-admin"
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                        >
                          <Shield className="mb-2 h-6 w-6" />
                          <span className="font-semibold text-sm">Admin</span>
                        </Label>
                      </div>
                    </RadioGroup>
                    {signupType === "admin" && (
                      <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded-md">
                        ⚠️ Admin signup requires Super Admin approval before you can access admin features.
                      </p>
                    )}
                  </div>
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
                  <Button type="submit" className="w-full" disabled={loading} size="lg">
                    {loading ? "Creating account..." : signupType === "student" ? "Create Student Account" : "Submit Admin Request"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Login Tab - Student and Admin */}
          <TabsContent value="login">
            <Card className="border-2">
              <CardHeader className="bg-gradient-subtle">
                <CardTitle className="text-xl">Login to Your Account</CardTitle>
                <CardDescription>Select your account type and login</CardDescription>
              </CardHeader>
              <form onSubmit={(e) => handleLogin(e, loginType)}>
                <CardContent className="space-y-6 pt-6">
                  {/* Login Type Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Account Type</Label>
                    <RadioGroup 
                      value={loginType} 
                      onValueChange={(value) => setLoginType(value as "student" | "admin")}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="student" id="student" className="peer sr-only" />
                        <Label
                          htmlFor="student"
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                        >
                          <UserCircle className="mb-3 h-8 w-8" />
                          <span className="font-semibold">Student</span>
                          <span className="text-xs text-muted-foreground mt-1">Access tests & track progress</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="admin" id="admin" className="peer sr-only" />
                        <Label
                          htmlFor="admin"
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                        >
                          <Shield className="mb-3 h-8 w-8" />
                          <span className="font-semibold">Admin</span>
                          <span className="text-xs text-muted-foreground mt-1">Manage classes & students</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={loginType === "student" ? "your@email.com" : "admin@email.com"}
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <PasswordInput
                      id="login-password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading} size="lg">
                    {loading ? "Logging in..." : `Login as ${loginType === "student" ? "Student" : "Admin"}`}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Auth;
