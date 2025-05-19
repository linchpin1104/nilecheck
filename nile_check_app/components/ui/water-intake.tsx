"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Droplets } from "lucide-react";

interface WaterIntakeProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  className?: string;
}

export function WaterIntake({
  value,
  onChange,
  max = 5,
  className,
}: WaterIntakeProps) {
  const cupValues = Array.from({ length: max }, (_, i) => i + 1);
  const ML_PER_CUP = 200; // 1잔 = 200ml로 정의

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex items-center justify-center gap-2">
        {cupValues.map((cupValue) => (
          <button
            key={cupValue}
            type="button"
            className={cn(
              "relative group flex flex-col items-center transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            onClick={() => onChange(cupValue)}
          >
            <div
              className={cn(
                "w-10 h-12 rounded-b-full rounded-t-lg border-2 border-blue-300 flex items-center justify-center relative overflow-hidden transition-all",
                cupValue <= value
                  ? "bg-blue-400 border-blue-500"
                  : "bg-transparent"
              )}
            >
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-blue-500 transition-all",
                  cupValue <= value ? "h-full" : "h-0"
                )}
              />
              <Droplets
                className={cn(
                  "w-5 h-5 z-10 transition-colors",
                  cupValue <= value ? "text-white" : "text-blue-300"
                )}
              />
            </div>
            <span
              className={cn(
                "text-xs mt-1 transition-colors",
                cupValue <= value ? "font-medium text-blue-600" : "text-muted-foreground"
              )}
            >
              {cupValue}잔
            </span>
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {value}잔의 물 ({value * ML_PER_CUP}ml)
      </p>
    </div>
  );
} 