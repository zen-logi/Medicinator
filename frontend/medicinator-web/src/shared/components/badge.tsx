import * as React from "react";
import { cn } from "@/shared/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "mint" | "rose" | "amber";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "border-stone-200 bg-white/80 text-stone-700",
  mint: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rose: "border-pink-200 bg-pink-50 text-pink-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}
