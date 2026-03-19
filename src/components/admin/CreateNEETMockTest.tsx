import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LatexInput } from "@/components/admin/LatexInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Save, ChevronLeft, ChevronRight, Upload, X, Image as ImageIcon } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const questionSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters"),
  options: z.array(z.string().min(1, "Option cannot be empty")).length(4, "Must have exactly 4 options"),
  correctAnswer: z.number().min(0).max(3, "Must select a correct answer"),
  imageUrl: z.string().optional(),
  explanation: z.string().optional(),
  subject: z.enum(["physics", "chemistry", "biology"]),
  topic: z.string().optional(),
});

const neetMockTestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  duration_minutes: z.number().min(30).max(300),
  negative_marking: z.number().min(0).max(1).default(0.25),
  questions: z.array(questionSchema).length(180, "Must have exactly 180 questions"),
});

type NEETMockTestFormData = z.infer<typeof neetMockTestSchema>;
type QuestionFormData = z.infer<typeof questionSchema>;

const emptyQuestion = (subject: "physics" | "chemistry" | "biology"): QuestionFormData => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  imageUrl: undefined,
  explanation: "",
  subject,
  topic: "",
});

export const CreateNEETMockTest = ({ onTestCreated }: { onTestCreated?: () => void }) => {
  const [currentSubject, setCurrentSubject] = useState<"physics" | "chemistry" | "biology">("physics");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionFormData[]>([
    ...Array(45).fill(null).map(() => emptyQuestion("physics")),
    ...Array(45).fill(null).map(() => emptyQuestion("chemistry")),
    ...Array(90).fill(null).map(() => emptyQuestion("biology")),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  const form = useForm<NEETMockTestFormData>({
    resolver: zodResolver(neetMockTestSchema),
    defaultValues: {
      title: "",
      difficulty: "medium",
      duration_minutes: 200,
      negative_marking: 0.25,
      questions: questions,
    },
  });

  const getSubjectRange = (subject: "physics" | "chemistry" | "biology") => {
    switch (subject) {
      case "physics": return { start: 0, end: 45, count: 45 };
      case "chemistry": return { start: 45, end: 90, count: 45 };
      case "biology": return { start: 90, end: 180, count: 90 };
    }
  };

  const getCurrentAbsoluteIndex = () => {
    const range = getSubjectRange(currentSubject);
    return range.start + currentQuestionIndex;
  };

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

  const handleImageUpload = async (questionIndex: number, file: File) => {
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('test-questions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('test-questions')
        .getPublicUrl(filePath);

      updateQuestion(questionIndex, 'imageUrl', publicUrl);

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
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async (questionIndex: number) => {
    const imageUrl = questions[questionIndex].imageUrl;
    if (!imageUrl) return;

    try {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('test-questions').remove([fileName]);
      }
      updateQuestion(questionIndex, 'imageUrl', undefined);
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

  const onSubmit = async (data: NEETMockTestFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("tests").insert({
        title: data.title,
        test_type: 'mock_test',
        difficulty: data.difficulty,
        duration_minutes: data.duration_minutes,
        exam_type: 'NEET',
        negative_marking: data.negative_marking,
        questions: data.questions,
        is_active: true,
        chapter: 'NEET',
        subject: null,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "NEET Mock test created successfully",
      });

      form.reset();
      setQuestions([
        ...Array(45).fill(null).map(() => emptyQuestion("physics")),
        ...Array(45).fill(null).map(() => emptyQuestion("chemistry")),
        ...Array(90).fill(null).map(() => emptyQuestion("biology")),
      ]);
      setCurrentQuestionIndex(0);
      setCurrentSubject("physics");
      
      onTestCreated?.();
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

  const absoluteIndex = getCurrentAbsoluteIndex();
  const currentQuestion = questions[absoluteIndex];
  const range = getSubjectRange(currentSubject);
  
  const totalCompleteQuestions = questions.filter(q => 
    q.question.length >= 10 && q.options.every(opt => opt.length > 0)
  ).length;

  const subjectCompleteQuestions = questions.slice(range.start, range.end).filter(q => 
    q.question.length >= 10 && q.options.every(opt => opt.length > 0)
  ).length;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Test Details */}
        <Card className="border-pink-500/30 bg-gradient-to-r from-pink-500/5 to-purple-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>NEET Mock Test</CardTitle>
              <Badge className="bg-pink-500">NEET</Badge>
            </div>
            <CardDescription>Create a NEET mock test with 180 questions (45 Physics, 45 Chemistry, 90 Biology)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., NEET Mock Test 1" {...field} />
                    </FormControl>
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
                        placeholder="200" 
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
                name="negative_marking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negative Marking</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(parseFloat(v))} 
                      defaultValue={field.value?.toString() || "0.25"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select negative marking" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">No Negative Marking</SelectItem>
                        <SelectItem value="0.25">-1 per wrong answer (NEET Pattern: -1 for 4 marks)</SelectItem>
                        <SelectItem value="0.33">-1/3 per wrong answer</SelectItem>
                        <SelectItem value="0.5">-0.5 per wrong answer</SelectItem>
                        <SelectItem value="1">-1 per wrong answer</SelectItem>
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
                <CardTitle>Questions ({totalCompleteQuestions}/180 Complete)</CardTitle>
                <CardDescription>
                  Add questions: 45 Physics, 45 Chemistry, 90 Biology
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subject Tabs */}
            <Tabs value={currentSubject} onValueChange={(v) => {
              setCurrentSubject(v as any);
              setCurrentQuestionIndex(0);
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="physics" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  Physics ({questions.slice(0, 45).filter(q => q.question.length >= 10 && q.options.every(opt => opt.length > 0)).length}/45)
                </TabsTrigger>
                <TabsTrigger value="chemistry" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  Chemistry ({questions.slice(45, 90).filter(q => q.question.length >= 10 && q.options.every(opt => opt.length > 0)).length}/45)
                </TabsTrigger>
                <TabsTrigger value="biology" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
                  Biology ({questions.slice(90, 180).filter(q => q.question.length >= 10 && q.options.every(opt => opt.length > 0)).length}/90)
                </TabsTrigger>
              </TabsList>

              <TabsContent value={currentSubject} className="space-y-4 mt-6">
                <div className="text-sm font-medium text-center mb-4">
                  Question {currentQuestionIndex + 1} of {range.count} ({subjectCompleteQuestions} Complete)
                </div>

                {/* Question Navigation */}
                <div className="grid grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2">
                  {Array.from({ length: range.count }).map((_, index) => {
                    const absIndex = range.start + index;
                    const q = questions[absIndex];
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
                            ? "bg-green-500 text-white"
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
                    <Label>Question Text <span className="text-xs text-muted-foreground">(Use $...$ for math)</span></Label>
                    <div className="mt-2">
                      <LatexInput
                        value={currentQuestion.question}
                        onChange={(val) => updateQuestion(absoluteIndex, "question", val)}
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
                          onClick={() => handleRemoveImage(absoluteIndex)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Upload an image for diagrams or biological structures
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
                              if (file) handleImageUpload(absoluteIndex, file);
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
                      onValueChange={(value) => updateQuestion(absoluteIndex, "correctAnswer", parseInt(value))}
                    >
                      {currentQuestion.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-start gap-3">
                          <RadioGroupItem value={optIndex.toString()} id={`neet-q${absoluteIndex}-opt${optIndex}`} className="mt-2.5" />
                          <div className="flex-1">
                            <LatexInput
                              value={option}
                              onChange={(val) => updateOption(absoluteIndex, optIndex, val)}
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
                      placeholder="e.g., Cell Biology, Genetics, Human Physiology..."
                      value={(currentQuestion as any).topic || ""}
                      onChange={(e) => updateQuestion(absoluteIndex, "topic" as any, e.target.value)}
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
                        onChange={(val) => updateQuestion(absoluteIndex, "explanation", val)}
                        placeholder="Enter the explanation... Use $...$ for math notation"
                        multiline
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This explanation will be shown to students after they submit the test.
                    </p>
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
                      onClick={() => setCurrentQuestionIndex(Math.min(range.count - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === range.count - 1}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600" 
          size="lg"
          disabled={isSubmitting || totalCompleteQuestions < 180}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? "Creating NEET Mock Test..." : `Create NEET Mock Test (${totalCompleteQuestions}/180 questions)`}
        </Button>
      </form>
    </Form>
  );
};
