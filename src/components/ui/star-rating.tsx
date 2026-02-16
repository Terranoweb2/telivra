"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  count?: number;
  className?: string;
}

const sizes = { sm: "w-3.5 h-3.5", md: "w-5 h-5", lg: "w-7 h-7" };

export function StarRating({ value, onChange, size = "md", showValue, count, className }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const interactive = !!onChange;
  const display = hover || value;
  const sizeClass = sizes[size];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = display >= star;
          const partial = !filled && display > star - 1;
          const pct = partial ? Math.round((display - (star - 1)) * 100) : 0;

          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              className={cn(
                "relative p-0 border-0 bg-transparent transition-transform",
                interactive && "cursor-pointer hover:scale-110 active:scale-95",
                !interactive && "cursor-default"
              )}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => interactive && setHover(star)}
              onMouseLeave={() => interactive && setHover(0)}
            >
              {/* Etoile vide (fond) */}
              <Star className={cn(sizeClass, "text-gray-600 fill-gray-700/30")} />
              {/* Etoile pleine ou partielle */}
              {(filled || partial) && (
                <Star
                  className={cn(sizeClass, "absolute inset-0 text-yellow-400 fill-yellow-400")}
                  style={partial ? { clipPath: `inset(0 ${100 - pct}% 0 0)` } : undefined}
                />
              )}
            </button>
          );
        })}
      </div>
      {showValue && value > 0 && (
        <span className={cn("font-semibold text-yellow-400", size === "sm" ? "text-xs" : "text-sm")}>
          {value.toFixed(1)}
        </span>
      )}
      {count != null && count > 0 && (
        <span className={cn("text-gray-500", size === "sm" ? "text-[10px]" : "text-xs")}>
          ({count})
        </span>
      )}
    </div>
  );
}
