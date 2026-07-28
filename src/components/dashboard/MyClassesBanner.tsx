import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

interface ClassInfo {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  logoSigned?: string | null;
}

export const MyClassesBanner = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: memberships } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", session.user.id);

      const ids = (memberships || []).map((m: any) => m.class_id);
      if (ids.length === 0) { setLoading(false); return; }

      const { data: cls } = await supabase
        .from("tuition_classes")
        .select("id, name, address, logo_url")
        .in("id", ids);

      const withLogos: ClassInfo[] = await Promise.all(
        (cls || []).map(async (c: any) => {
          let logoSigned: string | null = null;
          if (c.logo_url) {
            const { data } = await supabase.storage
              .from("class-logos")
              .createSignedUrl(c.logo_url, 3600);
            logoSigned = data?.signedUrl ?? null;
          }
          return { ...c, logoSigned };
        })
      );
      setClasses(withLogos);
      setLoading(false);
    })();
  }, []);

  if (loading || classes.length === 0) return null;

  return (
    <div className="space-y-2">
      {classes.map((c) => (
        <Card key={c.id} className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-background border flex items-center justify-center shrink-0 overflow-hidden">
              {c.logoSigned ? (
                <img src={c.logoSigned} alt={`${c.name} logo`} className="w-full h-full object-contain" />
              ) : (
                <GraduationCap className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Tuition Class</p>
              <p className="font-semibold text-sm truncate">{c.name}</p>
              {c.address && (
                <p className="text-xs text-muted-foreground truncate">{c.address}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
