import { Link, useLocation } from "react-router-dom";

const Footer = () => {
  const { pathname } = useLocation();
  if (pathname === "/interview") return null;

  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="container py-12 md:py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="" className="h-6 w-6" aria-hidden="true" />
              <span className="font-display text-lg font-semibold tracking-tight">VisaDrill</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Practice your US visa interview with a face that feels real, so the
              real one feels familiar.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm" aria-label="Footer">
            <a href="/#why" className="text-muted-foreground transition-colors hover:text-foreground">
              Why it works
            </a>
            <Link to="/practice" className="text-muted-foreground transition-colors hover:text-foreground">
              Try a session
            </Link>
            <a href="/#questions" className="text-muted-foreground transition-colors hover:text-foreground">
              The questions
            </a>
            <a href="/#faq" className="text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
            <a href="/#waitlist" className="text-muted-foreground transition-colors hover:text-foreground">
              Waitlist
            </a>
          </nav>
        </div>

        <div className="mt-10 border-t border-border/70 pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            VisaDrill is an independent practice tool. It is not affiliated with the
            U.S. Department of State or any government agency, and nothing here is
            legal advice. Practice sessions stay on your device.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} VisaDrill
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
