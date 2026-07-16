import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SeoHead } from "@/components/SeoHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
    <SeoHead
      title="Page Not Found | Crackly"
      description="The page you’re looking for doesn’t exist. Head back to Crackly to continue your JEE, NEET or CET prep."
      path={location.pathname}
    />
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:opacity-80">
          Return to Home
        </a>
      </main>
    </div>
    </>
  );
};

export default NotFound;
