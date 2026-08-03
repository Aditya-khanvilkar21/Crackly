import { motion } from "framer-motion";
import { UserPlus, Users, LineChart } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Sign up and get your ID",
    text: "Every student receives a unique TRACKALPHA student ID the moment they register.",
  },
  {
    icon: Users,
    title: "Join your tuition class",
    text: "Share your ID with your coaching admin, or send a join request from the dashboard.",
  },
  {
    icon: LineChart,
    title: "Practice and track",
    text: "Take chapter tests and live mock tests, then review analytics and weak topics.",
  },
];

export const HowItWorks = () => (
  <section className="py-16 md:py-20">
    <div className="container mx-auto px-4">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold md:text-4xl">How TrackAlpha works</h2>
        <p className="mt-3 text-muted-foreground">Three steps from sign-up to your first score report</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            className="relative rounded-2xl border bg-card p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.1 }}
          >
            <span className="absolute right-5 top-5 font-heading text-4xl font-extrabold text-secondary">
              {i + 1}
            </span>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <step.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
