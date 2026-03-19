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

type CETType = 'PCM' | 'PCB';
type Subject = 'physics' | 'chemistry' | 'mathematics' | 'biology';

interface QuestionFormData {
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  explanation?: string;
  subject: Subject;
  marksPerQuestion: number;
  topic?: string;
}

const emptyQuestion = (subject: Subject, marks: number): QuestionFormData => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  imageUrl: undefined,
  explanation: "",
  subject,
  marksPerQuestion: marks,
  topic: "",
});

// PCM: Physics 50Q (1 mark each), Chemistry 50Q (1 mark each), Maths 50Q (2 marks each) = 150Q, 200 marks
// PCB: Physics 50Q (1 mark each), Chemistry 50Q (1 mark each), Biology 100Q (1 mark each) = 200Q, 200 marks

const getQuestionsForCETType = (cetType: CETType): QuestionFormData[] => {
  if (cetType === 'PCM') {
    return [
      ...Array(50).fill(null).map(() => emptyQuestion("physics", 1)),
      ...Array(50).fill(null).map(() => emptyQuestion("chemistry", 1)),
      ...Array(50).fill(null).map(() => emptyQuestion("mathematics", 2)),
    ];
  } else {
    return [
      ...Array(50).fill(null).map(() => emptyQuestion("physics", 1)),
      ...Array(50).fill(null).map(() => emptyQuestion("chemistry", 1)),
      ...Array(100).fill(null).map(() => emptyQuestion("biology", 1)),
    ];
  }
};

const getSubjectRange = (cetType: CETType, subject: Subject): { start: number; end: number; questionsCount: number } => {
  if (cetType === 'PCM') {
    switch (subject) {
      case 'physics': return { start: 0, end: 50, questionsCount: 50 };
      case 'chemistry': return { start: 50, end: 100, questionsCount: 50 };
      case 'mathematics': return { start: 100, end: 150, questionsCount: 50 };
      default: return { start: 0, end: 0, questionsCount: 0 };
    }
  } else {
    switch (subject) {
      case 'physics': return { start: 0, end: 50, questionsCount: 50 };
      case 'chemistry': return { start: 50, end: 100, questionsCount: 50 };
      case 'biology': return { start: 100, end: 200, questionsCount: 100 };
      default: return { start: 0, end: 0, questionsCount: 0 };
    }
  }
};

const getTotalQuestions = (cetType: CETType) => cetType === 'PCM' ? 150 : 200;

