import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All MCQs structured by subject and chapter
const questionsData = {
  physics: {
    "Physics & Measurement": [
      {
        question: "The least count of a Vernier caliper is 0.01 cm. A student measures the length of a rod and records it as 2.35 cm. The percentage error is:",
        options: ["0.43%", "0.85%", "1.28%", "1.70%"],
        correct_answer: 1
      },
      {
        question: "Dimensional formula of Planck's constant is:",
        options: ["[ M L²T - 1]", "[ M L²T - 2 ]", "[ M L²T - 3 ]", "[ M L²T - 2 A - 1]"],
        correct_answer: 0
      },
      // ... (include all 40 questions from the document)
    ],
    "Kinematics": [
      {
        question: "The slope of a displacement-time graph gives:",
        options: ["Velocity", "Acceleration", "Jerk", "Speed"],
        correct_answer: 0
      },
      // ... (include all 40 questions)
    ],
    "Laws of Motion": [
      {
        question: "Newton's first law gives the concept of:",
        options: ["Force", "Inertia", "Momentum", "Acceleration"],
        correct_answer: 1
      },
      // ... (include all 40 questions)
    ]
  },
  chemistry: {
    // Chemistry chapters will be added
  },
  mathematics: {
    // Mathematics chapters will be added
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user is super admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { data: isSuperAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'super_admin'
    })

    if (!isSuperAdmin) {
      throw new Error('Only super admins can populate questions')
    }

    // Insert tests for each subject and chapter
    const testsToInsert = []
    
    for (const [subject, chapters] of Object.entries(questionsData)) {
      for (const [chapter, questions] of Object.entries(chapters)) {
        if (questions.length > 0) {
          testsToInsert.push({
            title: `${chapter} Test`,
            subject: subject,
            chapter: chapter,
            difficulty: 'medium',
            duration_minutes: 30,
            questions: questions,
            is_active: true
          })
        }
      }
    }

    const { data, error } = await supabase
      .from('tests')
      .insert(testsToInsert)
      .select()

    if (error) {
      console.error('Error inserting tests:', error)
      throw error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully inserted ${data.length} tests`,
        tests: data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
