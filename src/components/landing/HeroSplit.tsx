import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export const HeroSplit = () => (
  <section className="relative overflow-hidden gradient-hero text-primary-foreground pt-20 pb-14 md:pt-28 md:pb-20">
    <div
      aria-hidden
      className="pointer-events-none absolute -top-40 -left-24 h-96 w-96 rounded-full blur-3xl opacity-30"
      style={{ background: "radial-gradient(circle, hsl(var(--brand)) 0%, transparent 70%)" }}
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full blur-3xl opacity-25"
      style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)" }}
    />

    <div className="relative container mx-auto px-4">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            JEE • NEET • CET
          </span>

          <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.08] md:text-6xl">
            TrackAlpha — JEE, NEET &amp; CET
          </h1>

          <p className="mt-4 text-xl font-semibold md:text-2xl">
            Crack Your Limits,{" "}
            <span className="text-brand">Unlock Your Future.</span>
          </p>

          <p className="mt-4 mx-auto max-w-xl text-base text-primary-foreground/80 md:text-lg">
            Exam-pattern mock tests, chapter-wise practice and instant analytics —
            built for aspirants and the tuition classes that coach them.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="w-full font-semibold sm:w-auto">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#for-classes" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-primary-foreground/35 bg-transparent font-semibold text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
              >
                I&apos;m a tuition class
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);
