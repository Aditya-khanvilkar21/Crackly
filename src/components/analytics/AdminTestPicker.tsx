import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, ChevronRight, FileText, BookOpen } from "lucide-react";
import { AdminTestInsights } from "./AdminTestInsights";

type ExamType = "JEE" | "NEET" | "CET";
type TestType = "chapter_test" | "mock_test";

interface Props {
  examType: ExamType;
  userRole: string;
  onBack: () => void;
}

interface TestItem {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  test_type: TestType;
  created_at: string;
  attempts: number;
}

export const AdminTestPicker = ({ examType, userRole, onBack }: Props) => {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TestType>("all");
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const isSuper = userRole === "super_admin";

        let classQ = supabase.from("tuition_classes").select("id");
        if (!isSuper) classQ = classQ.eq("admin_id", session.user.id);
        const { data: classes } = await classQ;
        const classIds = (classes || []).map(c => c.id);

        const { data: cs } = await supabase
          .from("class_students")
          .select("student_id")
          .in("class_id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"]);
        const studentIds = [...new Set((cs || []).map(x => x.student_id))];

        // Get tests with attempts by these students
        const { data: results } = await supabase
          .from("test_results")
          .select("test_id, student_id")
          .in("student_id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

        const attemptMap = new Map<string, number>();
        (results || []).forEach(r => attemptMap.set(r.test_id, (attemptMap.get(r.test_id) || 0) + 1));

        const testIds = [...new Set((results || []).map(r => r.test_id))];
        if (testIds.length === 0) { setTests([]); setLoading(false); return; }

        const { data: testsData } = await supabase
          .from("tests")
          .select("id, title, subject, chapter, test_type, created_at")
          .in("id", testIds)
          .eq("exam_type", examType);

        const items: TestItem[] = (testsData || []).map(t => ({
          id: t.id,
          title: t.title,
          subject: t.subject,
          chapter: t.chapter,
          test_type: t.test_type as TestType,
          created_at: t.created_at,
          attempts: attemptMap.get(t.id) || 0,
        })).sort((a, b) => b.created_at.localeCompare(a.created_at));

        setTests(items);
      } finally {
        setLoading(false);
      }
    })();
  }, [examType, userRole]);

  const filtered = useMemo(() => tests.filter(t =>
    (typeFilter === "all" || t.test_type === typeFilter) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) ||
     (t.chapter || "").toLowerCase().includes(search.toLowerCase()))
  ), [tests, typeFilter, search]);

  if (selectedTestId) {
    return <AdminTestInsights testId={selectedTestId} userRole={userRole} onBack={() => setSelectedTestId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{examType} Test Insights</h2>
          <p className="text-sm text-muted-foreground">Pick a test to open the full analytics dashboard</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search test or chapter…" className="pl-9 h-10" />
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(["all", "mock_test", "chapter_test"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                typeFilter === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All" : t === "mock_test" ? "Mock" : "Chapter"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">No attempted tests yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <Card
              key={t.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/40 active:scale-[0.995] transition-all"
              onClick={() => setSelectedTestId(t.id)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${t.test_type === "mock_test" ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600" : "bg-blue-100 dark:bg-blue-950/40 text-blue-600"}`}>
                  {t.test_type === "mock_test" ? <FileText className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{t.title}</span>
                    {t.subject && <Badge variant="outline" className="text-[10px] capitalize">{t.subject}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {t.chapter || (t.test_type === "mock_test" ? "Full-length mock" : "Chapter test")}
                    <span className="mx-1.5">·</span>
                    {t.attempts} attempt{t.attempts === 1 ? "" : "s"}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
