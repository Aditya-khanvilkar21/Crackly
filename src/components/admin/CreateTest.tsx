import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, Upload, X, Image as ImageIcon } from "lucide-react";
import { LatexInput } from "@/components/admin/LatexInput";
import { LatexRenderer } from "@/components/LatexRenderer";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImagePreGenModal } from "@/components/admin/ImagePreGenModal";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";

const questionSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters"),
  options: z.array(z.string().min(1, "Option cannot be empty")).length(4, "Must have exactly 4 options"),
  correctAnswer: z.number().min(0).max(3, "Must select a correct answer"),
  imageUrl: z.string().optional(),
  explanation: z.string().optional(),
  explanationImage: z.string().optional(),
  topic: z.string().optional(),
});

const testSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  chapter: z.string().min(3, "Chapter must be at least 3 characters"),
  subject: z.enum(["physics", "chemistry", "mathematics", "biology"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  duration_minutes: z.number().min(10).max(180),
  exam_type: z.enum(["JEE", "NEET", "CET"]),
  questions: z.array(questionSchema).length(45, "Must have exactly 45 questions"),
});

type TestFormData = z.infer<typeof testSchema>;
type QuestionFormData = z.infer<typeof questionSchema>;

const emptyQuestion: QuestionFormData = {
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  imageUrl: undefined,
  explanation: "",
  explanationImage: undefined,
  topic: "",
};

