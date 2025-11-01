import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!testId || !answers || typeof timeInSeconds !== 'number') {
      throw new Error('Invalid request data');
    }

    // Fetch test with correct answers (server-side only)
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, questions, title')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      throw new Error('Test not found');
    }

    // Calculate score server-side
    const questions = test.questions as Array<{ correct_answer: number }>;
    const totalQuestionsAnswered = answers.length;
    let score = 0;
    
    for (let i = 0; i < totalQuestionsAnswered; i++) {
      if (answers[i] === questions[i].correct_answer) {
        score++;
      }
    }

    // Insert result using service role (bypasses RLS)
    const { data: result, error: insertError } = await supabase
      .from('test_results')
      .insert({
        test_id: testId,
        student_id: user.id,
        score,
        total_questions: totalQuestionsAnswered,
        answers,
        time_taken_seconds: timeInSeconds,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting result:', insertError);
      throw new Error('Failed to save test result');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        score,
        totalQuestions: totalQuestionsAnswered,
        resultId: result.id
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