export const CreateCETMockTest = ({ onTestCreated }: { onTestCreated?: () => void }) => {
  const [cetType, setCETType] = useState<CETType>('PCM');
  const [currentSubject, setCurrentSubject] = useState<Subject>('physics');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionFormData[]>(getQuestionsForCETType('PCM'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [negativeMarking, setNegativeMarking] = useState(0.25);
  const { toast } = useToast();

  const handleCETTypeChange = (newType: CETType) => {
    setCETType(newType);
    setQuestions(getQuestionsForCETType(newType));
    setCurrentSubject('physics');
    setCurrentQuestionIndex(0);
  };

  const getSubjects = (): Subject[] => {
    return cetType === 'PCM' 
      ? ['physics', 'chemistry', 'mathematics']
      : ['physics', 'chemistry', 'biology'];
  };

  const range = getSubjectRange(cetType, currentSubject);
  const absoluteIndex = range.start + currentQuestionIndex;
  const currentQuestion = questions[absoluteIndex];
  const totalQuestions = getTotalQuestions(cetType);

  const updateQuestion = (index: number, field: keyof QuestionFormData, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    const newOptions = [...newQuestions[questionIndex].options];
    newOptions[optionIndex] = value;
    newQuestions[questionIndex].options = newOptions;
    setQuestions(newQuestions);
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

  const isQuestionComplete = (q: QuestionFormData) => 
    q.question.length >= 10 && q.options.every(opt => opt.length > 0);

  const totalCompleteQuestions = questions.filter(isQuestionComplete).length;
  const subjectCompleteQuestions = questions.slice(range.start, range.end).filter(isQuestionComplete).length;

  const onSubmit = async () => {
    if (title.length < 5) {
      toast({
        title: "Error",
        description: "Title must be at least 5 characters",
        variant: "destructive",
      });
      return;
    }

    if (totalCompleteQuestions < totalQuestions) {
      toast({
        title: "Error",
        description: `Please complete all ${totalQuestions} questions`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Store CET type in the title for identification
      const testTitle = `[CET-${cetType}] ${title}`;
      
      const { error } = await supabase.from("tests").insert({
        title: testTitle,
        test_type: 'mock_test',
        difficulty,
        duration_minutes: durationMinutes,
        exam_type: 'CET',
        negative_marking: negativeMarking,
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          imageUrl: q.imageUrl,
          explanation: q.explanation,
          subject: q.subject,
          marksPerQuestion: q.marksPerQuestion,
        })),
        is_active: true,
        chapter: null,
        subject: null,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `CET ${cetType} Mock test created successfully`,
      });

      // Reset form
      setTitle("");
      setQuestions(getQuestionsForCETType(cetType));
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

  const getSubjectLabel = (subject: Subject) => {
    const labels: Record<Subject, string> = {
      physics: 'Physics',
      chemistry: 'Chemistry',
      mathematics: 'Mathematics',
      biology: 'Biology',
    };
    return labels[subject];
  };

  const getSubjectMarks = (subject: Subject): string => {
    if (cetType === 'PCM') {
      if (subject === 'mathematics') return '50Q × 2 marks = 100 marks';
      return '50Q × 1 mark = 50 marks';
    } else {
      if (subject === 'biology') return '100Q × 1 mark = 100 marks';
      return '50Q × 1 mark = 50 marks';
    }
  };

  return (
    <div className="space-y-6">
      {/* CET Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Create CET Mock Test
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600">CET Specific</Badge>
          </CardTitle>
          <CardDescription>
            Create a CET mock test with specific exam patterns for PCM or PCB streams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select CET Stream</Label>
            <Tabs value={cetType} onValueChange={(v) => handleCETTypeChange(v as CETType)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="PCM" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  PCM (Physics, Chemistry, Maths)
                </TabsTrigger>
                <TabsTrigger value="PCB" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  PCB (Physics, Chemistry, Biology)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Exam Pattern Info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <h4 className="font-semibold text-sm">Exam Pattern - {cetType}</h4>
            {cetType === 'PCM' ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Physics: 50 questions × 1 mark = 50 marks</li>
                <li>• Chemistry: 50 questions × 1 mark = 50 marks</li>
                <li>• Mathematics: 50 questions × 2 marks = 100 marks</li>
                <li className="font-medium text-foreground">Total: 150 questions, 200 marks</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Physics: 50 questions × 1 mark = 50 marks</li>
                <li>• Chemistry: 50 questions × 1 mark = 50 marks</li>
                <li>• Biology: 100 questions × 1 mark = 100 marks</li>
                <li className="font-medium text-foreground">Total: 200 questions, 200 marks</li>
              </ul>
            )}
          </div>

          {/* Test Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Test Title</Label>
              <Input 
                placeholder={`e.g., CET ${cetType} Mock Test 1`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input 
                type="number" 
                placeholder="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 180)}
              />
            </div>

            <div className="space-y-2">
              <Label>Negative Marking</Label>
              <Select 
                value={negativeMarking.toString()} 
                onValueChange={(v) => setNegativeMarking(parseFloat(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select negative marking" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Negative Marking</SelectItem>
                  <SelectItem value="0.25">-0.25 per wrong answer</SelectItem>
                  <SelectItem value="0.33">-1/3 per wrong answer</SelectItem>
                  <SelectItem value="0.5">-0.5 per wrong answer</SelectItem>
                  <SelectItem value="1">-1 per wrong answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Questions ({totalCompleteQuestions}/{totalQuestions} Complete)</CardTitle>
              <CardDescription>
                Add questions for each subject as per the {cetType} pattern
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Tabs */}
          <Tabs value={currentSubject} onValueChange={(v) => {
            setCurrentSubject(v as Subject);
            setCurrentQuestionIndex(0);
          }}>
            <TabsList className={`grid w-full ${cetType === 'PCM' ? 'grid-cols-3' : 'grid-cols-3'}`}>
              {getSubjects().map((subject) => {
                const subjectRange = getSubjectRange(cetType, subject);
                const complete = questions.slice(subjectRange.start, subjectRange.end).filter(isQuestionComplete).length;
                const colors: Record<Subject, string> = {
                  physics: 'data-[state=active]:bg-orange-500',
                  chemistry: 'data-[state=active]:bg-cyan-500',
                  mathematics: 'data-[state=active]:bg-purple-500',
                  biology: 'data-[state=active]:bg-green-500',
                };
                return (
                  <TabsTrigger 
                    key={subject}
                    value={subject} 
                    className={`${colors[subject]} data-[state=active]:text-white`}
                  >
                    {getSubjectLabel(subject)} ({complete}/{subjectRange.questionsCount})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={currentSubject} className="space-y-4 mt-6">
              <div className="text-sm font-medium text-center mb-4">
                <p>Question {currentQuestionIndex + 1} of {range.questionsCount} ({subjectCompleteQuestions} Complete)</p>
                <p className="text-xs text-muted-foreground mt-1">{getSubjectMarks(currentSubject)}</p>
              </div>

              {/* Question Navigation */}
              <div className="grid grid-cols-10 gap-2 max-h-40 overflow-y-auto p-2">
                {Array.from({ length: range.questionsCount }).map((_, index) => {
                  const absIndex = range.start + index;
                  const q = questions[absIndex];
                  const isComplete = isQuestionComplete(q);
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
              {currentQuestion && (
                <div className="space-y-4 border rounded-lg p-6 bg-card">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {currentQuestion.marksPerQuestion} mark{currentQuestion.marksPerQuestion > 1 ? 's' : ''} per question
                    </Badge>
                  </div>

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
                          Upload an image for diagrams or problems
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
                          <RadioGroupItem value={optIndex.toString()} id={`q${absoluteIndex}-opt${optIndex}`} className="mt-2.5" />
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
                      placeholder="e.g., Kinematics, Organic Chemistry, Calculus..."
                      value={currentQuestion.topic || ""}
                      onChange={(e) => updateQuestion(absoluteIndex, "topic", e.target.value)}
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
                      onClick={() => setCurrentQuestionIndex(Math.min(range.questionsCount - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === range.questionsCount - 1}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={onSubmit}
          disabled={isSubmitting || totalCompleteQuestions < totalQuestions}
          className="min-w-[200px]"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? "Creating..." : `Create CET ${cetType} Mock Test`}
        </Button>
      </div>
    </div>
  );
};
