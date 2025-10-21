import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All MCQs structured by subject and chapter
const questionsData = {
  physics: {
    "Physics & Measurement": [
      { question: "The least count of a Vernier caliper is 0.01 cm. A student measures the length of a rod and records it as 2.35 cm. The percentage error is:", options: ["0.43%", "0.85%", "1.28%", "1.70%"], correct_answer: 1 },
      { question: "Dimensional formula of Planck's constant is:", options: ["[ M L²T - 1]", "[ M L²T - 2 ]", "[ M L²T - 3 ]", "[ M L²T - 2 A - 1]"], correct_answer: 0 },
      { question: "Which of the following pairs has different dimensions?", options: ["Torque and Work", "Angular momentum and Planck's constant", "Stress and Pressure", "Force and Impulse"], correct_answer: 3 },
      { question: "Which of the following is dimensionless?", options: ["Angular velocity", "Angle in radians", "Strain", "Both b and c"], correct_answer: 3 },
      { question: "(PYQ) The velocity v of a particle at time t is given as v = at + b / t . The dimensions of a and b are:", options: ["[ LT - 2 ] ,[ L ]", "[ LT - 2 ] ,[ L²T - 1]", "[ LT - 1] ,[ L ]", "[ LT - 2 ] ,[ L]"], correct_answer: 0 },
      { question: "Which method can be used to measure time in nanoseconds?", options: ["Vernier calipers", "Atomic clock", "Pendulum clock", "Stopwatch"], correct_answer: 1 },
      { question: "Which one of the following is not a fundamental unit in SI?", options: ["Kelvin", "Mole", "Joule", "Candela"], correct_answer: 2 },
      { question: "If dimensions of resistance are [ M L²T-3 A-2 ], then the dimensions of conductance are:", options: ["[ M-1 L-2T3 A2 ]", "[ M-1 L-3T3 A ]", "[ M-2 L-2T3 A2 ]", "[ M-1 L-2T3 A ]"], correct_answer: 0 },
      { question: "The physical quantity that has the same dimensions as impulse is:", options: ["Torque", "Angular momentum", "Momentum", "Energy"], correct_answer: 2 },
      { question: "If x = a t2 + bt + c, then which of the following has the dimensions of velocity?", options: ["a", "b", "c", "at"], correct_answer: 1 },
      { question: "Which of these is dimensionally correct?", options: ["Force = mass × acceleration", "Energy = power × time", "Pressure = force / area", "All of these"], correct_answer: 3 },
      { question: "Which physical quantity has dimensions of [ M L0T-2 ]?", options: ["Pressure", "Acceleration", "Stress", "Surface tension"], correct_answer: 3 },
      { question: "Dimensional formula of surface tension is:", options: ["[ M T-2 ]", "[ M L-1T-2 ]", "[ MLT-2 ]", "[ M0 L0T0 ]"], correct_answer: 1 },
      { question: "The unit of solid angle is:", options: ["radian", "steradian", "degree", "meter"], correct_answer: 1 },
      { question: "The unit of luminous intensity is:", options: ["lux", "lumen", "candela", "watt"], correct_answer: 2 },
      { question: "Which quantity has the same dimensions as torque?", options: ["Energy", "Momentum", "Impulse", "Angular velocity"], correct_answer: 0 },
      { question: "Which of the following can be measured using a screw gauge?", options: ["Radius of a wire", "Wavelength of light", "Time period of oscillation", "Resistance of a wire"], correct_answer: 0 },
      { question: "Which of the following pairs is not dimensionally consistent?", options: ["Energy and Torque", "Stress and Pressure", "Force and Impulse", "Angular momentum and Planck's constant"], correct_answer: 2 },
      { question: "Which one of the following is not a base quantity in SI?", options: ["Temperature", "Current", "Pressure", "Length"], correct_answer: 2 },
      { question: "The significant figures in 0.005600 are:", options: ["2", "3", "4", "5"], correct_answer: 2 },
      { question: "A physical quantity is given as x = aᵐ bⁿ c p. To find dimensions of x, we use:", options: ["Unit method", "Dimensional analysis", "Integration", "Differentiation"], correct_answer: 1 },
      { question: "Which of the following has no unit?", options: ["Strain", "Specific gravity", "Relative density", "All of these"], correct_answer: 3 },
      { question: "If error in measurement of radius is 2%, then error in area of circle is:", options: ["1%", "2%", "3%", "4%"], correct_answer: 3 },
      { question: "Which pair has same dimensions?", options: ["Work and Torque", "Impulse and Energy", "Momentum and Power", "Pressure and Energy"], correct_answer: 0 },
      { question: "The SI unit of activity (radioactive decay) is:", options: ["Curie", "Becquerel", "Rutherford", "Tesla"], correct_answer: 1 },
      { question: "The number of base units in SI system is:", options: ["5", "6", "7", "9"], correct_answer: 2 },
      { question: "Dimensional formula of velocity is:", options: ["[ LT - 1]", "[ LT - 2 ]", "[ L²T - 1]", "[ M 0 LT - 1]"], correct_answer: 0 },
      { question: "Which one is not a derived unit?", options: ["Newton", "Joule", "Watt", "Kelvin"], correct_answer: 3 },
      { question: "If two quantities have the same dimensions, then:", options: ["They must be equal", "They may or may not be related linearly", "They cannot be added", "They must be dimensionless"], correct_answer: 1 },
      { question: "Which instrument measures current to a very high precision?", options: ["Ammeter", "Galvanometer", "Multimeter", "Potentiometer"], correct_answer: 3 },
      { question: "Which of the following can be used to measure high temperature of stars?", options: ["Mercury thermometer", "Alcohol thermometer", "Pyrometer", "Resistance thermometer"], correct_answer: 2 },
      { question: "Which error occurs due to carelessness of observer?", options: ["Instrumental error", "Random error", "Personal error", "Systematic error"], correct_answer: 2 },
      { question: "Which of these is a derived SI unit?", options: ["Meter", "Kilogram", "Candela", "Newton"], correct_answer: 3 },
      { question: "Which of the following is a non-SI unit?", options: ["Bar", "Watt", "Pascal", "Tesla"], correct_answer: 0 },
      { question: "If acceleration is constant, then displacement-time graph is:", options: ["Straight line", "Parabola", "Circle", "Hyperbola"], correct_answer: 1 },
      { question: "The error in measurement of mass is 2% and in velocity is 3%. Error in kinetic energy will be:", options: ["5%", "8%", "10%", "12%"], correct_answer: 2 },
      { question: "The number of significant figures in 1.000 is:", options: ["1", "2", "3", "4"], correct_answer: 3 },
      { question: "Which of the following is dimensionless?", options: ["Poisson's ratio", "Relative density", "Refractive index", "All of these"], correct_answer: 3 },
      { question: "The Planck's constant h has units of:", options: ["Joule second", "Newton meter", "Watt per hertz", "Both a and c"], correct_answer: 3 },
      { question: "Which among the following can be used to measure very small currents?", options: ["Ammeter", "Galvanometer", "Potentiometer", "Voltmeter"], correct_answer: 1 }
    ],
    "Kinematics": [
      { question: "The slope of a displacement-time graph gives:", options: ["Velocity", "Acceleration", "Jerk", "Speed"], correct_answer: 0 },
      { question: "A body moves with uniform acceleration. Its velocity after covering a distance s is given by:", options: ["v = u + at", "s = ut + 1/2 at²", "v² = u² + 2as", "s = vt"], correct_answer: 2 },
      { question: "A body covers the first half of distance with speed v₁ and the second half with speed v₂. Average speed is:", options: ["v₁ + v₂", "√(v₁v₂)", "2v₁v₂/(v₁ + v₂)", "(v₁ + v₂)/2"], correct_answer: 2 },
      { question: "(PYQ) A body dropped from rest covers 7 m in the first second. The value of g is:", options: ["9.8 m/s²", "14 m/s²", "7 m/s²", "10 m/s²"], correct_answer: 1 },
      { question: "The slope of a velocity-time graph represents:", options: ["Velocity", "Distance", "Acceleration", "Jerk"], correct_answer: 2 },
      { question: "A projectile is fired at angle θ with velocity u. Its maximum range occurs when θ is:", options: ["30°", "45°", "60°", "90°"], correct_answer: 1 },
      { question: "In uniform circular motion, acceleration is:", options: ["Zero", "Tangential", "Radial", "Constant"], correct_answer: 2 },
      { question: "A particle goes 4 m north, 3 m east, and 5 m vertically upward. Its displacement is:", options: ["12 m", "0 m", "√50 m", "√(4²+3²+5²) m"], correct_answer: 3 },
      { question: "The equation of motion s = ut + 1/2 at² is valid for:", options: ["Constant velocity", "Constant acceleration", "Variable acceleration", "Non-uniform acceleration"], correct_answer: 1 },
      { question: "The unit of retardation is:", options: ["m/s", "m/s²", "m²/s", "s/m"], correct_answer: 1 },
      { question: "A projectile has the same range whether it is projected at:", options: ["θ and 90° - θ", "θ and 45° - θ", "θ and 180° - θ", "θ and 90° + θ"], correct_answer: 0 },
      { question: "Maximum height of a projectile is given by:", options: ["H = u²sin²θ / 2g", "H = u²cos²θ / 2g", "H = u² / 2g", "H = u² / g"], correct_answer: 0 },
      { question: "A body thrown vertically upward reaches maximum height in 5s. Initial velocity is:", options: ["49 m/s", "50 m/s", "25 m/s", "100 m/s"], correct_answer: 0 },
      { question: "Displacement of a body is proportional to t². The nature of its motion is:", options: ["Uniform acceleration", "Uniform velocity", "Retardation", "Random motion"], correct_answer: 0 },
      { question: "Which graph shows uniform acceleration?", options: ["Straight line in s-t graph", "Straight line in v-t graph", "Parabola in v-t graph", "Hyperbola in s-t graph"], correct_answer: 1 },
      { question: "If velocity-time graph is a straight line parallel to time axis, acceleration is:", options: ["Zero", "Constant", "Increasing", "Negative"], correct_answer: 0 },
      { question: "In projectile motion, horizontal component of velocity:", options: ["Increases", "Decreases", "Remains constant", "Becomes zero"], correct_answer: 2 },
      { question: "The time of flight of a projectile is:", options: ["T = 2u sinθ / g", "T = u sinθ / g", "T = 2u cosθ / g", "T = u / g"], correct_answer: 0 },
      { question: "For uniform circular motion, angular velocity is:", options: ["ω = 2π / T", "ω = θ / t", "ω = v / r", "All of these"], correct_answer: 3 },
      { question: "A car moving at 20 m/s accelerates uniformly at 2 m/s². Time taken to reach 40 m/s is:", options: ["5s", "10s", "15s", "20s"], correct_answer: 1 },
      { question: "The maximum range of a projectile is:", options: ["u²/g", "2u²/g", "u²/2g", "u²/4g"], correct_answer: 0 },
      { question: "The area under velocity-time graph gives:", options: ["Acceleration", "Displacement", "Velocity", "Momentum"], correct_answer: 1 },
      { question: "Relative velocity of two objects moving in opposite direction with equal speeds v is:", options: ["0", "v", "2v", "v/2"], correct_answer: 2 },
      { question: "A body projected at 30° and another at 60° with same velocity will have:", options: ["Same range", "Different ranges", "Same maximum height", "Same time of flight"], correct_answer: 0 },
      { question: "If a body covers equal distances in equal intervals of time, it is in:", options: ["Non-uniform motion", "Uniform motion", "Rest", "Acceleration"], correct_answer: 1 },
      { question: "Which quantity changes in projectile motion?", options: ["Kinetic energy", "Potential energy", "Velocity direction", "All of these"], correct_answer: 3 },
      { question: "Which of the following is a scalar?", options: ["Displacement", "Velocity", "Acceleration", "Speed"], correct_answer: 3 },
      { question: "Which of the following is a vector?", options: ["Work", "Energy", "Distance", "Acceleration"], correct_answer: 3 },
      { question: "A man can swim at 4 km/h in still water. If river flows at 3 km/h, his resultant velocity across river is:", options: ["1 km/h", "5 km/h", "√7 km/h", "7 km/h"], correct_answer: 2 },
      { question: "If acceleration is zero, then:", options: ["v = constant", "s = vt", "a = 0", "All of these"], correct_answer: 3 },
      { question: "A body thrown vertically upward with velocity 20 m/s. Maximum height reached is:", options: ["10 m", "20 m", "30 m", "40 m"], correct_answer: 3 },
      { question: "Time to reach maximum height in previous question is:", options: ["1s", "2s", "3s", "4s"], correct_answer: 1 },
      { question: "In projectile motion, path of projectile is:", options: ["Straight line", "Parabola", "Hyperbola", "Circle"], correct_answer: 1 },
      { question: "Range of projectile depends on:", options: ["Angle of projection", "Initial velocity", "Acceleration due to gravity", "All of these"], correct_answer: 3 },
      { question: "Which graph represents body moving with uniform velocity?", options: ["Straight line in s-t", "Curve in s-t", "Straight line in v-t with slope", "Curve in v-t"], correct_answer: 0 },
      { question: "If velocity is proportional to square root of time, acceleration is proportional to:", options: ["t", "√t", "1/√t", "1/t"], correct_answer: 2 },
      { question: "Average velocity is equal to instantaneous velocity when:", options: ["Motion is uniform", "Motion is accelerated", "Velocity changes continuously", "Motion is oscillatory"], correct_answer: 0 },
      { question: "Which statement is correct?", options: ["Distance is vector", "Displacement is scalar", "Speed is scalar", "Velocity is scalar"], correct_answer: 2 },
      { question: "A stone projected at 15 m/s at 60°. Time of flight is (g = 10 m/s²):", options: ["1.5 s", "2.5 s", "3 s", "2.6 s"], correct_answer: 3 },
      { question: "The horizontal range of projectile is maximum when angle of projection is:", options: ["30°", "45°", "60°", "90°"], correct_answer: 1 }
    ],
    "Laws of Motion": [
      { question: "Newton's first law gives the concept of:", options: ["Force", "Inertia", "Momentum", "Acceleration"], correct_answer: 1 },
      { question: "A body remains in its state of rest or uniform motion unless acted upon by an external force. This is Newton's:", options: ["First law", "Second law", "Third law", "Law of gravitation"], correct_answer: 0 },
      { question: "Which of the following is a contact force?", options: ["Gravitational force", "Magnetic force", "Tension", "Electrostatic force"], correct_answer: 2 },
      { question: "The unit of force in SI is:", options: ["Dyne", "Newton", "Erg", "Joule"], correct_answer: 1 },
      { question: "(PYQ) A block of mass 5 kg is acted upon by two perpendicular forces 12 N and 5 N. The acceleration of the block is:", options: ["2.6 m/s²", "2.4 m/s²", "2.8 m/s²", "3 m/s²"], correct_answer: 0 },
      { question: "If net external force on a system is zero, momentum:", options: ["Increases", "Decreases", "Remains constant", "Becomes zero"], correct_answer: 2 },
      { question: "Newton's second law connects:", options: ["Force and momentum", "Force and energy", "Energy and acceleration", "Work and power"], correct_answer: 0 },
      { question: "A resultant force of 0 acts on a moving body. Then the body:", options: ["Stops immediately", "Moves with constant velocity", "Accelerates", "Moves in circular path"], correct_answer: 1 },
      { question: "A constant force acts on a body of mass 2 kg producing an acceleration of 3 m/s². The magnitude of force is:", options: ["3 N", "5 N", "6 N", "9 N"], correct_answer: 2 },
      { question: "A car moving on a level road turns left. The force acting towards the centre of the circular path is:", options: ["Centrifugal force", "Friction", "Weight", "Normal reaction"], correct_answer: 1 },
      { question: "The tendency of a body to resist change in its state is called:", options: ["Momentum", "Friction", "Inertia", "Impulse"], correct_answer: 2 },
      { question: "When a car suddenly stops, passengers tend to move forward due to:", options: ["Inertia of rest", "Inertia of motion", "Momentum", "Friction"], correct_answer: 1 },
      { question: "(PYQ) A man of mass 50 kg stands on a weighing machine in a lift moving upward with acceleration 2 m/s². The reading of machine is (g = 10 m/s²):", options: ["400 N", "500 N", "600 N", "700 N"], correct_answer: 2 },
      { question: "Frictional force always acts:", options: ["In direction of motion", "Opposite to direction of motion", "Perpendicular to motion", "Vertically downward"], correct_answer: 1 },
      { question: "Limiting friction is:", options: ["Maximum static friction", "Minimum static friction", "Kinetic friction", "Rolling friction"], correct_answer: 0 },
      { question: "The angle of friction is given by:", options: ["tan⁻¹(μ)", "sin⁻¹(μ)", "cos⁻¹(μ)", "μ"], correct_answer: 0 },
      { question: "A body slides on a rough horizontal surface with uniform velocity. The force of friction is equal to:", options: ["mg", "Normal reaction", "Applied force", "Zero"], correct_answer: 2 },
      { question: "The S.I. unit of coefficient of friction is:", options: ["N/m", "m/N", "No unit", "Joule"], correct_answer: 2 },
      { question: "If the normal reaction between two surfaces is doubled, the limiting friction:", options: ["Becomes half", "Doubles", "Becomes four times", "Remains same"], correct_answer: 1 },
      { question: "When a body just begins to slide, the angle made by resultant reaction with normal is:", options: ["Angle of repose", "Angle of friction", "Both are same", "None"], correct_answer: 2 },
      { question: "A force acts for a short time on a body. The quantity that changes is:", options: ["Force", "Kinetic energy", "Momentum", "Mass"], correct_answer: 2 },
      { question: "Impulse is equal to change in:", options: ["Acceleration", "Kinetic energy", "Momentum", "Velocity"], correct_answer: 2 },
      { question: "Two equal and opposite forces acting on a body form:", options: ["A torque", "A couple", "An equilibrium", "Impulse"], correct_answer: 1 },
      { question: "The resultant of two forces will be maximum when angle between them is:", options: ["0°", "45°", "90°", "180°"], correct_answer: 0 },
      { question: "The resultant of two equal forces is equal to either force. The angle between them is:", options: ["0°", "60°", "90°", "120°"], correct_answer: 3 },
      { question: "(PYQ) If a body of mass m moves with uniform velocity v, then net external force is:", options: ["Zero", "mv", "mg", "Infinite"], correct_answer: 0 },
      { question: "A horse pulls a cart with force 200 N. The reaction of cart on horse is:", options: ["200 N opposite direction", "200 N same direction", "100 N opposite", "Zero"], correct_answer: 0 },
      { question: "A gun of mass 2 kg fires a bullet of 0.01 kg at 400 m/s. Recoil velocity of gun is:", options: ["1 m/s", "2 m/s", "4 m/s", "5 m/s"], correct_answer: 2 },
      { question: "A car of mass 1000 kg moves with acceleration 2 m/s². Force applied is:", options: ["200 N", "500 N", "2000 N", "2000 kN"], correct_answer: 2 },
      { question: "A man of mass 60 kg jumps from a height of 5 m. The force on him when he stops in 0.2 s is approximately (g=10):", options: ["300 N", "600 N", "1500 N", "3000 N"], correct_answer: 3 },
      { question: "The relation between impulse and momentum is:", options: ["I = mv", "I = F/t", "I = Δp", "I = p/t"], correct_answer: 2 },
      { question: "The force that opposes motion between two surfaces is called:", options: ["Reaction", "Friction", "Momentum", "Normal"], correct_answer: 1 },
      { question: "Friction depends on:", options: ["Area of contact", "Nature of surfaces", "Both", "None"], correct_answer: 1 },
      { question: "In uniform circular motion, the direction of centripetal force is:", options: ["Along tangent", "Towards centre", "Away from centre", "Perpendicular to plane"], correct_answer: 1 },
      { question: "When no external force acts on a system of particles, its total momentum:", options: ["Increases", "Decreases", "Remains constant", "Becomes zero"], correct_answer: 2 },
      { question: "Force required to produce 2 m/s² acceleration in a mass of 4 kg is:", options: ["2 N", "4 N", "6 N", "8 N"], correct_answer: 3 },
      { question: "If mass of body is doubled and force remains same, acceleration becomes:", options: ["Half", "Double", "Same", "Zero"], correct_answer: 0 },
      { question: "The net external force on a body is zero. Its linear momentum:", options: ["Increases", "Decreases", "Remains constant", "Depends on acceleration"], correct_answer: 2 },
      { question: "The S.I. unit of impulse is same as that of:", options: ["Force", "Momentum", "Power", "Pressure"], correct_answer: 1 },
      { question: "A man of 70 kg standing on ground exerts a force equal to:", options: ["70 N", "700 N", "7 N", "0.7 N"], correct_answer: 1 }
    ]
  },
  chemistry: {
    // Chemistry chapters will be added later
  },
  mathematics: {
    // Mathematics chapters will be added later
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
