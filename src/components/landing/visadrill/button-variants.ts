import { cva, type VariantProps } from "class-variance-authority";

// visa-drill's button variants, ported verbatim for the landing.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
        dark: "bg-ink text-white hover:bg-ink/85 active:bg-ink/75",
        white: "bg-white text-black hover:bg-white/90 active:bg-white/80",
        secondary: "bg-surface border border-border text-ink hover:bg-surface-raised active:bg-surface-overlay",
        ghost: "text-ink-secondary hover:bg-surface-raised hover:text-ink active:bg-surface-overlay",
        danger: "bg-danger text-white hover:bg-red-600 active:bg-red-700",
        link: "text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline p-0 h-auto",
        outline: "border border-brand-600 text-brand-600 hover:bg-brand-50 active:bg-brand-100",
      },
      size: {
        sm: "h-8 px-3.5 text-sm rounded-[3px]",
        md: "h-10 px-4 text-sm rounded-xs",
        lg: "h-11 px-5 text-base rounded-xs",
        xl: "h-12 px-6 text-base rounded-xs",
        icon: "h-9 w-9 rounded-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
