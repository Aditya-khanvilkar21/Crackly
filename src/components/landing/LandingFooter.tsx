import { Link } from "react-router-dom";
import logo from "@/assets/logo.webp";

export const LandingFooter = () => (
  <footer className="border-t bg-card py-10">
    <div className="container mx-auto px-4">
      <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
        <Link to="/" className="flex items-center gap-3 opacity-80 transition-opacity hover:opacity-100">
          <img
            src={logo}
            alt="TrackAlpha Exam Preparation Logo"
            width={36}
            height={36}
            loading="lazy"
            decoding="async"
            className="h-9 w-auto object-contain"
          />
          <span className="font-heading text-sm font-semibold">Practice. Analyse. Crack it.</span>
        </Link>
        <p className="text-sm text-muted-foreground">&copy; 2026 TrackAlpha. All rights reserved.</p>
      </div>
    </div>
  </footer>
);
