"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { BuilderField } from "./form-canvas"
import {
  Upload,
  PenTool,
  Plus,
  MapPin,
  Calculator,
  CalendarRange,
} from "lucide-react"

interface FieldPreviewProps {
  field: BuilderField
}

function FieldLabel({ field }: { field: BuilderField }) {
  return (
    <div className="mb-1.5">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {field.description && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {field.description}
        </p>
      )}
    </div>
  )
}

function ShortTextPreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <Input
        placeholder={field.placeholder || "Enter text..."}
        disabled
        className="bg-muted/30"
      />
    </div>
  )
}

function LongTextPreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <Textarea
        placeholder={field.placeholder || "Enter text..."}
        disabled
        className="bg-muted/30 min-h-[80px] resize-none"
        rows={3}
      />
    </div>
  )
}

function EmailPreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <Input
        type="email"
        placeholder={field.placeholder || "email@example.com"}
        disabled
        className="bg-muted/30"
      />
    </div>
  )
}

function PhonePreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <Input
        type="tel"
        placeholder={field.placeholder || "+1 (555) 000-0000"}
        disabled
        className="bg-muted/30"
      />
    </div>
  )
}

function NumberPreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <Input
        type="number"
        placeholder={field.placeholder || "0"}
        disabled
        className="bg-muted/30"
      />
    </div>
  )
}

function CurrencyPreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          type="number"
          placeholder={field.placeholder || "0.00"}
          disabled
          className="bg-muted/30 pl-7"
        />
      </div>
    </div>
  )
}

function SingleSelectPreview({ field }: FieldPreviewProps) {
  const options = field.options || []
  return (
    <div>
      <FieldLabel field={field} />
      <Select disabled>
        <SelectTrigger className="bg-muted/30">
          <SelectValue placeholder={field.placeholder || "Select an option..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function MultiSelectPreview({ field }: FieldPreviewProps) {
  const options = field.options || []
  return (
    <div>
      <FieldLabel field={field} />
      <div className="space-y-2">
        {options.length > 0 ? (
          options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox disabled />
              <span className="text-sm text-muted-foreground">{opt.label}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2">
            <Checkbox disabled />
            <span className="text-sm text-muted-foreground">Option 1</span>
          </div>
        )}
      </div>
    </div>
  )
}

function DatePreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <Input
        type="date"
        disabled
        className="bg-muted/30"
      />
    </div>
  )
}

function DateRangePreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Start Date
          </Label>
          <Input type="date" disabled className="bg-muted/30" />
        </div>
        <CalendarRange className="h-4 w-4 text-muted-foreground mt-5 flex-shrink-0" />
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">
            End Date
          </Label>
          <Input type="date" disabled className="bg-muted/30" />
        </div>
      </div>
    </div>
  )
}

function YesNoPreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-3">
        <Switch disabled />
        <span className="text-sm text-muted-foreground">No</span>
      </div>
    </div>
  )
}

function FileUploadPreview({ field }: FieldPreviewProps) {
  const acceptedTypes = field.config?.acceptedFileTypes?.join(", ") || "Any file"
  const maxSize = field.config?.maxFileSize
    ? `${field.config.maxFileSize}MB max`
    : ""

  return (
    <div>
      <FieldLabel field={field} />
      <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/20">
        <Upload className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {acceptedTypes}
          {maxSize && ` (${maxSize})`}
        </p>
      </div>
    </div>
  )
}

function SignaturePreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/20">
        <PenTool className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Click to sign
        </p>
      </div>
    </div>
  )
}

function RepeatingGroupPreview({ field }: FieldPreviewProps) {
  const subFields = field.config?.subFields || []

  return (
    <div>
      <FieldLabel field={field} />
      <div className="border rounded-lg p-4 bg-muted/10 space-y-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Entry 1
        </div>
        {subFields.length > 0 ? (
          subFields.map((sf) => (
            <div key={sf.id}>
              <Label className="text-xs text-muted-foreground mb-1 block">
                {sf.label}
                {sf.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Input disabled className="bg-muted/30 h-8" placeholder={sf.placeholder || ""} />
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            No sub-fields configured. Add fields in the settings panel.
          </p>
        )}
        <Separator />
        <Button variant="outline" size="sm" disabled className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Entry
        </Button>
      </div>
    </div>
  )
}

function AddressPreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Street Address
          </Label>
          <Input disabled className="bg-muted/30" placeholder="123 Main St" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Address Line 2
          </Label>
          <Input disabled className="bg-muted/30" placeholder="Apt, Suite, etc." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              City
            </Label>
            <Input disabled className="bg-muted/30" placeholder="City" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              State / Province
            </Label>
            <Input disabled className="bg-muted/30" placeholder="State" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              ZIP / Postal Code
            </Label>
            <Input disabled className="bg-muted/30" placeholder="12345" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Country
            </Label>
            <Input disabled className="bg-muted/30" placeholder="Country" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CalculatedPreview({ field }: FieldPreviewProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/20">
        <Calculator className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">
            Calculated value
          </p>
          {field.config?.formula && (
            <p className="text-xs text-muted-foreground/70 font-mono truncate mt-0.5">
              {field.config.formula}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const PREVIEW_MAP: Record<string, React.FC<FieldPreviewProps>> = {
  short_text: ShortTextPreview,
  long_text: LongTextPreview,
  email: EmailPreview,
  phone: PhonePreview,
  number: NumberPreview,
  currency: CurrencyPreview,
  single_select: SingleSelectPreview,
  multi_select: MultiSelectPreview,
  date: DatePreview,
  date_range: DateRangePreview,
  yes_no: YesNoPreview,
  file_upload: FileUploadPreview,
  signature: SignaturePreview,
  repeating_group: RepeatingGroupPreview,
  address: AddressPreview,
  calculated: CalculatedPreview,
}

export function FieldPreview({ field }: FieldPreviewProps) {
  const PreviewComponent = PREVIEW_MAP[field.type]

  if (!PreviewComponent) {
    return (
      <div className="p-3 rounded-lg border border-dashed">
        <FieldLabel field={field} />
        <p className="text-xs text-muted-foreground">
          No preview available for field type: {field.type}
        </p>
      </div>
    )
  }

  return <PreviewComponent field={field} />
}
