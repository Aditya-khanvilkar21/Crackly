import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Target, Unlock, Lock, Plus } from "lucide-react";
import { CreateTest } from "./CreateTest";

interface Test {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  difficulty: string;
  duration_minutes: number;
  created_at: string;
  questions: any;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
    fetchClasses();
    fetchTestAvailability();
  }, []);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("is_active", true)
        .eq("subject", "physics")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTests(data || []);
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
      const { data, error } = await supabase
        .from("tuition_classes")
        .select("id, name")
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
      case "easy":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "hard":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {userRole === "super_admin" ? (
        <Tabs defaultValue="availability" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="availability">Test Availability</TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-2" />
              Create New Test
            </TabsTrigger>
          </TabsList>

          <TabsContent value="availability" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Management</CardTitle>
                <CardDescription>
                  Unlock tests for your classes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tests available yet. Create a test to get started.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {tests.map((test) => (
                      <Card key={test.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{test.title}</CardTitle>
                              <CardDescription>{test.chapter}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getDifficultyColor(test.difficulty)}>
                                {test.difficulty}
                              </Badge>
                              <Badge variant="outline">{test.subject}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {test.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {Array.isArray(test.questions) ? test.questions.length : 0} questions
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            <p className="text-sm font-medium">Unlock for Classes:</p>
                            {classes.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No classes available. Create a class first.</p>
                            ) : (
                              <div className="space-y-2">
                                {classes.map((cls) => {
                                  const availability = testAvailability[test.id]?.find(
                                    (a) => a.class_id === cls.id
                                  );
                                  const isLocked = availability?.is_locked !== false;

                                  return (
                                    <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                                      <span className="text-sm">{cls.name}</span>
                                      <Button
                                        size="sm"
                                        variant={isLocked ? "default" : "outline"}
                                        onClick={() =>
                                          isLocked
                                            ? handleUnlockTest(test.id, cls.id)
                                            : handleLockTest(test.id, cls.id)
                                        }
                                      >
                                        {isLocked ? (
                                          <>
                                            <Unlock className="h-4 w-4 mr-2" />
                                            Unlock
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="h-4 w-4 mr-2" />
                                            Lock
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <CreateTest onTestCreated={() => {
              fetchTests();
              fetchTestAvailability();
            }} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Test Management</CardTitle>
            <CardDescription>
              Unlock tests for your classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tests available yet. Contact a super admin to create tests.
              </div>
            ) : (
              <div className="space-y-6">
                {tests.map((test) => (
                  <Card key={test.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          <CardDescription>{test.chapter}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getDifficultyColor(test.difficulty)}>
                            {test.difficulty}
                          </Badge>
                          <Badge variant="outline">{test.subject}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {test.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {Array.isArray(test.questions) ? test.questions.length : 0} questions
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Unlock for Classes:</p>
                        {classes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No classes available. Create a class first.</p>
                        ) : (
                          <div className="space-y-2">
                            {classes.map((cls) => {
                              const availability = testAvailability[test.id]?.find(
                                (a) => a.class_id === cls.id
                              );
                              const isLocked = availability?.is_locked !== false;

                              return (
                                <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <span className="text-sm">{cls.name}</span>
                                  <Button
                                    size="sm"
                                    variant={isLocked ? "default" : "outline"}
                                    onClick={() =>
                                      isLocked
                                        ? handleUnlockTest(test.id, cls.id)
                                        : handleLockTest(test.id, cls.id)
                                    }
                                  >
                                    {isLocked ? (
                                      <>
                                        <Unlock className="h-4 w-4 mr-2" />
                                        Unlock
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="h-4 w-4 mr-2" />
                                        Lock
                                      </>
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
