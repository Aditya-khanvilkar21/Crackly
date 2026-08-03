import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SeoHead } from "@/components/SeoHead";
import { HeroSplit } from "@/components/landing/HeroSplit";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { ForClasses } from "@/components/landing/ForClasses";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import logo from "@/assets/logo.webp";

const Index = () => {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-background focus:px-3 focus:py-2 focus:text-foreground"
      >
        Skip to main content
      </a>

      <SeoHead
        title="TrackAlpha — Crack JEE, NEET & CET Exams"
        description="Authentic exam-style mock tests, chapter-wise practice, and real-time analytics for JEE, NEET and CET aspirants."
        path="/landing"
      />

      <header className="fixed left-0 right-0 top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="group relative flex items-center gap-3">
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-3 rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at center, hsl(var(--brand) / 0.5) 0%, hsl(var(--brand) / 0.22) 35%, hsl(var(--primary) / 0.3) 65%, transparent 75%)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-full opacity-0 transition-opacity duration-500 group-hover:animate-light-rays-spin group-hover:opacity-80"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, hsl(var(--brand) / 0.4) 30deg, transparent 60deg, transparent 180deg, hsl(var(--accent) / 0.35) 210deg, transparent 240deg)",
                WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 70%)",
                maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
              }}
            />
            <span className="relative overflow-hidden rounded-md">
              <img
                src={logo}
                alt="TrackAlpha Exam Preparation Logo"
                className="relative h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105 md:h-11"
              />
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <Link to="/auth">
              <Button size="sm" variant="ghost" className="hidden font-medium sm:inline-flex">
                Login
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <HeroSplit />
        <StatsStrip />
        <HowItWorks />
        <FeatureGrid />
        <ForClasses />
        <LandingFaq />

        <section className="border-t py-14">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <blockquote className="text-lg italic text-muted-foreground md:text-xl">
                &ldquo;Success is not final, failure is not fatal:
                <span className="font-medium text-primary"> it is the courage to continue that counts.</span>&rdquo;
              </blockquote>
              <h2 className="mt-8 font-heading text-2xl font-bold md:text-3xl">
                Ready to begin your journey?
              </h2>
              <Link to="/auth" className="mt-6 inline-block">
                <Button size="lg" className="px-8 font-semibold">
                  Start practicing now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default Index;
