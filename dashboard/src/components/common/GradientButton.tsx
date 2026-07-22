import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export function GradientButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: Props) {
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };
  const variants = {
    primary:
      "purple-gradient text-white purple-glow hover:opacity-95 active:opacity-90",
    ghost: "bg-white/5 text-foreground hover:bg-white/10",
    outline:
      "border border-white/10 bg-transparent text-foreground hover:bg-white/5",
  } as const;
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:pointer-events-none",
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}