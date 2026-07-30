import { motion } from "framer-motion";

const stats = [
  { value: "3", label: "Exams covered" },
  { value: "PCM + Bio", label: "Full subject coverage" },
  { value: "45 Q", label: "Per chapter test" },
  { value: "200", label: "Marks per mock test" },
];

export const StatsStrip = () => (
  <section className="border-b bg-secondary/60">
    <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
        >
          <p className="font-heading text-2xl font-extrabold text-primary md:text-3xl">{s.value}</p>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">{s.label}</p>
        </motion.div>
      ))}
    </div>
  </section>
);