export const CreateTest = ({ onTestCreated }: { onTestCreated?: () => void }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionFormData[]>(
    Array(45).fill(null).map(() => ({ ...emptyQuestion }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [preGenTestId, setPreGenTestId] = useState<string | null>(null);
  const [preGenQuestions, setPreGenQuestions] = useState<any[]>([]);
  const [showPreGen, setShowPreGen] = useState(false);
  const { toast } = useToast();

  const form = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: "",
      chapter: "",
      subject: "physics",
      difficulty: "medium",
      duration_minutes: 30,
      exam_type: "JEE",
      questions: questions,
    },
  });

  const updateQuestion = (index: number, field: keyof QuestionFormData, value: any) => {
    const newQuestions = [...questions];
    if (field === "options") {
      newQuestions[index] = { ...newQuestions[index], options: value };
    } else {
      newQuestions[index] = { ...newQuestions[index], [field]: value };
    }
    setQuestions(newQuestions);
    form.setValue("questions", newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    const newOptions = [...newQuestions[questionIndex].options];
    newOptions[optionIndex] = value;
    newQuestions[questionIndex].options = newOptions;
    setQuestions(newQuestions);
    form.setValue("questions", newQuestions);
  };

  const [uploadingExplanationImage, setUploadingExplanationImage] = useState(false);

  const handleImageUpload = async (questionIndex: number, file: File, field: 'imageUrl' | 'explanationImage' = 'imageUrl') => {
    const setUploading = field === 'imageUrl' ? setUploadingImage : setUploadingExplanationImage;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const folder = field === 'explanationImage' ? 'explanations' : '';
      const fileName = `${folder ? folder + '/' : ''}${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('test-questions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('test-questions')
        .getPublicUrl(fileName);

      updateQuestion(questionIndex, field, publicUrl);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (questionIndex: number, field: 'imageUrl' | 'explanationImage' = 'imageUrl') => {
    const imageUrl = questions[questionIndex][field];
    if (!imageUrl) return;

    try {
      // Extract path from URL
      const urlParts = imageUrl.split('/test-questions/');
      const filePath = urlParts[urlParts.length - 1];
      if (filePath) {
        await supabase.storage.from('test-questions').remove([filePath]);
      }
      updateQuestion(questionIndex, field, undefined);
      toast({
        title: "Success",
        description: "Image removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: TestFormData) => {
    setIsSubmitting(true);
    try {
      const { data: insertedTest, error } = await supabase.from("tests").insert({
        title: data.title,
        chapter: data.chapter,
        subject: data.subject,
        difficulty: data.difficulty,
        duration_minutes: data.duration_minutes,
        exam_type: data.exam_type,
        questions: data.questions,
        is_active: true,
      }).select("id").single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Test created. Generating anti-copy images...",
      });

      // Trigger pre-generation
      setPreGenTestId(insertedTest.id);
      setPreGenQuestions(data.questions);
      setShowPreGen(true);

      // Reset form
      form.reset();
      setQuestions(Array(45).fill(null).map(() => ({ ...emptyQuestion })));
      setCurrentQuestionIndex(0);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isQuestionComplete = 
    currentQuestion.question.length >= 10 && 
    currentQuestion.options.every(opt => opt.length > 0);

  const totalCompleteQuestions = questions.filter(q => 
    q.question.length >= 10 && q.options.every(opt => opt.length > 0)
  ).length;

  const hasUnsavedChanges =
    !isSubmitting &&
    (form.formState.isDirty ||
      questions.some(
        (q) => q.question.length > 0 || q.options.some((o) => o.length > 0)
      ));
  useUnsavedChangesWarning(hasUnsavedChanges);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Test Details */}
        <Card>
          <CardHeader>
            <CardTitle>Test Details</CardTitle>
            <CardDescription>Basic information about the test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Physics Chapter 1 Test" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chapter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chapter</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Kinematics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="physics">Physics</SelectItem>
                        <SelectItem value="chemistry">Chemistry</SelectItem>
                        <SelectItem value="mathematics">Mathematics</SelectItem>
                        <SelectItem value="biology">Biology</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="30" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exam_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exam type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="JEE">JEE</SelectItem>
                        <SelectItem value="NEET">NEET</SelectItem>
                        <SelectItem value="CET">CET</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Questions ({totalCompleteQuestions}/45 Complete)</CardTitle>
                <CardDescription>
                  Add 45 questions. All questions will be shown to students in shuffled order.
                </CardDescription>
              </div>
              <div className="text-sm font-medium">
                Question {currentQuestionIndex + 1} of 45
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Navigation */}
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q, index) => {
                const isComplete = q.question.length >= 10 && q.options.every(opt => opt.length > 0);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                      currentQuestionIndex === index
                        ? "bg-primary text-primary-foreground"
                        : isComplete
                        ? "bg-success text-success-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Current Question Editor */}
            <div className="space-y-4 border rounded-lg p-6 bg-card">
              <div>
                <Label>Question Text <span className="text-xs text-muted-foreground">(Use $...$ for math: $\frac&#123;a&#125;&#123;b&#125;$, $\sqrt&#123;x&#125;$, $x^2$)</span></Label>
                <div className="mt-2">
                  <LatexInput
                    value={currentQuestion.question}
                    onChange={(val) => updateQuestion(currentQuestionIndex, "question", val)}
                    placeholder="Enter the question... Use $...$ for math notation"
                    multiline
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-3">
                <Label>Question Image (Optional)</Label>
                {currentQuestion.imageUrl ? (
                  <div className="relative border rounded-lg p-4 bg-muted/50">
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Question diagram"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleRemoveImage(currentQuestionIndex)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload an image for diagrams or mathematical problems
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingImage}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleImageUpload(currentQuestionIndex, file);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingImage ? "Uploading..." : "Upload Image"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>Options (Select the correct answer)</Label>
                <RadioGroup
                  value={currentQuestion.correctAnswer.toString()}
                  onValueChange={(value) => updateQuestion(currentQuestionIndex, "correctAnswer", parseInt(value))}
                >
                  {currentQuestion.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-start gap-3">
                      <RadioGroupItem value={optIndex.toString()} id={`q${currentQuestionIndex}-opt${optIndex}`} className="mt-2.5" />
                      <div className="flex-1">
                        <LatexInput
                          value={option}
                          onChange={(val) => updateOption(currentQuestionIndex, optIndex, val)}
                          placeholder={`Option ${String.fromCharCode(65 + optIndex)} — use $...$ for math`}
                        />
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-sm text-muted-foreground">
                  Selected correct answer: <span className="font-medium">Option {String.fromCharCode(65 + currentQuestion.correctAnswer)}</span>
                </p>
              </div>

              {/* Topic Section */}
              <div>
                <Label>Topic (Optional but Recommended)</Label>
                <Input
                  placeholder="e.g., Kinematics, Thermodynamics, Organic Chemistry..."
                  value={currentQuestion.topic || ""}
                  onChange={(e) => updateQuestion(currentQuestionIndex, "topic", e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adding topics helps identify student weak areas in result analysis.
                </p>
              </div>

              {/* Explanation Section */}
              <div>
                <Label>Explanation (Optional) <span className="text-xs text-muted-foreground">— supports LaTeX</span></Label>
                <div className="mt-2">
                  <LatexInput
                    value={currentQuestion.explanation || ""}
                    onChange={(val) => updateQuestion(currentQuestionIndex, "explanation", val)}
                    placeholder="Enter the explanation... Use $...$ for math notation"
                    multiline
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This explanation will be shown to students after they submit the test.
                </p>
              </div>

              {/* Explanation Image Upload */}
              <div className="space-y-3">
                <Label>Explanation Image (Optional)</Label>
                {currentQuestion.explanationImage ? (
                  <div className="relative border rounded-lg p-4 bg-muted/50">
                    <img 
                      src={currentQuestion.explanationImage} 
                      alt="Explanation diagram"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleRemoveImage(currentQuestionIndex, 'explanationImage')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload an image for the explanation (diagram, solution steps, etc.)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingExplanationImage}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/jpg,image/jpeg,image/png';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleImageUpload(currentQuestionIndex, file, 'explanationImage');
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingExplanationImage ? "Uploading..." : "Upload Explanation Image"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.min(44, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === 44}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isSubmitting || totalCompleteQuestions < 45}
            className="min-w-[200px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Creating Test..." : "Create Test"}
          </Button>
        </div>
      </form>

      <ImagePreGenModal
        open={showPreGen}
        testId={preGenTestId}
        questions={preGenQuestions}
        onComplete={() => {
          setShowPreGen(false);
          setPreGenTestId(null);
          setPreGenQuestions([]);
          onTestCreated?.();
        }}
      />
    </Form>
  );
};
