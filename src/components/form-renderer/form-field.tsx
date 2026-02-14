"use client";

import React, { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { SignaturePadComponent } from "@/components/signature-pad";
import { FileUploadField } from "@/components/form-renderer/file-upload-field";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldDefinition {
  id: string;
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  options?: FieldOption[] | string[];
  validation?: FieldValidation;
  isRequired?: boolean;
  config?: Record<string, unknown>;
  defaultValue?: string;
  variable?: string;
}

export interface FormFieldProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeOptions(
  opts?: FieldOption[] | string[]
): FieldOption[] {
  if (!opts || opts.length === 0) return [];
  if (typeof opts[0] === "string") {
    return (opts as string[]).map((o) => ({ label: o, value: o }));
  }
  return opts as FieldOption[];
}

function validateField(
  field: FieldDefinition,
  value: unknown
): string | undefined {
  const v = field.validation;
  const required = field.isRequired || v?.required;

  if (required) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return `${field.label} is required`;
    }
  }

  if (!value && !required) return undefined;

  const strValue = typeof value === "string" ? value : "";

  if (v?.minLength && strValue.length < v.minLength) {
    return `Minimum ${v.minLength} characters required`;
  }
  if (v?.maxLength && strValue.length > v.maxLength) {
    return `Maximum ${v.maxLength} characters allowed`;
  }
  if (v?.min !== undefined && typeof value === "number" && value < v.min) {
    return `Minimum value is ${v.min}`;
  }
  if (v?.max !== undefined && typeof value === "number" && value > v.max) {
    return `Maximum value is ${v.max}`;
  }
  if (v?.pattern && strValue) {
    const regex = new RegExp(v.pattern);
    if (!regex.test(strValue)) {
      return v.patternMessage || "Invalid format";
    }
  }

  // Type-specific validation
  if (field.type === "email" && strValue) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strValue)) {
      return "Please enter a valid email address";
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// FormField Component
// ---------------------------------------------------------------------------

export function FormField({ field, value, onChange, error: externalError }: FormFieldProps) {
  const [internalError, setInternalError] = useState<string | undefined>();
  const displayError = externalError || internalError;

  const handleBlur = useCallback(() => {
    const err = validateField(field, value);
    setInternalError(err);
  }, [field, value]);

  const fieldId = `field-${field.id}`;

  return (
    <div className="space-y-2">
      {/* Label */}
      {field.type !== "yes_no" && (
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {field.label}
          {(field.isRequired || field.validation?.required) && (
            <span className="text-destructive ml-1">*</span>
          )}
        </Label>
      )}

      {/* Description */}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}

      {/* Field input */}
      <FieldInput
        field={field}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        fieldId={fieldId}
        hasError={!!displayError}
      />

      {/* Error */}
      {displayError && (
        <p className="text-sm text-destructive">{displayError}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldInput - renders the actual input based on type
// ---------------------------------------------------------------------------

interface FieldInputProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  fieldId: string;
  hasError: boolean;
}

function FieldInput({
  field,
  value,
  onChange,
  onBlur,
  fieldId,
  hasError,
}: FieldInputProps) {
  const errorClass = hasError ? "border-destructive" : "";

  switch (field.type) {
    // ── Short text ──────────────────────────────────────────────────────────
    case "short_text":
      return (
        <Input
          id={fieldId}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={errorClass}
        />
      );

    // ── Long text ───────────────────────────────────────────────────────────
    case "long_text":
      return (
        <Textarea
          id={fieldId}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          rows={4}
          className={errorClass}
        />
      );

    // ── Email ───────────────────────────────────────────────────────────────
    case "email":
      return (
        <Input
          id={fieldId}
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder || "email@example.com"}
          className={errorClass}
        />
      );

    // ── Phone ───────────────────────────────────────────────────────────────
    case "phone":
      return (
        <Input
          id={fieldId}
          type="tel"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder || "(555) 555-5555"}
          className={errorClass}
        />
      );

    // ── Number ──────────────────────────────────────────────────────────────
    case "number":
      return (
        <Input
          id={fieldId}
          type="number"
          value={(value as string) ?? ""}
          onChange={(e) => {
            const num = e.target.value === "" ? "" : Number(e.target.value);
            onChange(num);
          }}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={errorClass}
        />
      );

    // ── Currency ────────────────────────────────────────────────────────────
    case "currency":
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            $
          </span>
          <Input
            id={fieldId}
            type="number"
            step="0.01"
            value={(value as string) ?? ""}
            onChange={(e) => {
              const num = e.target.value === "" ? "" : Number(e.target.value);
              onChange(num);
            }}
            onBlur={onBlur}
            placeholder={field.placeholder || "0.00"}
            className={cn("pl-7", errorClass)}
          />
        </div>
      );

    // ── Single select ───────────────────────────────────────────────────────
    case "single_select": {
      const options = normalizeOptions(field.options);

      // Use Select (dropdown) if more than 5 options, otherwise RadioGroup
      if (options.length > 5) {
        return (
          <Select
            value={(value as string) ?? ""}
            onValueChange={(val) => {
              onChange(val);
            }}
          >
            <SelectTrigger id={fieldId} className={errorClass} onBlur={onBlur}>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      // Radio group for 5 or fewer options
      return (
        <div className="space-y-2" role="radiogroup" aria-labelledby={fieldId}>
          {options.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                (value as string) === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-input hover:bg-accent/50"
              )}
            >
              <input
                type="radio"
                name={fieldId}
                value={opt.value}
                checked={(value as string) === opt.value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      );
    }

    // ── Multi select ────────────────────────────────────────────────────────
    case "multi_select": {
      const options = normalizeOptions(field.options);
      const selected = Array.isArray(value) ? (value as string[]) : [];

      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                  isChecked
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-accent/50"
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const newVal = checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value);
                    onChange(newVal);
                  }}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // ── Date ────────────────────────────────────────────────────────────────
    case "date":
      return (
        <Input
          id={fieldId}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={errorClass}
        />
      );

    // ── Date range ──────────────────────────────────────────────────────────
    case "date_range": {
      const dateRange = (value as { start?: string; end?: string }) || {};
      return (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Start date</Label>
            <Input
              type="date"
              value={dateRange.start ?? ""}
              onChange={(e) =>
                onChange({ ...dateRange, start: e.target.value })
              }
              onBlur={onBlur}
              className={errorClass}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">End date</Label>
            <Input
              type="date"
              value={dateRange.end ?? ""}
              onChange={(e) =>
                onChange({ ...dateRange, end: e.target.value })
              }
              onBlur={onBlur}
              className={errorClass}
            />
          </div>
        </div>
      );
    }

    // ── Yes/No ──────────────────────────────────────────────────────────────
    case "yes_no":
      return (
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor={fieldId} className="text-sm font-medium cursor-pointer">
            {field.label}
            {(field.isRequired || field.validation?.required) && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {value ? "Yes" : "No"}
            </span>
            <Switch
              id={fieldId}
              checked={!!value}
              onCheckedChange={(checked) => onChange(checked)}
            />
          </div>
        </div>
      );

    // ── File upload ─────────────────────────────────────────────────────────
    case "file_upload": {
      const config = (field.config || {}) as {
        accept?: string;
        maxSizeMB?: number;
      };
      return (
        <FileUploadField
          value={(value as string) ?? null}
          onChange={(url) => onChange(url)}
          accept={config.accept}
          maxSizeMB={config.maxSizeMB}
        />
      );
    }

    // ── Signature ───────────────────────────────────────────────────────────
    case "signature":
      return (
        <SignaturePadComponent
          value={(value as string) ?? undefined}
          onChange={(dataUrl) => onChange(dataUrl)}
        />
      );

    // ── Repeating group ─────────────────────────────────────────────────────
    case "repeating_group": {
      const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      const subFields = ((field.config as Record<string, unknown>)?.fields ||
        []) as FieldDefinition[];

      const addItem = () => {
        const emptyItem: Record<string, unknown> = {};
        subFields.forEach((sf) => {
          emptyItem[sf.variable || sf.id] = "";
        });
        onChange([...items, emptyItem]);
      };

      const removeItem = (index: number) => {
        const updated = items.filter((_, i) => i !== index);
        onChange(updated);
      };

      const updateItem = (
        index: number,
        key: string,
        fieldValue: unknown
      ) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [key]: fieldValue };
        onChange(updated);
      };

      return (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-md border p-4 space-y-3 relative"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Entry {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="h-7 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
              {subFields.map((sf) => {
                const key = sf.variable || sf.id;
                return (
                  <div key={sf.id} className="space-y-1">
                    <Label className="text-xs">{sf.label}</Label>
                    <Input
                      type="text"
                      value={(item[key] as string) ?? ""}
                      onChange={(e) => updateItem(index, key, e.target.value)}
                      placeholder={sf.placeholder}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add entry
          </Button>
        </div>
      );
    }

    // ── Address ─────────────────────────────────────────────────────────────
    case "address": {
      const addr = (value as Record<string, string>) || {};

      const updateAddr = (key: string, val: string) => {
        onChange({ ...addr, [key]: val });
      };

      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Street address</Label>
            <Input
              value={addr.street ?? ""}
              onChange={(e) => updateAddr("street", e.target.value)}
              onBlur={onBlur}
              placeholder="123 Main St"
              className={errorClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Input
                value={addr.city ?? ""}
                onChange={(e) => updateAddr("city", e.target.value)}
                onBlur={onBlur}
                placeholder="City"
                className={errorClass}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">State / Province</Label>
              <Input
                value={addr.state ?? ""}
                onChange={(e) => updateAddr("state", e.target.value)}
                onBlur={onBlur}
                placeholder="State"
                className={errorClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ZIP / Postal code</Label>
              <Input
                value={addr.zip ?? ""}
                onChange={(e) => updateAddr("zip", e.target.value)}
                onBlur={onBlur}
                placeholder="12345"
                className={errorClass}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Input
                value={addr.country ?? ""}
                onChange={(e) => updateAddr("country", e.target.value)}
                onBlur={onBlur}
                placeholder="United States"
                className={errorClass}
              />
            </div>
          </div>
        </div>
      );
    }

    // ── Calculated (read-only) ──────────────────────────────────────────────
    case "calculated":
      return (
        <div className="rounded-md border bg-muted/50 p-3">
          <span className="text-sm font-mono">
            {value !== undefined && value !== null && value !== ""
              ? String(value)
              : "—"}
          </span>
        </div>
      );

    // ── Unknown type fallback ───────────────────────────────────────────────
    default:
      return (
        <Input
          id={fieldId}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          className={errorClass}
        />
      );
  }
}

export default FormField;
