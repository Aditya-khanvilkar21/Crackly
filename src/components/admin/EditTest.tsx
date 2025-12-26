import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X, Image } from "lucide-react";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  explanation?: string;
  subject?: string;
}

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  difficulty: string;
  duration_minutes: number;
  questions: Question[];
  test_type: 'chapter_test' | 'mock_test';
}

interface EditTestProps {
  test: Test;
  onTestUpdated: () => void;
  onTestDeleted: () => void;
}

export const EditTest = ({ test, onTestUpdated, onTestDeleted }: EditTestProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(test.title);
  const [subject, setSubject] = useState(test.subject || "");
  const [chapter, setChapter] = useState(test.chapter || "");
  const [difficulty, setDifficulty] = useState(test.difficulty);
  const [duration, setDuration] = useState(test.duration_minutes.toString());
  const [questions, setQuestions] = useState<Question[]>(test.questions || []);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setTitle(test.title);
      setSubject(test.subject || "");
      setChapter(test.chapter || "");
      setDifficulty(test.difficulty);
      setDuration(test.duration_minutes.toString());
      setQuestions(test.questions || []);
    }
  }, [isOpen, test]);

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question: "", options: ["", "", "", ""], correctAnswer: 0 }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    if (questions.length === 0) {
      toast({ title: "At least one question is required", variant: "destructive" });
      return;
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast({ title: `Question ${i + 1} is empty`, variant: "destructive" });
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        toast({ title: `All options in Question ${i + 1} must be filled`, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const updateData: any = {
        title,
        difficulty,
        duration_minutes: parseInt(duration),
        questions,
        updated_at: new Date().toISOString()
      };

      if (test.test_type === 'chapter_test') {
        updateData.subject = subject;
        updateData.chapter = chapter;
      }

      const { error } = await supabase
        .from("tests")
        .update(updateData)
        .eq("id", test.id);

      if (error) throw error;

      toast({ title: "Test updated successfully" });
      setIsOpen(false);
      onTestUpdated();
    } catch (error: any) {
      toast({ title: "Error updating test", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      // First delete test availability records
      await supabase
        .from("test_availability")
        .delete()
        .eq("test_id", test.id);

      // Then delete test results
      await supabase
        .from("test_results")
        .delete()
        .eq("test_id", test.id);

      // Finally delete the test
      const { error } = await supabase
        .from("tests")
        .delete()
        .eq("id", test.id);

      if (error) throw error;

      toast({ title: "Test deleted successfully" });
      onTestDeleted();
    } catch (error: any) {
      toast({ title: "Error deleting test", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Test: {test.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            {test.test_type === 'chapter_test' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="biology">Biology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chapter</Label>
                  <Input value={chapter} onChange={(e) => setChapter(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Questions ({questions.length})</Label>
                <Button type="button" size="sm" onClick={handleAddQuestion}>
                  <Plus className="h-4 w-4 mr-1" /> Add Question
                </Button>
              </div>

              {questions.map((q, qIndex) => (
                <Card key={qIndex} className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-destructive"
                    onClick={() => handleRemoveQuestion(qIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Question {qIndex + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Question Text</Label>
                      <Textarea
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(qIndex, "question", e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label>Image URL (optional)</Label>
                      <Input
                        value={q.imageUrl || ""}
                        onChange={(e) => handleUpdateQuestion(qIndex, "imageUrl", e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex}>
                          <Label className="text-xs">Option {String.fromCharCode(65 + optIndex)}</Label>
                          <Input
                            value={opt}
                            onChange={(e) => handleUpdateOption(qIndex, optIndex, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <Label>Correct Answer</Label>
                      <Select
                        value={q.correctAnswer.toString()}
                        onValueChange={(v) => handleUpdateQuestion(qIndex, "correctAnswer", parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Option A</SelectItem>
                          <SelectItem value="1">Option B</SelectItem>
                          <SelectItem value="2">Option C</SelectItem>
                          <SelectItem value="3">Option D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Explanation (Optional)</Label>
                      <Textarea
                        placeholder="Enter explanation for the correct answer..."
                        value={q.explanation || ""}
                        onChange={(e) => handleUpdateQuestion(qIndex, "explanation", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{test.title}" and all associated results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
