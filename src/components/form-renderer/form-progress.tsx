"use client";

import React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  onStepClick?: (step: number) => void;
  completedSteps?: Set<number>;
  primaryColor?: string;
}

export function FormProgress({
  currentStep,
  totalSteps,
  stepLabels,
  onStepClick,
  completedSteps = new Set(),
  primaryColor,
}: FormProgressProps) {
  const progressValue = totalSteps > 1
    ? ((currentStep) / (totalSteps - 1)) * 100
    : 100;

  const handleStepClick = (step: number) => {
    if (onStepClick && (completedSteps.has(step) || step < currentStep)) {
      onStepClick(step);
    }
  };

  const colorStyle = primaryColor
    ? { backgroundColor: primaryColor }
    : undefined;

  return (
    <div className="w-full space-y-3">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span>{Math.round(progressValue)}% complete</span>
      </div>

      <ProgressPrimitive.Root
        className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
        value={progressValue}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full transition-all duration-300 ease-in-out rounded-full",
            !primaryColor && "bg-primary"
          )}
          style={{
            width: `${progressValue}%`,
            ...(primaryColor ? { backgroundColor: primaryColor } : {}),
          }}
        />
      </ProgressPrimitive.Root>

      {/* Step labels */}
      {stepLabels && stepLabels.length > 0 && (
        <div className="flex justify-between mt-4">
          {stepLabels.map((label, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;
            const isClickable = isCompleted || index < currentStep;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-1.5 group transition-colors",
                  isClickable
                    ? "cursor-pointer"
                    : "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium border-2 transition-colors",
                    isCurrent && !primaryColor &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent && primaryColor &&
                      "text-white",
                    isCompleted && !isCurrent && !primaryColor &&
                      "border-primary bg-primary/10 text-primary",
                    isCompleted && !isCurrent && primaryColor &&
                      "bg-opacity-10",
                    !isCompleted && !isCurrent &&
                      "border-muted-foreground/30 text-muted-foreground"
                  )}
                  style={
                    isCurrent && primaryColor
                      ? { borderColor: primaryColor, backgroundColor: primaryColor }
                      : isCompleted && !isCurrent && primaryColor
                      ? { borderColor: primaryColor, color: primaryColor }
                      : undefined
                  }
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs max-w-[80px] truncate text-center hidden sm:block",
                    isCurrent
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
