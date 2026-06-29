import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">404</p>
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight text-foreground">
          This window is closed.
        </h1>
        <p className="mt-3 text-muted-foreground">The page you’re looking for doesn’t exist.</p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/">Back to the entrance</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
