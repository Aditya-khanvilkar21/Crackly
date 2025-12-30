import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateSubmission(testId: unknown, answers: unknown, timeInSeconds: unknown): void {
  // Validate testId format
  if (typeof testId !== 'string' || !UUID_REGEX.test(testId)) {
    throw new Error('Invalid test ID format');
  }
  
  // Validate timeInSeconds range (0 to 5 hours max for long mock tests)
  if (typeof timeInSeconds !== 'number' || timeInSeconds < 0 || timeInSeconds > 18000 || !Number.isFinite(timeInSeconds)) {
    throw new Error('Invalid time value');
  }
  
  // Validate answers structure
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new Error('Invalid answers format');
  }
  
  // Validate each answer entry
  const answersObj = answers as Record<string, unknown>;
  for (const [questionIndex, optionIndex] of Object.entries(answersObj)) {
    const qIdx = parseInt(questionIndex, 10);
    
    // Question index must be a valid non-negative integer within reasonable range (up to 200 for CET PCB)
    if (!Number.isInteger(qIdx) || qIdx < 0 || qIdx >= 250) {
      throw new Error('Invalid question index');
    }
    
    // Option index must be 0-3 (4 options per question)
    if (typeof optionIndex !== 'number' || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) {
      throw new Error('Invalid option index');
    }
  }
  
  // Validate answer count (max 200 for CET PCB mock tests)
  const answerCount = Object.keys(answersObj).length;
  if (answerCount > 200) {
    throw new Error('Too many answers');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { testId, answers, timeInSeconds } = await req.json();

    // Comprehensive input validation
    validateSubmission(testId, answers, timeInSeconds);

    // Fetch test with correct answers and negative marking (server-side only)
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, questions, title, test_type, exam_type, negative_marking')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      throw new Error('Test not found');
    }

    // Calculate score server-side with negative marking support
    const questions = test.questions as Array<{ correctAnswer: number; marksPerQuestion?: number; subject?: string }>;
    const isChapterTest = test.test_type === 'chapter_test';
    const negativeMarking = test.negative_marking || 0;
    
    // For chapter tests, we only have 25 questions (randomly selected by frontend)
    // For mock tests, use all questions
    const totalQuestions = isChapterTest ? 25 : questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let totalMarks = 0;
    let maxMarks = 0;
    
    // Calculate max marks based on question weights
    questions.forEach((q, idx) => {
      const marksPerQ = q.marksPerQuestion || 1;
      maxMarks += marksPerQ;
    });
    
    // Iterate through each submitted answer
    Object.entries(answers).forEach(([questionIndex, selectedAnswer]) => {
      const index = parseInt(questionIndex);
      if (questions[index]) {
        const marksPerQ = questions[index].marksPerQuestion || 1;
        if (questions[index].correctAnswer === selectedAnswer) {
          correctCount++;
          totalMarks += marksPerQ;
        } else {
          wrongCount++;
          // Apply negative marking (deduct marks for wrong answers)
          if (negativeMarking > 0) {
            totalMarks -= negativeMarking * marksPerQ;
          }
        }
      }
    });

    // Ensure total marks don't go below 0
    totalMarks = Math.max(0, totalMarks);

    // For backward compatibility, store correct count as score
    // The actual marks can be calculated on display using the test's question weights

    // Insert result using service role (bypasses RLS)
    const { data: result, error: insertError } = await supabase
      .from('test_results')
      .insert({
        test_id: testId,
        student_id: user.id,
        score: correctCount,
        total_questions: totalQuestions,
        answers,
        time_taken_seconds: timeInSeconds,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting result:', insertError);
      throw new Error('Failed to save test result');
    }

    console.log(`Test submitted: ${test.title}, Correct: ${correctCount}/${totalQuestions}, Wrong: ${wrongCount}, Marks: ${totalMarks}/${maxMarks}, Negative Marking: ${negativeMarking}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        score: correctCount,
        totalQuestions: totalQuestions,
        resultId: result.id,
        totalMarks: totalMarks,
        maxMarks: maxMarks,
        wrongCount: wrongCount,
        negativeMarking: negativeMarking
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-test function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isUnauthorized = errorMessage === 'Unauthorized';
    
    return new Response(
      JSON.stringify({ 
        error: isUnauthorized ? 'Authentication required' : 'Failed to submit test'
      }),
      { 
        status: isUnauthorized ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
