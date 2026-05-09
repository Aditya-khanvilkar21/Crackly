import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  Clock,
  Radio,
  CheckCircle2,
  PlayCircle,
  Users,
  CalendarIcon,
} from "lucide-react";

type Status = "Upcoming" | "Live" | "Completed";

interface Row {
  id: string;
  test_id: string;
  class_id: string;
  scheduled_at: string;
  duration_minutes: number;
  instructions: string | null;
  test?: { title: string };
  klass?: { name: string };
}

const computeStatus = (scheduledAt: string, duration: number): Status => {
  const start = new Date(scheduledAt).getTime();
  const end = start + duration * 60_000;
  const now = Date.now();
  if (now < start) return "Upcoming";
  if (now <= end) return "Live";
  return "Completed";
};

const formatCountdown = (targetMs: number) => {
  const diff = Math.max(0, targetMs - Date.now());
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

export const ScheduledTestsPanel = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  // refresh every second for countdowns/status
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: schedRaw } = await supabase
      .from("scheduled_tests")
      .select("id, test_id, class_id, scheduled_at, duration_minutes, instructions")
      .order("scheduled_at", { ascending: true });
    const sched = (schedRaw as any[]) || [];
    if (sched.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const testIds = Array.from(new Set(sched.map((s) => s.test_id)));
    const classIds = Array.from(new Set(sched.map((s) => s.class_id)));
    const [{ data: testsData }, { data: classData }] = await Promise.all([
      supabase.from("tests").select("id, title").in("id", testIds),
      supabase.from("tuition_classes").select("id, name").in("id", classIds),
    ]);
    const tMap = new Map(((testsData as any[]) || []).map((t) => [t.id, t]));
    const cMap = new Map(((classData as any[]) || []).map((c) => [c.id, c]));
    setRows(
      sched.map((r) => ({
        ...r,
        test: tMap.get(r.test_id),
        klass: cMap.get(r.class_id),
      }))
    );
    setLoading(false);
  };

  const grouped = useMemo(() => {
    const out: Record<Status, Row[]> = { Upcoming: [], Live: [], Completed: [] };
    for (const r of rows) out[computeStatus(r.scheduled_at, r.duration_minutes)].push(r);
    out.Live.sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
    out.Upcoming.sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
    out.Completed.sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at));
    return out;
  }, [rows]);

  if (loading) return null;
  if (rows.length === 0) return null;

  const TestCard = ({ row }: { row: Row }) => {
    const status = computeStatus(row.scheduled_at, row.duration_minutes);
    const start = new Date(row.scheduled_at);
    const end = new Date(start.getTime() + row.duration_minutes * 60_000);
    return (
      <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className={`overflow-hidden rounded-xl ${
            status === "Live" ? "border-emerald-500/40 shadow-md shadow-emerald-500/10" : ""
          }`}
        >
          <div
            className={`h-1 ${
              status === "Live"
                ? "bg-gradient-to-r from-emerald-500 to-green-500"
                : status === "Upcoming"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                  : "bg-muted"
            }`}
          />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                status === "Live"
                  ? "bg-emerald-500/15"
                  : status === "Upcoming"
                    ? "bg-blue-500/15"
                    : "bg-muted"
              }`}>
                {status === "Live" ? (
                  <Radio className="h-5 w-5 text-emerald-600" />
                ) : status === "Upcoming" ? (
                  <CalendarClock className="h-5 w-5 text-blue-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-sm truncate">{row.test?.title || "Test"}</h4>
                  {status === "Live" && (
                    <Badge className="bg-emerald-500 text-white text-[10px] animate-pulse">
                      LIVE NOW
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {row.klass?.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {start.toLocaleDateString()}{" "}
                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {row.duration_minutes}m
                  </span>
                </div>

                {row.instructions && (
                  <p className="text-xs mt-2 p-2 rounded-md bg-muted/50">{row.instructions}</p>
                )}

                {status === "Upcoming" && (
                  <div className="mt-3 text-xs">
                    <span className="text-muted-foreground">Starts in </span>
                    <span className="font-mono font-semibold text-blue-600">
                      {formatCountdown(start.getTime())}
                    </span>
                  </div>
                )}
                {status === "Live" && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs">
                      <span className="text-muted-foreground">Closes in </span>
                      <span className="font-mono font-semibold text-emerald-600">
                        {formatCountdown(end.getTime())}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/take-test/${row.test_id}`)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <PlayCircle className="h-4 w-4 mr-1.5" />
                      Start Now
                    </Button>
                  </div>
                )}
                {status === "Completed" && (
                  <p className="mt-2 text-xs text-muted-foreground">Window closed</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h3 className="font-bold">Scheduled Tests</h3>
        </div>
        <Tabs defaultValue={grouped.Live.length > 0 ? "Live" : "Upcoming"}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="Upcoming">
              Upcoming{grouped.Upcoming.length > 0 && ` (${grouped.Upcoming.length})`}
            </TabsTrigger>
            <TabsTrigger value="Live">
              Live{grouped.Live.length > 0 && ` (${grouped.Live.length})`}
            </TabsTrigger>
            <TabsTrigger value="Completed">Completed</TabsTrigger>
          </TabsList>
          {(["Upcoming", "Live", "Completed"] as Status[]).map((s) => (
            <TabsContent key={s} value={s} className="space-y-2 mt-3">
              {grouped[s].length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No {s.toLowerCase()} tests
                </p>
              ) : (
                <AnimatePresence>
                  {grouped[s].map((r) => (
                    <TestCard key={r.id} row={r} />
                  ))}
                </AnimatePresence>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
