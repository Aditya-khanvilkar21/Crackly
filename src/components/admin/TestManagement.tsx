import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Unlock, Lock } from "lucide-react";
import { CreateTest } from "./CreateTest";
import { CreateMockTest } from "./CreateMockTest";
import { CreateNEETMockTest } from "./CreateNEETMockTest";
import { CreateCETMockTest } from "./CreateCETMockTest";
import { EditTest } from "./EditTest";
import { CloneTest } from "./CloneTest";

type ExamType = 'JEE' | 'NEET' | 'CET';

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  difficulty: string;
  duration_minutes: number;
  created_at: string;
  questions: any;
  test_type: 'chapter_test' | 'mock_test';
  exam_type: ExamType;
  negative_marking?: number | null;
  cloned_from?: string | null;
}

interface TuitionClass {
  id: string;
  name: string;
}

interface TestAvailability {
  class_id: string;
  is_locked: boolean;
}

interface TestManagementProps {
  userRole: string;
}

export const TestManagement = ({ userRole }: TestManagementProps) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [classes, setClasses] = useState<TuitionClass[]>([]);
  const [testAvailability, setTestAvailability] = useState<Record<string, TestAvailability[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('JEE');
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
    if (userRole === "admin") {
      fetchClasses();
      fetchTestAvailability();
    }
  }, [userRole]);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTests((data || []) as Test[]);
    } catch (error: any) {
      toast({
        title: "Error fetching tests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("tuition_classes")
        .select("id, name")
        .eq("admin_id", session.user.id)
        .order("name");

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchTestAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from("test_availability")
        .select("test_id, class_id, is_locked");

      if (error) throw error;
      
      const availability: Record<string, TestAvailability[]> = {};
      data?.forEach((item) => {
        if (!availability[item.test_id]) {
          availability[item.test_id] = [];
        }
        availability[item.test_id].push({
          class_id: item.class_id,
          is_locked: item.is_locked || false,
        });
      });
      setTestAvailability(availability);
    } catch (error: any) {
      console.error("Error fetching test availability:", error);
    }
  };

  const handleUnlockTest = async (testId: string, classId: string) => {
    try {
      const { error } = await supabase
        .from("test_availability")
        .upsert({ 
          test_id: testId, 
          class_id: classId, 
          is_locked: false 
        }, { 
          onConflict: "test_id,class_id" 
        });

      if (error) throw error;

      toast({
        title: "Test Unlocked",
        description: "Students in this class can now access the test",
      });
      
      fetchTestAvailability();
    } catch (error: any) {
      toast({
        title: "Error unlocking test",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLockTest = async (testId: string, classId: string) => {
    try {
      const { error } = await supabase
        .from("test_availability")
        .upsert({ 
          test_id: testId, 
          class_id: classId, 
          is_locked: true 
        }, { 
          onConflict: "test_id,class_id" 
        });

      if (error) throw error;

      toast({
        title: "Test Locked",
        description: "Students in this class can no longer access the test",
      });
      
      fetchTestAvailability();
    } catch (error: any) {
      toast({
        title: "Error locking test",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "medium": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "hard": return "bg-red-500/10 text-red-700 dark:text-red-400";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const getExamColor = (exam: ExamType) => {
    switch (exam) {
      case 'JEE': return 'blue';
      case 'NEET': return 'green';
      case 'CET': return 'purple';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const filteredTests = tests.filter(t => t.exam_type === selectedExamType);
  const mockTests = filteredTests.filter(t => t.test_type === 'mock_test');
  const chapterTests = filteredTests.filter(t => t.test_type === 'chapter_test');

  const renderTestCard = (test: Test, showUnlockControls: boolean) => (
    <Card key={test.id} className="border-l-4" style={{ borderLeftColor: `var(--${getExamColor(test.exam_type)}-500, #3b82f6)` }}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{test.title}</CardTitle>
              <Badge variant="outline">{test.exam_type}</Badge>
            </div>
            <CardDescription>
              {test.test_type === 'mock_test' 
                ? `Full Syllabus Mock Test` 
                : `${test.chapter} • ${test.subject}`}
            </CardDescription>
          </div>
          <Badge className={getDifficultyColor(test.difficulty)}>
            {test.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {Array.isArray(test.questions) ? test.questions.length : 0} Questions
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {test.duration_minutes} min
          </span>
        </div>

        {showUnlockControls && classes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Unlock for classes:</p>
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => {
                const availability = testAvailability[test.id]?.find(a => a.class_id === cls.id);
                const isUnlocked = availability && !availability.is_locked;
                
                return (
                  <Button
                    key={cls.id}
                    size="sm"
                    variant={isUnlocked ? "default" : "outline"}
                    onClick={() => isUnlocked 
                      ? handleLockTest(test.id, cls.id)
                      : handleUnlockTest(test.id, cls.id)
                    }
                  >
                    {isUnlocked ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                    {cls.name}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {userRole === "super_admin" && (
          <div className="mt-4">
            <EditTest 
              test={test as any} 
              onTestUpdated={fetchTests} 
              onTestDeleted={fetchTests} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Exam Type Tabs */}
      <Tabs value={selectedExamType} onValueChange={(v) => setSelectedExamType(v as ExamType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="JEE" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            JEE ({tests.filter(t => t.exam_type === 'JEE').length})
          </TabsTrigger>
          <TabsTrigger value="NEET" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            NEET ({tests.filter(t => t.exam_type === 'NEET').length})
          </TabsTrigger>
          <TabsTrigger value="CET" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            CET ({tests.filter(t => t.exam_type === 'CET').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedExamType} className="mt-6 space-y-6">
          {userRole === "super_admin" && (
            <>
              <CreateTest onTestCreated={fetchTests} />
              {selectedExamType === 'JEE' && (
                <CreateMockTest onTestCreated={fetchTests} />
              )}
              {selectedExamType === 'NEET' && (
                <CreateNEETMockTest onTestCreated={fetchTests} />
              )}
              {selectedExamType === 'CET' && (
                <CreateCETMockTest onTestCreated={fetchTests} />
              )}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                {userRole === "super_admin" ? `Manage ${selectedExamType} Tests` : `${selectedExamType} Test Management`}
              </CardTitle>
              <CardDescription>
                {userRole === "super_admin" 
                  ? `Edit or delete existing ${selectedExamType} tests`
                  : `Unlock ${selectedExamType} tests for your classes`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No {selectedExamType} tests {userRole === "super_admin" ? "created" : "available"} yet.
                </p>
              ) : (
                <div className="space-y-8">
                  {/* Mock Tests */}
                  {mockTests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className={`w-1 h-6 bg-${getExamColor(selectedExamType)}-500 rounded-full`}></div>
                        {selectedExamType} Mock Tests
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {mockTests.map((test) => renderTestCard(test, userRole === "admin"))}
                      </div>
                    </div>
                  )}

                  {/* Chapter Tests */}
                  {chapterTests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className={`w-1 h-6 bg-${getExamColor(selectedExamType)}-500 rounded-full`}></div>
                        {selectedExamType} Chapter Tests
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {chapterTests.map((test) => renderTestCard(test, userRole === "admin"))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
