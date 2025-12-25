import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, ArrowLeft, Save, Send, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Profile {
  id: string;
  full_name: string;
  student_id: string | null;
  class_status: string | null;
  district: string | null;
  state: string | null;
}

interface TuitionClass {
  id: string;
  name: string;
}

interface JoinRequest {
  id: string;
  class_id: string;
  status: string;
  tuition_classes: { name: string };
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<TuitionClass[]>([]);
  const [myClasses, setMyClasses] = useState<TuitionClass[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
    fetchProfile();
    fetchAvailableClasses();
    fetchMyClasses();
    fetchMyRequests();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      toast.error("Failed to load profile");
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  const fetchAvailableClasses = async () => {
    const { data } = await supabase
      .from("tuition_classes")
      .select("id, name")
      .order("name");

    if (data) setClasses(data);
  };

  const fetchMyClasses = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("class_students")
      .select("tuition_classes(id, name)")
      .eq("student_id", session.user.id);

    if (data) {
      setMyClasses(data.map(d => d.tuition_classes as unknown as TuitionClass));
    }
  };

  const fetchMyRequests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("join_requests")
      .select("*, tuition_classes(name)")
      .eq("student_id", session.user.id);

    if (data) setRequests(data as unknown as JoinRequest[]);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        class_status: profile.class_status,
        district: profile.district,
        state: profile.state,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully!");
    }
    setSaving(false);
  };

  const handleSendRequest = async () => {
    if (!selectedClass || !profile) return;

    const { error } = await supabase
      .from("join_requests")
      .insert({
        student_id: profile.id,
        class_id: selectedClass,
        status: "pending",
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("You already have a pending request for this class");
      } else {
        toast.error("Failed to send request");
      }
    } else {
      toast.success("Join request sent successfully!");
      setSelectedClass("");
      fetchMyRequests();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="classes">
              <BookOpen className="w-4 h-4 mr-2" />
              Classes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                My Profile
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile?.full_name || ""}
                    onChange={(e) => setProfile({ ...profile!, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={profile?.student_id || ""}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classStatus">Class Status</Label>
                <Select
                  value={profile?.class_status || ""}
                  onValueChange={(value) => setProfile({ ...profile!, class_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your class status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11th_appearing">11th Appearing</SelectItem>
                    <SelectItem value="12th_appearing">12th Appearing</SelectItem>
                    <SelectItem value="12th_passed">12th Passed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={profile?.district || ""}
                    onChange={(e) => setProfile({ ...profile!, district: e.target.value })}
                    placeholder="Enter your district"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profile?.state || ""}
                    onChange={(e) => setProfile({ ...profile!, state: e.target.value })}
                    placeholder="Enter your state"
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
          {/* Tuition Classes - Enhanced UI */}
          <Card className="border-2">
            <CardHeader className="bg-gradient-subtle">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                My Tuition Classes
              </CardTitle>
              <CardDescription>
                {myClasses.length > 0 
                  ? `You are enrolled in ${myClasses.length} class${myClasses.length !== 1 ? 'es' : ''}` 
                  : "Join a tuition class to access exclusive tests and track your progress"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {myClasses.length > 0 ? (
                <div className="space-y-3">
                  {myClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center gap-3 p-4 bg-primary/5 border-2 border-primary/20 rounded-lg hover:border-primary/40 transition-colors">
                      <div className="w-2 h-12 bg-primary rounded-full" />
                      <div className="flex-1">
                        <Badge variant="outline" className="text-sm font-semibold">
                          {cls.name}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Enrolled Class</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">Want to join another class?</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Request to Join Another Class
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Join a Tuition Class</DialogTitle>
                          <DialogDescription>
                            Select a class to send a join request to the admin
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="classSelect">Available Classes</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                              <SelectTrigger id="classSelect">
                                <SelectValue placeholder="Choose a class to join" />
                              </SelectTrigger>
                              <SelectContent>
                                {classes.length === 0 ? (
                                  <SelectItem value="none" disabled>No classes available</SelectItem>
                                ) : (
                                  classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                      {cls.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleSendRequest} disabled={!selectedClass} className="w-full">
                            <Send className="w-4 h-4 mr-2" />
                            Send Join Request
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground mb-2 font-medium">Not enrolled in any class yet</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Join a class to unlock tests and track your performance
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="lg" className="shadow-primary">
                        <Send className="w-4 h-4 mr-2" />
                        Request to Join a Class
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Join a Tuition Class</DialogTitle>
                        <DialogDescription>
                          Select a class to send a join request to the admin
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="classSelect">Available Classes</Label>
                          <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger id="classSelect">
                              <SelectValue placeholder="Choose a class to join" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.length === 0 ? (
                                <SelectItem value="none" disabled>No classes available</SelectItem>
                              ) : (
                                classes.map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {classes.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {classes.length} class{classes.length !== 1 ? 'es' : ''} available
                            </p>
                          )}
                        </div>
                        <Button onClick={handleSendRequest} disabled={!selectedClass} className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Send Join Request
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Join Requests */}
          {requests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Join Requests</CardTitle>
                <CardDescription>Status of your class join requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span>{req.tuition_classes.name}</span>
                      <Badge className={
                        req.status === "approved" ? "bg-green-600" :
                        req.status === "rejected" ? "bg-red-600" :
                        "bg-yellow-600"
                      }>
                        {req.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
