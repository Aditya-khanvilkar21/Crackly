import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const questionSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters"),
  options: z.array(z.string().min(1, "Option cannot be empty")).length(4, "Must have exactly 4 options"),
  correctAnswer: z.number().min(0).max(3, "Must select a correct answer"),
});

const testSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  chapter: z.string().min(3, "Chapter must be at least 3 characters"),
  subject: z.enum(["physics", "chemistry", "mathematics"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  duration_minutes: z.number().min(10).max(180),
  questions: z.array(questionSchema).length(40, "Must have exactly 40 questions"),
});

type TestFormData = z.infer<typeof testSchema>;
type QuestionFormData = z.infer<typeof questionSchema>;

const emptyQuestion: QuestionFormData = {
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
};

export const CreateTest = ({ onTestCreated }: { onTestCreated?: () => void }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionFormData[]>(
    Array(40).fill(null).map(() => ({ ...emptyQuestion }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: "",
      chapter: "",
      subject: "physics",
      difficulty: "medium",
      duration_minutes: 30,
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

  const onSubmit = async (data: TestFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("tests").insert({
        title: data.title,
        chapter: data.chapter,
        subject: data.subject,
        difficulty: data.difficulty,
        duration_minutes: data.duration_minutes,
        questions: data.questions,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Test created successfully",
      });

      // Reset form
      form.reset();
      setQuestions(Array(40).fill(null).map(() => ({ ...emptyQuestion })));
      setCurrentQuestionIndex(0);
      
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

  const currentQuestion = questions[currentQuestionIndex];
  const isQuestionComplete = 
    currentQuestion.question.length >= 10 && 
    currentQuestion.options.every(opt => opt.length > 0);

  const totalCompleteQuestions = questions.filter(q => 
    q.question.length >= 10 && q.options.every(opt => opt.length > 0)
  ).length;

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
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Questions ({totalCompleteQuestions}/40 Complete)</CardTitle>
                <CardDescription>
                  Add 40 questions. Students will randomly get 25 questions during the test.
                </CardDescription>
              </div>
              <div className="text-sm font-medium">
                Question {currentQuestionIndex + 1} of 40
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
                <Label>Question Text</Label>
                <Textarea
                  placeholder="Enter the question..."
                  value={currentQuestion.question}
                  onChange={(e) => updateQuestion(currentQuestionIndex, "question", e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
              </div>

              <div className="space-y-3">
                <Label>Options (Select the correct answer)</Label>
                <RadioGroup
                  value={currentQuestion.correctAnswer.toString()}
                  onValueChange={(value) => updateQuestion(currentQuestionIndex, "correctAnswer", parseInt(value))}
                >
                  {currentQuestion.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                      <RadioGroupItem value={optIndex.toString()} id={`q${currentQuestionIndex}-opt${optIndex}`} />
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                        value={option}
                        onChange={(e) => updateOption(currentQuestionIndex, optIndex, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-sm text-muted-foreground">
                  Selected correct answer: <span className="font-medium">Option {String.fromCharCode(65 + currentQuestion.correctAnswer)}</span>
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
                  onClick={() => setCurrentQuestionIndex(Math.min(39, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === 39}
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
            disabled={isSubmitting || totalCompleteQuestions < 40}
            className="min-w-[200px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Creating Test..." : "Create Test"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
