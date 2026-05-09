import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  Clock,
  Users,
  FileText,
  Sparkles,
  Trash2,
  Search,
  Radio,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

type ExamType = "JEE" | "NEET" | "CET";

interface MockTest {
  id: string;
  title: string;
  exam_type: ExamType;
  duration_minutes: number;
}
interface ClassRow {
  id: string;
  name: string;
}
interface ScheduledRow {
  id: string;
  test_id: string;
  class_id: string;
  scheduled_at: string;
  duration_minutes: number;
  instructions: string | null;
  test?: { title: string; exam_type: ExamType };
  klass?: { name: string };
}

type Status = "Upcoming" | "Live" | "Completed";
const computeStatus = (scheduledAt: string, duration: number): Status => {
  const start = new Date(scheduledAt).getTime();
  const end = start + duration * 60_000;
  const now = Date.now();
  if (now < start) return "Upcoming";
  if (now <= end) return "Live";
  return "Completed";
};

const statusStyles: Record<Status, string> = {
  Upcoming: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  Live: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 animate-pulse",
  Completed: "bg-muted text-muted-foreground border-border",
};

export const ScheduleMockTest = () => {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledRow[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [testId, setTestId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // list filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");

  // tick to refresh statuses every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: testsData }, { data: classData }] = await Promise.all([
      supabase
        .from("tests")
        .select("id, title, exam_type, duration_minutes")
        .eq("test_type", "mock_test")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase.from("tuition_classes").select("id, name").order("name"),
    ]);
    setTests((testsData as MockTest[]) || []);
    setClasses((classData as ClassRow[]) || []);
    await loadScheduled((testsData as MockTest[]) || [], (classData as ClassRow[]) || []);
    setLoading(false);
  };

  const loadScheduled = async (testsRef?: MockTest[], classesRef?: ClassRow[]) => {
    const { data } = await supabase
      .from("scheduled_tests")
      .select("id, test_id, class_id, scheduled_at, duration_minutes, instructions")
      .order("scheduled_at", { ascending: false });
    const tMap = new Map((testsRef || tests).map((t) => [t.id, t]));
    const cMap = new Map((classesRef || classes).map((c) => [c.id, c]));
    const enriched: ScheduledRow[] = ((data as any[]) || []).map((r) => ({
      ...r,
      test: tMap.get(r.test_id) ? { title: tMap.get(r.test_id)!.title, exam_type: tMap.get(r.test_id)!.exam_type } : undefined,
      klass: cMap.get(r.class_id) ? { name: cMap.get(r.class_id)!.name } : undefined,
    }));
    setScheduled(enriched);
  };

  const selectedTest = useMemo(() => tests.find((t) => t.id === testId), [tests, testId]);

  // Auto-fill duration from selected test
  useEffect(() => {
    if (selectedTest) setDuration(selectedTest.duration_minutes);
  }, [selectedTest]);

  const resetForm = () => {
    setTestId("");
    setSelectedClassIds([]);
    setDate("");
    setTime("");
    setDuration(60);
    setInstructions("");
  };

  const validate = (): string | null => {
    if (!testId) return "Please select a test.";
    if (selectedClassIds.length === 0) return "Please select at least one batch.";
    if (!date || !time) return "Please pick a date and start time.";
    if (!duration || duration <= 0) return "Duration must be greater than 0.";
    const start = new Date(`${date}T${time}`);
    if (Number.isNaN(start.getTime())) return "Invalid date/time.";
    return null;
  };

  const handleSubmitClick = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSchedule = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const rows = selectedClassIds.map((cid) => ({
        test_id: testId,
        class_id: cid,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        instructions: instructions || null,
        created_by: user.id,
      }));

      const { error } = await supabase.from("scheduled_tests").insert(rows);
      if (error) throw error;

      toast.success(
        `Scheduled for ${selectedClassIds.length} batch${selectedClassIds.length > 1 ? "es" : ""}`
      );
      resetForm();
      await loadScheduled();
    } catch (e: any) {
      toast.error(e.message || "Failed to schedule test");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("scheduled_tests").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Schedule removed");
    setScheduled((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = useMemo(() => {
    return scheduled.filter((r) => {
      const status = computeStatus(r.scheduled_at, r.duration_minutes);
      if (statusFilter !== "All" && status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (r.test?.title || "").toLowerCase().includes(q) ||
        (r.klass?.name || "").toLowerCase().includes(q) ||
        new Date(r.scheduled_at).toLocaleString().toLowerCase().includes(q)
      );
    });
  }, [scheduled, search, statusFilter]);

  const toggleClass = (id: string) =>
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-lg"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">Schedule Mock Test</h2>
            <p className="text-sm opacity-90">Assign tests to specific batches</p>
          </div>
        </div>
      </motion.div>

      {/* Form Card */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" /> Select Test
            </Label>
            <Select value={testId} onValueChange={setTestId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choose a mock test" />
              </SelectTrigger>
              <SelectContent>
                {tests.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No mock tests found</div>
                )}
                {tests.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="font-medium">{t.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">· {t.exam_type} · {t.duration_minutes}m</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" /> Batches
              {selectedClassIds.length > 0 && (
                <Badge variant="secondary" className="ml-1">{selectedClassIds.length} selected</Badge>
              )}
            </Label>
            <div className="rounded-xl border bg-muted/20 p-2 max-h-44 overflow-y-auto">
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No classes available.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {classes.map((c) => {
                    const checked = selectedClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                          checked
                            ? "bg-primary/10 border-primary/40"
                            : "bg-card border-transparent hover:border-border"
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleClass(c.id)} />
                        <span className="text-sm font-medium truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-primary" /> Date
              </Label>
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" /> Start Time
              </Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> Duration (min)
              </Label>
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Instructions (optional)</Label>
            <Textarea
              rows={3}
              placeholder="E.g. Use a stable internet connection. Do not switch tabs."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button onClick={handleSubmitClick} disabled={submitting} className="flex-1 h-11">
              <CalendarClock className="h-4 w-4 mr-2" />
              {submitting ? "Scheduling..." : "Schedule Test"}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={submitting} className="h-11">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-bold">Scheduled Tests</h3>
          <Badge variant="outline">{scheduled.length} total</Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by test, batch or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="sm:w-40 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Upcoming">Upcoming</SelectItem>
              <SelectItem value="Live">Live</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No scheduled tests match your filter.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((row) => {
                const status = computeStatus(row.scheduled_at, row.duration_minutes);
                const start = new Date(row.scheduled_at);
                return (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Card className="rounded-xl hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                          {status === "Live" ? (
                            <Radio className="h-5 w-5 text-emerald-600" />
                          ) : status === "Completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <CalendarClock className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm truncate">{row.test?.title || "Test"}</h4>
                            <Badge variant="outline" className={`text-[10px] ${statusStyles[status]}`}>
                              {status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {row.klass?.name || "Batch"}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {row.duration_minutes}m
                            </span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(row.id)}
                          className="text-destructive hover:text-destructive shrink-0"
                          aria-label="Delete schedule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule this test?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">
                <b>{selectedTest?.title}</b> will be scheduled for{" "}
                <b>{selectedClassIds.length}</b> batch{selectedClassIds.length > 1 ? "es" : ""} on{" "}
                <b>
                  {date} at {time}
                </b>{" "}
                for <b>{duration} min</b>.
              </span>
              <span className="block mt-2 text-xs">
                Students will be able to start only during this window.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSchedule}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
