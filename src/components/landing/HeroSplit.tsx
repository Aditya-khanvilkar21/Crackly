import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import logo from "@/assets/logo.webp";

const subjects = [
  { name: "Physics", score: 42, total: 50 },
  { name: "Chemistry", score: 38, total: 50 },
  { name: "Mathematics", score: 88, total: 100 },
];

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
      <div className="grid items-center gap-12 lg:grid-cols-2">
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
            Crackly — JEE, NEET &amp; CET
          </h1>

          <p className="mt-4 text-xl font-semibold md:text-2xl">
            Crack Your Limits,{" "}
            <span className="text-brand">Unlock Your Future.</span>
          </p>

          <p className="mt-4 max-w-xl text-base text-primary-foreground/80 md:text-lg">
            Exam-pattern mock tests, chapter-wise practice and instant analytics —
            built for aspirants and the tuition classes that coach them.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

        <motion.div
          className="relative mx-auto w-full max-w-md"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="rounded-2xl border border-primary-foreground/15 bg-card p-5 text-card-foreground shadow-primary">
            <div className="flex items-center gap-3 border-b pb-4">
              <img
                src={logo}
                alt="Crackly logo"
                width={40}
                height={40}
                fetchPriority="high"
                decoding="async"
                className="h-10 w-10 object-contain"
              />
              <div>
                <p className="font-heading text-sm font-semibold">Mock Test Report</p>
                <p className="text-xs text-muted-foreground">JEE Main • Full syllabus</p>
              </div>
            </div>

            <div className="flex items-end justify-between py-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total score</p>
                <p className="font-heading text-4xl font-extrabold text-primary">
                  168<span className="text-lg text-muted-foreground">/200</span>
                </p>
              </div>
              <div className="rounded-xl bg-success/10 px-3 py-2 text-right">
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="font-heading text-xl font-bold text-success">84%</p>
              </div>
            </div>

            <div className="space-y-3">
              {subjects.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex justify-between text-xs font-medium">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">
                      {s.score}/{s.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full gradient-primary"
                      style={{ width: `${(s.score / s.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-5 rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              Marked for review: 4 questions • Time taken: 2h 48m
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);
