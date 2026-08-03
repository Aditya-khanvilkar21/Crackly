import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, User, Save, BookOpen, Upload, Image as ImageIcon, KeyRound, Loader2, MapPin } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";

interface Profile {
  id: string;
  full_name: string;
}

interface AdminClass {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  admin_id: string;
}

export default function AdminProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [logoPreviews, setLogoPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setEmail(session.user.email || "");

    const [{ data: prof }, { data: roles }, { data: cls }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("id", session.user.id).single(),
      supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      supabase
        .from("tuition_classes")
        .select("id, name, address, logo_url, admin_id")
        .eq("admin_id", session.user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (prof) setProfile(prof as Profile);
    const isSuper = roles?.some((r: any) => r.role === "super_admin");
    setRole(isSuper ? "super_admin" : "admin");
    if (cls) {
      setClasses(cls as AdminClass[]);
      // Load signed previews
      const previews: Record<string, string> = {};
      await Promise.all(
        (cls as AdminClass[]).map(async (c) => {
          if (c.logo_url) {
            const { data } = await supabase.storage.from("class-logos").createSignedUrl(c.logo_url, 3600);
            if (data?.signedUrl) previews[c.id] = data.signedUrl;
          }
        })
      );
      setLogoPreviews(previews);
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name })
      .eq("id", profile.id);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated");
    setSaving(false);
  };

  const updateClassField = (id: string, patch: Partial<AdminClass>) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleLogoUpload = async (classId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3MB");
      return;
    }
    setUploading(classId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${classId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("class-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      updateClassField(classId, { logo_url: path });
      const { data } = await supabase.storage.from("class-logos").createSignedUrl(path, 3600);
      if (data?.signedUrl) setLogoPreviews((p) => ({ ...p, [classId]: data.signedUrl }));
      toast.success("Logo uploaded. Click Save to keep changes.");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleSaveClass = async (c: AdminClass) => {
    const { error } = await supabase
      .from("tuition_classes")
      .update({ name: c.name, address: c.address, logo_url: c.logo_url })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else toast.success("Class saved");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <SeoHead
        title="My Profile | TrackAlpha Admin"
        description="Manage your admin profile, tuition class branding and account password."
        path="/admin-profile"
      />
      <main className="container mx-auto px-4 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Panel
        </Button>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your account, class branding and password.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {role === "super_admin" ? "Super Admin" : "Admin"}
          </Badge>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
            <TabsTrigger value="classes"><BookOpen className="w-4 h-4 mr-2" />My Classes</TabsTrigger>
            <TabsTrigger value="security"><KeyRound className="w-4 h-4 mr-2" />Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Account Details
                </CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profile?.full_name || ""}
                      onChange={(e) => setProfile({ ...profile!, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={email} disabled />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            {classes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground font-medium">You don't manage any classes yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create one from the Admin Panel &rarr; Classes.
                  </p>
                </CardContent>
              </Card>
            ) : (
              classes.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{c.name || "Untitled Class"}</CardTitle>
                    <CardDescription>
                      Logo and details shown on your students' result PDFs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      <div className="shrink-0">
                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center overflow-hidden">
                          {logoPreviews[c.id] ? (
                            <img
                              src={logoPreviews[c.id]}
                              alt={`${c.name} logo`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-primary/40" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        <Label htmlFor={`logo-${c.id}`} className="text-sm font-medium">
                          Class Logo
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            id={`logo-${c.id}`}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void handleLogoUpload(c.id, f);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById(`logo-${c.id}`)?.click()}
                            disabled={uploading === c.id}
                          >
                            {uploading === c.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            {logoPreviews[c.id] ? "Replace Logo" : "Upload Logo"}
                          </Button>
                          {c.logo_url && (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                updateClassField(c.id, { logo_url: null });
                                setLogoPreviews((p) => {
                                  const n = { ...p };
                                  delete n[c.id];
                                  return n;
                                });
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG or WEBP. Max 3MB. Square logos look best.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${c.id}`}>Class Name</Label>
                        <Input
                          id={`name-${c.id}`}
                          value={c.name}
                          onChange={(e) => updateClassField(c.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`addr-${c.id}`} className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> Address
                        </Label>
                        <Input
                          id={`addr-${c.id}`}
                          value={c.address || ""}
                          onChange={(e) => updateClassField(c.id, { address: e.target.value })}
                          placeholder="Street, City, State"
                        />
                      </div>
                    </div>

                    <Button onClick={() => handleSaveClass(c)}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Class
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <ChangePasswordCard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
