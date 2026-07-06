import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LatexInput } from "@/components/admin/LatexInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X, Upload, Image as ImageIcon } from "lucide-react";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  explanation?: string;
  explanationImage?: string;
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
  const [uploadingIdx, setUploadingIdx] = useState<string | null>(null);
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

  const handleImageUpload = async (
    qIndex: number,
    file: File,
    field: 'imageUrl' | 'explanationImage'
  ) => {
    const key = `${qIndex}-${field}`;
    setUploadingIdx(key);
    try {
      const fileExt = file.name.split('.').pop();
      const folder = field === 'explanationImage' ? 'explanations/' : '';
      const fileName = `${folder}${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('test-questions')
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('test-questions')
        .getPublicUrl(fileName);
      handleUpdateQuestion(qIndex, field, publicUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleRemoveImage = async (qIndex: number, field: 'imageUrl' | 'explanationImage') => {
    const imageUrl = questions[qIndex][field];
    if (!imageUrl) return;
    try {
      const urlParts = imageUrl.split('/test-questions/');
      const filePath = urlParts[urlParts.length - 1];
      if (filePath && urlParts.length > 1) {
        await supabase.storage.from('test-questions').remove([filePath]);
      }
    } catch (e) {
      // ignore storage removal errors, still clear the field
    }
    handleUpdateQuestion(qIndex, field, "");
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
                      <LatexInput
                        value={q.question}
                        onChange={(val) => handleUpdateQuestion(qIndex, "question", val)}
                        multiline
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Question Image (optional)</Label>
                      {q.imageUrl ? (
                        <div className="relative border rounded-lg p-3 bg-muted/50">
                          <img src={q.imageUrl} alt="Question" className="max-h-56 mx-auto rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveImage(qIndex, 'imageUrl')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingIdx === `${qIndex}-imageUrl`}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleImageUpload(qIndex, file, 'imageUrl');
                              };
                              input.click();
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingIdx === `${qIndex}-imageUrl` ? "Uploading..." : "Upload Image"}
                          </Button>
                        </div>
                      )}
                      <Input
                        value={q.imageUrl || ""}
                        onChange={(e) => handleUpdateQuestion(qIndex, "imageUrl", e.target.value)}
                        placeholder="Or paste image URL..."
                        className="text-xs"
                      />
                    </div>


                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex}>
                          <Label className="text-xs">Option {String.fromCharCode(65 + optIndex)}</Label>
                          <LatexInput
                            value={opt}
                            onChange={(val) => handleUpdateOption(qIndex, optIndex, val)}
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
                      <LatexInput
                        value={q.explanation || ""}
                        onChange={(val) => handleUpdateQuestion(qIndex, "explanation", val)}
                        placeholder="Enter explanation..."
                        multiline
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Explanation Image (optional)</Label>
                      {q.explanationImage ? (
                        <div className="relative border rounded-lg p-3 bg-muted/50">
                          <img src={q.explanationImage} alt="Explanation" className="max-h-56 mx-auto rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveImage(qIndex, 'explanationImage')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingIdx === `${qIndex}-explanationImage`}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/jpg,image/jpeg,image/png';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleImageUpload(qIndex, file, 'explanationImage');
                              };
                              input.click();
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingIdx === `${qIndex}-explanationImage` ? "Uploading..." : "Upload Explanation Image"}
                          </Button>
                        </div>
                      )}
                      <Input
                        value={q.explanationImage || ""}
                        onChange={(e) => handleUpdateQuestion(qIndex, "explanationImage", e.target.value)}
                        placeholder="Or paste image URL..."
                        className="text-xs"
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
