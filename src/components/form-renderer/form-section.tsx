"use client";

import React, { useMemo } from "react";
import { FormField, type FieldDefinition } from "@/components/form-renderer/form-field";

// ---------------------------------------------------------------------------
// Conditional logic evaluation
// ---------------------------------------------------------------------------

interface ConditionalRule {
  id: string;
  fieldId: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty";
  value: string | number | boolean;
  logicOperator?: "AND" | "OR";
}

interface ConditionalLogicEntry {
  id: string;
  fieldId?: string;
  conditions: ConditionalRule[];
  action: string; // "show" | "hide" | "require"
  targetFieldId?: string;
}

/**
 * Evaluate whether a single condition rule is met given current form values.
 */
function evaluateRule(
  rule: ConditionalRule,
  values: Record<string, unknown>
): boolean {
  const fieldValue = values[rule.fieldId];

  switch (rule.operator) {
    case "equals":
      return String(fieldValue) === String(rule.value);
    case "not_equals":
      return String(fieldValue) !== String(rule.value);
    case "contains":
      return String(fieldValue ?? "")
        .toLowerCase()
        .includes(String(rule.value).toLowerCase());
    case "not_contains":
      return !String(fieldValue ?? "")
        .toLowerCase()
        .includes(String(rule.value).toLowerCase());
    case "greater_than":
      return Number(fieldValue) > Number(rule.value);
    case "less_than":
      return Number(fieldValue) < Number(rule.value);
    case "is_empty":
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "is_not_empty":
      return (
        fieldValue !== undefined &&
        fieldValue !== null &&
        fieldValue !== "" &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    default:
      return true;
  }
}

/**
 * Evaluate all conditions for a conditional logic entry.
 * Supports AND/OR chaining between multiple rules.
 */
function evaluateConditions(
  conditions: ConditionalRule[],
  values: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  let result = evaluateRule(conditions[0], values);

  for (let i = 1; i < conditions.length; i++) {
    const rule = conditions[i];
    const prevOperator = conditions[i - 1].logicOperator || "AND";
    const ruleResult = evaluateRule(rule, values);

    if (prevOperator === "AND") {
      result = result && ruleResult;
    } else {
      result = result || ruleResult;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// FormSection Component
// ---------------------------------------------------------------------------

interface FormSectionProps {
  title?: string;
  description?: string;
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: unknown) => void;
  conditionalLogic?: ConditionalLogicEntry[];
}

export function FormSection({
  title,
  description,
  fields,
  values,
  errors,
  onChange,
  conditionalLogic = [],
}: FormSectionProps) {
  /**
   * Determine which fields should be visible based on conditional logic.
   * For each conditional logic entry targeting a field, evaluate its conditions
   * and apply the show/hide action.
   */
  const visibleFields = useMemo(() => {
    return fields.filter((field) => {
      // Find all logic entries that target this field
      const rules = conditionalLogic.filter(
        (cl) => cl.targetFieldId === field.id
      );

      // If no conditional logic targets this field, show it
      if (rules.length === 0) return true;

      for (const rule of rules) {
        const conditionsMet = evaluateConditions(
          rule.conditions,
          values
        );

        if (rule.action === "show") {
          // Show action: field visible only when conditions are met
          if (!conditionsMet) return false;
        } else if (rule.action === "hide") {
          // Hide action: field hidden when conditions are met
          if (conditionsMet) return false;
        }
        // "require" is handled at validation time, not visibility
      }

      return true;
    });
  }, [fields, conditionalLogic, values]);

  return (
    <div className="space-y-6">
      {/* Section header */}
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-5">
        {visibleFields.map((field) => (
          <FormField
            key={field.id}
            field={field}
            value={values[field.variable || field.id]}
            onChange={(val) => onChange(field.variable || field.id, val)}
            error={errors[field.variable || field.id]}
          />
        ))}
      </div>

      {visibleFields.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-4 text-center">
          No fields to display in this section.
        </p>
      )}
    </div>
  );
}

export default FormSection;
