import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, BarChart3, Clock, CheckCircle2, Users, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        {/* Light rays effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-white/10 via-transparent to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            {/* Logo */}
            <div className="mb-6">
              <img 
                src={logo} 
                alt="CRACKLY - Crack Your Limits" 
                className="w-48 h-32 md:w-64 md:h-40 mx-auto drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight tracking-tight">
              CRACKLY
            </h1>
            <p className="text-2xl md:text-3xl font-semibold mb-2 text-white/95">
              Crack Your Limits,
            </p>
            <p className="text-2xl md:text-3xl font-semibold mb-6 text-white/95">
              Unlock Your Future.
            </p>
            <p className="text-lg md:text-xl mb-8 text-white/80">
              Your Gateway to JEE & NEET Success
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 font-semibold">
                  Get Started
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 border-white/30 text-white hover:bg-white/10 hover:border-white/50">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Inspirational Quote Section */}
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl italic text-muted-foreground">
              "Success is not final, failure is not fatal: 
              <span className="text-primary font-medium"> it is the courage to continue that counts.</span>"
            </blockquote>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose CRACKLY?</h2>
            <p className="text-xl text-muted-foreground">Everything you need for JEE & NEET success</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary transition-smooth hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>JEE & NEET Style Tests</CardTitle>
                <CardDescription>
                  Practice with authentic exam pattern MCQ tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Comprehensive tests covering Physics, Chemistry, Mathematics, and Biology with proper difficulty levels.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-smooth hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Progress Analytics</CardTitle>
                <CardDescription>
                  Track your performance with detailed insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Chapter-wise and subject-wise performance graphs to identify your strengths and weaknesses.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-smooth hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Timed Practice</CardTitle>
                <CardDescription>
                  Simulate real exam conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Practice with timer to improve speed and time management for actual exams.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-smooth hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Instant Results</CardTitle>
                <CardDescription>
                  Get immediate feedback on your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View correct answers and your score instantly after test submission.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-smooth hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Class Management</CardTitle>
                <CardDescription>
                  For tuition classes and coaching institutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Admins can manage students and control test availability for their classes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-smooth hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Auto Student ID</CardTitle>
                <CardDescription>
                  Unique identification for every student
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Automatically generated student IDs for easy tracking and management.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <img 
              src={logo} 
              alt="CRACKLY" 
              className="w-40 h-24 mx-auto mb-6 drop-shadow-lg object-contain"
            />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of students preparing for JEE & NEET with CRACKLY
            </p>
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 font-semibold">
                Start Practicing Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="CRACKLY" className="w-16 h-10 object-contain" />
              <span className="font-bold text-lg">CRACKLY</span>
            </div>
            <p className="text-muted-foreground text-sm">&copy; 2025 CRACKLY. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
