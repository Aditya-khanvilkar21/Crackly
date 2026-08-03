import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, FileText, AlertTriangle, Send } from "lucide-react";

const perks = [
  { icon: BadgeCheck, title: "Your branding", text: "Your class name, address and logo printed on every student result PDF." },
  { icon: FileText, title: "Parent reports", text: "One-click branded PDF reports you can share with parents." },
  { icon: AlertTriangle, title: "Weak topic detection", text: "See which chapters your batch is losing marks on, question by question." },
  { icon: Send, title: "Scheduled mocks", text: "Unlock chapter tests or run mock tests inside a strict live window." },
];

export const ForClasses = () => (
  <section id="for-classes" className="py-16 md:py-20">
    <div className="container mx-auto px-4">
      <div className="overflow-hidden rounded-3xl gradient-hero px-6 py-12 text-primary-foreground md:px-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-brand">For tuition classes</span>
            <h2 className="mt-3 font-heading text-3xl font-bold md:text-4xl">
              Run your coaching batch on TrackAlpha
            </h2>
            <p className="mt-4 max-w-lg text-primary-foreground/80">
              Add your students, control which tests they can attempt, and turn every
              submission into teaching decisions — all under your own brand.
            </p>
            <Link to="/auth" className="mt-7 inline-block">
              <Button size="lg" variant="secondary" className="font-semibold">
                Request admin access
              </Button>
            </Link>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {perks.map((p, i) => (
              <motion.div
                key={p.title}
                className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur-sm"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <p.icon className="mb-3 h-5 w-5 text-brand" />
                <h3 className="font-heading text-sm font-semibold">{p.title}</h3>
                <p className="mt-1 text-xs text-primary-foreground/75">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);
