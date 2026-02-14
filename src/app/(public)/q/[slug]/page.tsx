"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormProgress } from "@/components/form-renderer/form-progress";
import { FormSection } from "@/components/form-renderer/form-section";
import type { FieldDefinition } from "@/components/form-renderer/form-field";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConditionalLogicEntry {
  id: string;
  fieldId?: string;
  conditions: Array<{
    id: string;
    fieldId: string;
    operator: string;
    value: string | number | boolean;
    logicOperator?: "AND" | "OR";
  }>;
  action: string;
  targetFieldId?: string;
}

interface Section {
  name: string;
  description?: string;
  fields: FieldDefinition[];
}

interface Branding {
  logo?: string;
  primaryColor?: string;
  companyName?: string;
}

interface QuestionnaireData {
  id: string;
  title: string;
  description?: string;
  sections: Section[];
  settings: {
    allowSave?: boolean;
    showProgressBar?: boolean;
    requireEmail?: boolean;
    submitButtonText?: string;
    confirmationMessage?: string;
    redirectUrl?: string;
  };
  conditionalLogic: ConditionalLogicEntry[];
  branding: Branding;
}

type PageState = "loading" | "form" | "submitted" | "error";

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function QuestionnairePublicPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [state, setState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Used to debounce localStorage saves
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `docgen_response_${slug}`;

  // ── Fetch questionnaire data ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/shared/${slug}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 404) {
            setErrorMessage("This questionnaire link is invalid or does not exist.");
          } else if (res.status === 410) {
            setErrorMessage(
              data.error || "This questionnaire link has expired."
            );
          } else {
            setErrorMessage(
              data.error || "Something went wrong. Please try again later."
            );
          }
          setState("error");
          return;
        }

        const data: QuestionnaireData = await res.json();
        setQuestionnaire(data);

        // Restore saved progress from localStorage
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.values) {
              setValues(parsed.values);
            }
            if (typeof parsed.currentStep === "number") {
              setCurrentStep(parsed.currentStep);
            }
            if (parsed.completedSteps) {
              setCompletedSteps(new Set(parsed.completedSteps));
            }
          }
        } catch {
          // Ignore localStorage errors
        }

        setState("form");
      } catch {
        setErrorMessage("Unable to load the questionnaire. Please check your connection.");
        setState("error");
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ── Auto-save to localStorage ─────────────────────────────────────────────
  const saveToStorage = useCallback(
    (newValues: Record<string, unknown>, step: number, completed: Set<number>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              values: newValues,
              currentStep: step,
              completedSteps: Array.from(completed),
              savedAt: new Date().toISOString(),
            })
          );
        } catch {
          // Ignore storage errors (quota exceeded, etc.)
        }
      }, 300);
    },
    [storageKey]
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const sections = questionnaire?.sections ?? [];
  const totalSteps = sections.length;
  const currentSection = sections[currentStep];
  const stepLabels = sections.map((s) => s.name);
  const branding = questionnaire?.branding ?? {};
  const settings = questionnaire?.settings ?? {};

  const allFields = useMemo(
    () => sections.flatMap((s) => s.fields),
    [sections]
  );

  // ── Validate current step ────────────────────────────────────────────────
  const validateCurrentStep = useCallback((): boolean => {
    if (!currentSection) return true;

    const stepErrors: Record<string, string> = {};
    for (const field of currentSection.fields) {
      const key = field.variable || field.id;
      const val = values[key];
      const required = field.isRequired || field.validation?.required;

      if (required) {
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          stepErrors[key] = `${field.label} is required`;
        }
      }

      // Email validation
      if (field.type === "email" && val && typeof val === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          stepErrors[key] = "Please enter a valid email address";
        }
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [currentSection, values]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFieldChange = useCallback(
    (fieldId: string, value: unknown) => {
      setValues((prev) => {
        const updated = { ...prev, [fieldId]: value };
        saveToStorage(updated, currentStep, completedSteps);
        return updated;
      });
      // Clear error for this field when user types
      setErrors((prev) => {
        if (prev[fieldId]) {
          const updated = { ...prev };
          delete updated[fieldId];
          return updated;
        }
        return prev;
      });
    },
    [currentStep, completedSteps, saveToStorage]
  );

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) return;

    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStep);
    setCompletedSteps(newCompleted);

    const nextStep = Math.min(currentStep + 1, totalSteps - 1);
    setCurrentStep(nextStep);
    saveToStorage(values, nextStep, newCompleted);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [
    validateCurrentStep,
    completedSteps,
    currentStep,
    totalSteps,
    saveToStorage,
    values,
  ]);

  const handleBack = useCallback(() => {
    const prevStep = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStep);
    setErrors({});
    saveToStorage(values, prevStep, completedSteps);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, saveToStorage, values, completedSteps]);

  const handleStepClick = useCallback(
    (step: number) => {
      if (completedSteps.has(step) || step < currentStep) {
        setCurrentStep(step);
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [completedSteps, currentStep]
  );

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) return;
    if (!questionnaire) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionnaireId: questionnaire.id,
          answers: values,
          slug,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      // Clear saved progress
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }

      setState("submitted");

      // Redirect if configured
      if (settings.redirectUrl) {
        setTimeout(() => {
          window.location.href = settings.redirectUrl!;
        }, 2000);
      }
    } catch (err) {
      setErrors({
        _form:
          err instanceof Error
            ? err.message
            : "Submission failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateCurrentStep, questionnaire, values, slug, storageKey, settings]);

  // ── Render states ─────────────────────────────────────────────────────────

  // Loading
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Loading questionnaire...
        </p>
      </div>
    );
  }

  // Error
  if (state === "error") {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">Unable to Load</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {errorMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Submitted
  if (state === "submitted") {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <CheckCircle2
            className="h-12 w-12"
            style={branding.primaryColor ? { color: branding.primaryColor } : undefined}
          />
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">Response Submitted</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {settings.confirmationMessage ||
                "Thank you! Your response has been submitted."}
            </p>
          </div>
          {settings.redirectUrl && (
            <p className="text-xs text-muted-foreground">
              Redirecting...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="space-y-6">
      {/* Branding header */}
      {(branding.logo || branding.companyName) && (
        <div className="flex items-center gap-3 mb-2">
          {branding.logo && (
            <img
              src={branding.logo}
              alt={branding.companyName || "Logo"}
              className="h-10 w-auto object-contain"
            />
          )}
          {branding.companyName && (
            <span className="text-sm font-medium text-muted-foreground">
              {branding.companyName}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {questionnaire?.title}
        </h1>
        {questionnaire?.description && (
          <p className="text-muted-foreground">{questionnaire.description}</p>
        )}
      </div>

      {/* Progress bar */}
      {settings.showProgressBar !== false && totalSteps > 1 && (
        <FormProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          stepLabels={stepLabels}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
          primaryColor={branding.primaryColor}
        />
      )}

      {/* Current section */}
      <Card>
        <CardHeader>
          {currentSection?.name && currentSection.name !== "default" && (
            <CardTitle className="text-lg">{currentSection.name}</CardTitle>
          )}
          {currentSection?.description && (
            <CardDescription>{currentSection.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {currentSection && (
            <FormSection
              fields={currentSection.fields}
              values={values}
              errors={errors}
              onChange={handleFieldChange}
              conditionalLogic={questionnaire?.conditionalLogic as never}
            />
          )}

          {/* Form-level error */}
          {errors._form && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors._form}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep || isSubmitting}
        >
          Back
        </Button>

        <div className="flex items-center gap-3">
          {isLastStep ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={
                branding.primaryColor
                  ? {
                      backgroundColor: branding.primaryColor,
                      borderColor: branding.primaryColor,
                    }
                  : undefined
              }
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {settings.submitButtonText || "Submit"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              style={
                branding.primaryColor
                  ? {
                      backgroundColor: branding.primaryColor,
                      borderColor: branding.primaryColor,
                    }
                  : undefined
              }
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
