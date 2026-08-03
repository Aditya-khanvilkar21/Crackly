import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Helmet } from "react-helmet-async";

const faqs = [
  {
    q: "What is TrackAlpha?",
    a: "TrackAlpha is an online test platform for JEE, NEET and CET aspirants. Students take exam-pattern chapter tests and mock tests, and get instant scores with detailed analytics.",
  },
  {
    q: "Which exams does TrackAlpha cover?",
    a: "JEE, NEET and MHT-CET, across Physics, Chemistry, Mathematics and Biology, organised by subject and chapter.",
  },
  {
    q: "Do I need a tuition class to use TrackAlpha?",
    a: "You can sign up on your own, but tests are unlocked by your tuition class admin. Share your TrackAlpha student ID with them or send a join request from your dashboard.",
  },
  {
    q: "What is the difference between chapter tests and mock tests?",
    a: "Chapter tests are 45-question drills focused on a single chapter. Mock tests follow the full exam pattern with weighted marking out of 200 and run inside a scheduled live window.",
  },
  {
    q: "Will my result PDF show my tuition class branding?",
    a: "Yes. If your class admin has uploaded a logo and address, they appear on the result PDF you download after each test.",
  },
  {
    q: "Are my answers saved if I lose connection?",
    a: "Answers, clears and review marks are saved automatically as you go, so you can resume a test exactly where you left off.",
  },
];

export const LandingFaq = () => (
  <section className="bg-gradient-subtle py-16 md:py-20">
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}
      </script>
    </Helmet>

    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-center font-heading text-3xl font-bold md:text-4xl">
          Frequently asked questions
        </h2>
        <Accordion type="single" collapsible className="rounded-2xl border bg-card px-4">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-heading text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);
