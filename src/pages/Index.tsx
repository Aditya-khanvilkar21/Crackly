import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, BarChart3, Clock, CheckCircle2, Users, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.png";

const Index = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const features = [
    {
      icon: Target,
      title: "JEE & NEET Style Tests",
      description: "Practice with authentic exam pattern MCQ tests",
      content: "Comprehensive tests covering Physics, Chemistry, Mathematics, and Biology with proper difficulty levels.",
    },
    {
      icon: BarChart3,
      title: "Progress Analytics",
      description: "Track your performance with detailed insights",
      content: "Chapter-wise and subject-wise performance graphs to identify your strengths and weaknesses.",
    },
    {
      icon: Clock,
      title: "Timed Practice",
      description: "Simulate real exam conditions",
      content: "Practice with timer to improve speed and time management for actual exams.",
    },
    {
      icon: CheckCircle2,
      title: "Instant Results",
      description: "Get immediate feedback on your performance",
      content: "View correct answers and your score instantly after test submission.",
    },
    {
      icon: Users,
      title: "Class Management",
      description: "For tuition classes and coaching institutes",
      content: "Admins can manage students and control test availability for their classes.",
    },
    {
      icon: GraduationCap,
      title: "Auto Student ID",
      description: "Unique identification for every student",
      content: "Automatically generated student IDs for easy tracking and management.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Crackly" className="w-12 h-8 object-contain" />
            <span className="font-bold text-lg text-foreground">Crackly</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/auth">
              <Button size="sm" className="font-medium">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary text-white pt-16">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        {/* Light rays effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-white/10 via-transparent to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Logo */}
            <motion.div className="mb-6" variants={itemVariants}>
              <img 
                src={logo} 
                alt="Crackly - Crack Your Limits" 
                className="w-48 h-32 md:w-64 md:h-40 mx-auto drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] object-contain"
              />
            </motion.div>
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-4 leading-tight tracking-tight"
              variants={itemVariants}
            >
              Crackly
            </motion.h1>
            <motion.p 
              className="text-2xl md:text-3xl font-semibold mb-2 text-white/95"
              variants={itemVariants}
            >
              Crack Your Limits,
            </motion.p>
            <motion.p 
              className="text-2xl md:text-3xl font-semibold mb-6 text-white/95"
              variants={itemVariants}
            >
              Unlock Your Future.
            </motion.p>
            <motion.p 
              className="text-lg md:text-xl mb-8 text-white/80"
              variants={itemVariants}
            >
              Your Gateway to JEE & NEET Success
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={itemVariants}
            >
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 font-semibold">
                  Get Started
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 border-white/30 text-white hover:bg-white/10 hover:border-white/50">
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Inspirational Quote Section */}
      <motion.section 
        className="py-12 bg-muted/30 border-b"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="text-xl md:text-2xl italic text-muted-foreground">
              "Success is not final, failure is not fatal: 
              <span className="text-primary font-medium"> it is the courage to continue that counts.</span>"
            </blockquote>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Crackly?</h2>
            <p className="text-xl text-muted-foreground">Everything you need for JEE & NEET success</p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={cardVariants}>
                <Card className="border-2 hover:border-primary transition-smooth hover:shadow-lg h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.content}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 bg-muted/30"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={logo} 
              alt="Crackly" 
              className="w-40 h-24 mx-auto mb-6 drop-shadow-lg object-contain"
            />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of students preparing for JEE & NEET with Crackly
            </p>
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 font-semibold">
                Start Practicing Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Crackly" className="w-16 h-10 object-contain" />
              <span className="font-bold text-lg">Crackly</span>
            </div>
            <p className="text-muted-foreground text-sm">&copy; 2026 Crackly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
