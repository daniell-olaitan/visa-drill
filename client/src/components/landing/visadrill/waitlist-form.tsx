import * as React from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button-variants";

interface WaitlistFormProps {
  dark?: boolean;
}

export function WaitlistForm({ dark = false }: WaitlistFormProps) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [joined, setJoined] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = (await res.json()) as { data: unknown; error: { message: string } | null };
      if (!res.ok && json.error) {
        toast.error(json.error.message);
        return;
      }
      setJoined(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (joined) {
    return (
      <div className={cn("flex items-center gap-4 border-t py-5", dark ? "border-white/10" : "border-border")}>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px]",
            dark ? "bg-white/10" : "bg-success/10",
          )}
        >
          <svg
            className={cn("h-4 w-4", dark ? "text-white" : "text-success")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className={cn("text-sm font-semibold", dark ? "text-white" : "text-ink")}>You&apos;re on the list.</p>
          <p className={cn("mt-0.5 text-xs", dark ? "text-white/40" : "text-ink-tertiary")}>
            We&apos;ll email <span className="font-medium">{email}</span> when VisaDrill opens.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Single bar - email field with the submit button inset on the right */}
        <div
          className={cn(
            "flex h-12 items-center gap-2 rounded-xs border pl-4 pr-1.5 transition-colors",
            dark
              ? "border-white/15 bg-white/5 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/15"
              : "border-border bg-surface focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/30",
          )}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={loading}
            aria-label="Email address"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50",
              dark ? "text-white placeholder:text-white/30" : "text-ink placeholder:text-ink-tertiary",
            )}
          />
          <button
            type="submit"
            disabled={!email.trim() || loading}
            className={cn(buttonVariants({ variant: dark ? "white" : "dark", size: "md" }), "shrink-0")}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                Get access
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
      <p className={cn("mt-3 text-[11px]", dark ? "text-white/25" : "text-ink-tertiary")}>
        No spam. Just your access link when we launch.
      </p>
    </div>
  );
}
