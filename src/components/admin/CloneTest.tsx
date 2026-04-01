import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePreGenModal } from "@/components/admin/ImagePreGenModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LatexInput } from "@/components/admin/LatexInput";
import { LatexRenderer } from "@/components/LatexRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, ChevronLeft, ChevronRight, X, Upload, Image as ImageIcon } from "lucide-react";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  explanation?: string;
  topic?: string;
  subject?: string;
}

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  difficulty: string;
  duration_minutes: number;
  questions: any;
  test_type: "chapter_test" | "mock_test";
  exam_type: "JEE" | "NEET" | "CET";
  negative_marking?: number | null;
}

interface CloneTestProps {
  test: Test;
  onTestCloned: () => void;
}

export const CloneTest = ({ test, onTestCloned }: CloneTestProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { toast } = useToast();
  const [preGenTestId, setPreGenTestId] = useState<string | null>(null);
  const [preGenQuestions, setPreGenQuestions] = useState<any[]>([]);
  const [showPreGen, setShowPreGen] = useState(false);

  // Clone state
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState<"JEE" | "NEET" | "CET">("JEE");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [duration, setDuration] = useState("");
  const [negativeMarking, setNegativeMarking] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const handleOpen = () => {
    // Pre-fill from source test
    const sourceQuestions: Question[] = Array.isArray(test.questions)
      ? test.questions.map((q: any) => ({
          question: q.question || "",
          options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""],
          correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
          imageUrl: q.imageUrl || undefined,
          explanation: q.explanation || "",
          topic: q.topic || "",
          subject: q.subject || "",
        }))
      : [];

    setTitle(`${test.title} (Clone)`);
    setExamType(test.exam_type);
    setSubject(test.subject || "");
    setChapter(test.chapter || "");
    setDifficulty(test.difficulty);
    setDuration(test.duration_minutes.toString());
    setNegativeMarking(test.negative_marking?.toString() || "0");
    setQuestions(sourceQuestions);
    setCurrentQuestionIndex(0);
    setIsOpen(true);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: newOptions };
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", topic: "" },
    ]);
    setCurrentQuestionIndex(questions.length);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast({ title: "Must have at least 1 question", variant: "destructive" });
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (currentQuestionIndex >= updated.length) {
      setCurrentQuestionIndex(updated.length - 1);
    }
  };

  const handleImageUpload = async (questionIndex: number, file: File) => {
    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("test-questions")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("test-questions").getPublicUrl(fileName);
      updateQuestion(questionIndex, "imageUrl", publicUrl);
      toast({ title: "Image uploaded" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
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
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast({ title: `Question ${i + 1} is empty`, variant: "destructive" });
        return;
      }
      if (q.options.some((opt) => !opt.trim())) {
        toast({ title: `All options in Q${i + 1} must be filled`, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const insertData: any = {
        title,
        exam_type: examType,
        difficulty,
        duration_minutes: parseInt(duration) || 60,
        questions,
        test_type: test.test_type,
        is_active: true,
        negative_marking: parseFloat(negativeMarking) || 0,
        cloned_from: test.id,
      };

      if (test.test_type === "chapter_test") {
        insertData.subject = subject;
        insertData.chapter = chapter;
      }

      const { data: insertedTest, error } = await supabase.from("tests").insert(insertData).select("id").single();
      if (error) throw error;

      toast({ title: "Test cloned! Generating images...", description: `New ${examType} test created.` });
      setIsOpen(false);
      setPreGenTestId(insertedTest.id);
      setPreGenQuestions(questions);
      setShowPreGen(true);
    } catch (error: any) {
      toast({ title: "Error cloning test", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <Copy className="h-4 w-4 mr-1" /> Clone
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clone Test: {test.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Creates a new independent test pre-filled from the original. Edit any field before saving.
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Test Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Test Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Exam Type</Label>
                <Select value={examType} onValueChange={(v) => setExamType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="NEET">NEET</SelectItem>
                    <SelectItem value="CET">CET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {test.test_type === "chapter_test" && (
                <>
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
                </>
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
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div>
                <Label>Negative Marking</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.value)}
                />
              </div>
            </div>

            {/* Question Navigator */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">
                    Questions ({questions.length}) — Editing Q{currentQuestionIndex + 1}
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddQuestion}>
                    + Add Question
                  </Button>
                </div>

                {/* Question number grid */}
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((q, i) => {
                    const filled = q.question.length > 0 && q.options.every((o) => o.length > 0);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentQuestionIndex(i)}
                        className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                          currentQuestionIndex === i
                            ? "bg-primary text-primary-foreground"
                            : filled
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Current Question Editor */}
                {currentQuestion && (
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Question {currentQuestionIndex + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleRemoveQuestion(currentQuestionIndex)}
                      >
                        <X className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Question Text</Label>
                        <LatexInput
                          value={currentQuestion.question}
                          onChange={(val) => updateQuestion(currentQuestionIndex, "question", val)}
                          placeholder="Enter question... Use $...$ for math"
                          multiline
                        />
                      </div>

                      {/* Image */}
                      <div>
                        <Label>Image (Optional)</Label>
                        {currentQuestion.imageUrl ? (
                          <div className="relative border rounded-lg p-3 bg-muted/50 mt-1">
                            <img
                              src={currentQuestion.imageUrl}
                              alt="Question diagram"
                              className="max-h-48 mx-auto rounded"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => updateQuestion(currentQuestionIndex, "imageUrl", undefined)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-1"
                            disabled={uploadingImage}
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*";
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleImageUpload(currentQuestionIndex, file);
                              };
                              input.click();
                            }}
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            {uploadingImage ? "Uploading..." : "Upload Image"}
                          </Button>
                        )}
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <Label>Options (Select correct answer)</Label>
                        <RadioGroup
                          value={currentQuestion.correctAnswer.toString()}
                          onValueChange={(v) =>
                            updateQuestion(currentQuestionIndex, "correctAnswer", parseInt(v))
                          }
                        >
                          {currentQuestion.options.map((opt, oi) => (
                            <div key={oi} className="flex items-start gap-2">
                              <RadioGroupItem value={oi.toString()} className="mt-2.5" />
                              <div className="flex-1">
                                <LatexInput
                                  value={opt}
                                  onChange={(val) => updateOption(currentQuestionIndex, oi, val)}
                                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                />
                              </div>
                            </div>
                          ))}
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground">
                          Correct: Option {String.fromCharCode(65 + currentQuestion.correctAnswer)}
                        </p>
                      </div>

                      {/* Topic */}
                      <div>
                        <Label>Topic (Optional)</Label>
                        <Input
                          value={currentQuestion.topic || ""}
                          onChange={(e) => updateQuestion(currentQuestionIndex, "topic", e.target.value)}
                          placeholder="e.g., Kinematics"
                        />
                      </div>

                      {/* Explanation */}
                      <div>
                        <Label>Explanation (Optional)</Label>
                        <LatexInput
                          value={currentQuestion.explanation || ""}
                          onChange={(val) => updateQuestion(currentQuestionIndex, "explanation", val)}
                          placeholder="Explanation..."
                          multiline
                        />
                      </div>

                      {/* Navigation */}
                      <div className="flex justify-between pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={currentQuestionIndex === 0}
                          onClick={() => setCurrentQuestionIndex((i) => i - 1)}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={currentQuestionIndex >= questions.length - 1}
                          onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                        >
                          Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Creating..." : "Clone & Save as New Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImagePreGenModal
        open={showPreGen}
        testId={preGenTestId}
        questions={preGenQuestions}
        onComplete={() => {
          setShowPreGen(false);
          setPreGenTestId(null);
          setPreGenQuestions([]);
          onTestCloned();
        }}
      />
    </>
  );
};
