import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, BarChart3, Clock, CheckCircle2, Users, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.png";
import { SeoHead } from "@/components/SeoHead";

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
      title: "JEE, NEET & CET Style Tests",
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
      <SeoHead
        title="Crackly — Crack JEE, NEET & CET Exams"
        description="Authentic exam-style mock tests, chapter-wise practice, and real-time analytics for JEE, NEET and CET aspirants."
        path="/landing"
      />
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group relative">
            {/* Soft gradient glow */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-3 rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(255,106,0,0.55) 0%, rgba(255,106,0,0.25) 35%, rgba(20,40,90,0.3) 65%, transparent 75%)",
              }}
            />
            {/* Rotating light rays */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-80 group-hover:animate-light-rays-spin"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(255,106,0,0.4) 30deg, transparent 60deg, transparent 180deg, rgba(40,70,160,0.35) 210deg, transparent 240deg)",
                WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 70%)",
                maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
              }}
            />
            <span className="relative overflow-hidden rounded-md">
              <img
                src={logo}
                alt="Crackly"
                className="relative h-10 md:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              {/* Sweep shine */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 opacity-0 group-hover:opacity-100 group-hover:animate-light-rays-sweep"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                }}
              />
            </span>
          </Link>
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
            <motion.div className="mb-6 relative group cursor-pointer" variants={itemVariants}>
              {/* Ambient glow — intensifies on hover */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-radial from-orange-400/30 via-blue-300/10 to-transparent blur-2xl transition-all duration-700 group-hover:from-orange-400/60 group-hover:via-blue-400/20 group-hover:scale-110" />
              </div>
              {/* Rotating conic light rays on hover */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-72 h-72 md:w-96 md:h-96 rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-90 group-hover:animate-light-rays-spin"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, rgba(255,106,0,0.45) 25deg, transparent 55deg, transparent 120deg, rgba(120,160,255,0.35) 150deg, transparent 180deg, transparent 270deg, rgba(255,140,40,0.4) 300deg, transparent 330deg)",
                    WebkitMaskImage: "radial-gradient(circle, black 25%, transparent 70%)",
                    maskImage: "radial-gradient(circle, black 25%, transparent 70%)",
                    filter: "blur(6px)",
                  }}
                />
              </div>
              {/* Pulsing inner glow on hover */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-glow-pulse blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,106,0,0.7) 0%, rgba(20,40,90,0.4) 60%, transparent 80%)",
                  }}
                />
              </div>
              <img
                src={logo}
                alt="Crackly - Crack Your Limits"
                width={128}
                height={128}
                fetchPriority="high"
                decoding="async"
                className="relative w-28 h-28 md:w-32 md:h-32 mx-auto object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.35)] transition-transform duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_35px_rgba(255,140,40,0.65)]"
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
              Your Gateway to JEE, NEET & CET Success
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
            <p className="text-xl text-muted-foreground">Everything you need for JEE, NEET & CET success</p>
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
              width={112}
              height={112}
              loading="lazy"
              decoding="async"
              className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-6 drop-shadow-lg object-contain"
            />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Begin Your Journey?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of students preparing for JEE, NEET & CET with Crackly
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
            <Link to="/" className="flex items-center gap-2 opacity-75 hover:opacity-100 transition-opacity">
              <img src={logo} alt="Crackly" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-auto object-contain" />
            </Link>
            <p className="text-muted-foreground text-sm">&copy; 2026 Crackly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
