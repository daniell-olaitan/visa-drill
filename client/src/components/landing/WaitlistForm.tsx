import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getJoinedState,
  getReferralLink,
  joinWaitlist,
  type WaitlistResult,
} from "@/lib/waitlist";

interface WaitlistFormProps {
  /** hero: compact one-line form. panel: the full waitlist card. */
  variant?: "hero" | "panel";
  className?: string;
}

const formatPosition = (position: number) => `#${position.toLocaleString("en-US")}`;

const ShareRow = ({ result }: { result: WaitlistResult }) => {
  const [copied, setCopied] = useState(false);
  const link = getReferralLink(result.referralCode);
  const message = encodeURIComponent(
    `I'm practicing for my US visa interview with a hyperreal AI officer on FaceDrill. Join the waitlist: ${link}`,
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable; the link is visible to copy manually */
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-background py-1.5 pl-4 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-left text-sm text-muted-foreground">
          {link.replace(/^https?:\/\//, "")}
        </span>
        <Button type="button" size="sm" variant="secondary" onClick={copy} className="shrink-0">
          {copied ? <Check className="text-success" /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" variant="outline" asChild>
          <a
            href={`https://wa.me/?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a
            href={`https://x.com/intent/post?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on X
          </a>
        </Button>
      </div>
    </div>
  );
};

const WaitlistForm = ({ variant = "panel", className }: WaitlistFormProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WaitlistResult | null>(() => getJoinedState());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await joinWaitlist(email));
    } catch {
      setError("That didn’t go through. Mind trying once more?");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div
        className={cn(
          "animate-fade-up text-center",
          variant === "panel" &&
            "rounded-3xl border border-border bg-card p-8 shadow-medium md:p-10",
          className,
        )}
      >
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-success/10">
          <Check className="h-5 w-5 text-success" />
        </div>

        {result.position !== null ? (
          <>
            <p className="text-sm text-muted-foreground">
              {result.alreadyJoined ? "You’re already in line" : "You’re in line"}
            </p>
            <p className="font-display mt-1 text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
              {formatPosition(result.position)}
            </p>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Every friend who joins with your link moves you up the queue. The
              front of the line gets access first, free.
            </p>
          </>
        ) : (
          <>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              You’re on the list
            </h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              We’ll email <span className="font-medium text-foreground">{result.email}</span> the
              moment your access opens. Friends who join through your link push
              you toward the front.
            </p>
          </>
        )}

        <div className="mt-6">
          <ShareRow result={result} />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        variant === "panel" &&
          "rounded-3xl border border-border bg-card p-8 shadow-medium md:p-10",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row",
          variant === "hero" && "mx-auto max-w-md",
        )}
      >
        <label htmlFor={`waitlist-email-${variant}`} className="sr-only">
          Email address
        </label>
        <input
          id={`waitlist-email-${variant}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 min-w-0 flex-1 rounded-full border border-input bg-background px-5 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <Button type="submit" size="lg" disabled={loading} className="sm:px-6">
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              Get early access
              <ArrowRight />
            </>
          )}
        </Button>
      </div>
      <p
        className={cn(
          "mt-3 text-xs text-muted-foreground",
          variant === "hero" && "text-center",
        )}
      >
        {error ?? "Email only. No spam, just your access."}
      </p>
    </form>
  );
};

export default WaitlistForm;
