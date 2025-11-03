import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, ArrowLeft, Save, Send } from "lucide-react";
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
      <div className="container mx-auto px-4 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
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

          {/* Tuition Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Tuition Classes</CardTitle>
              <CardDescription>
                {myClasses.length > 0 
                  ? "You are enrolled in the following classes" 
                  : "You are not enrolled in any tuition class yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myClasses.length > 0 ? (
                <div className="space-y-2">
                  {myClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Badge variant="outline">{cls.name}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Not enrolled in any class</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Send className="w-4 h-4 mr-2" />
                        Request to Join Class
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Join a Tuition Class</DialogTitle>
                        <DialogDescription>
                          Select a class to send a join request to the admin
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Select Class</Label>
                          <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleSendRequest} disabled={!selectedClass}>
                          <Send className="w-4 h-4 mr-2" />
                          Send Request
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
        </div>
      </div>
    </div>
  );
}
