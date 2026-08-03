import { motion } from "framer-motion";
import {
  Target,
  BarChart3,
  Clock,
  CheckCircle2,
  Users,
  GraduationCap,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Exam-pattern tests",
    description: "Physics, Chemistry, Mathematics and Biology with authentic JEE, NEET and CET patterns.",
  },
  {
    icon: BarChart3,
    title: "Progress analytics",
    description: "Chapter-wise and subject-wise insights that pinpoint strengths and weak areas.",
  },
  {
    icon: Clock,
    title: "Timed practice",
    description: "Real exam conditions with a live timer to sharpen speed and time management.",
  },
  {
    icon: CheckCircle2,
    title: "Instant results",
    description: "Weighted scores, correct answers and review-marked questions right after submitting.",
  },
  {
    icon: Users,
    title: "Class management",
    description: "Coaching admins unlock tests, schedule mocks and monitor every batch.",
  },
  {
    icon: GraduationCap,
    title: "Auto student ID",
    description: "Unique TRACKALPHA IDs make enrolment and tracking effortless.",
  },
];

export const FeatureGrid = () => (
  <section className="bg-gradient-subtle py-16 md:py-20">
    <div className="container mx-auto px-4">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold md:text-4xl">Why choose TrackAlpha?</h2>
        <p className="mt-3 text-muted-foreground">Everything you need for JEE, NEET &amp; CET success</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            className="group rounded-2xl border bg-card p-5 transition-smooth hover:border-primary hover:shadow-lg"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-smooth group-hover:bg-primary/15">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-heading text-base font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
