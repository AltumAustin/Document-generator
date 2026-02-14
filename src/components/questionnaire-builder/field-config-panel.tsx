"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FIELD_TYPES } from "@/types"
import type { BuilderField } from "./form-canvas"
import { Plus, Trash2, Settings2, GitBranch, X } from "lucide-react"

interface FieldConfigPanelProps {
  field: BuilderField | null
  allFields: BuilderField[]
  onFieldUpdate: (fieldId: string, updates: Partial<BuilderField>) => void
  onOpenConditionalLogic: (fieldId: string) => void
  onClose: () => void
}

interface OptionItem {
  label: string
  value: string
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: OptionItem[]
  onChange: (options: OptionItem[]) => void
}) {
  const addOption = () => {
    const nextIndex = options.length + 1
    onChange([
      ...options,
      { label: `Option ${nextIndex}`, value: `option_${nextIndex}` },
    ])
  }

  const updateOption = (
    index: number,
    key: keyof OptionItem,
    value: string
  ) => {
    const updated = [...options]
    updated[index] = { ...updated[index], [key]: value }
    onChange(updated)
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Options</Label>
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder="Label"
            value={option.label}
            onChange={(e) => updateOption(index, "label", e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Input
            placeholder="Value"
            value={option.value}
            onChange={(e) => updateOption(index, "value", e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeOption(index)}
            disabled={options.length <= 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={addOption}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Option
      </Button>
    </div>
  )
}

function SubFieldsEditor({
  subFields,
  onChange,
}: {
  subFields: BuilderField[]
  onChange: (subFields: BuilderField[]) => void
}) {
  const addSubField = () => {
    const newField: BuilderField = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: "short_text",
      label: `Field ${subFields.length + 1}`,
      variableName: `field_${subFields.length + 1}`,
      required: false,
    }
    onChange([...subFields, newField])
  }

  const updateSubField = (index: number, updates: Partial<BuilderField>) => {
    const updated = [...subFields]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeSubField = (index: number) => {
    onChange(subFields.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Sub-fields</Label>
      {subFields.map((subField, index) => (
        <div key={subField.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
          <div className="flex-1 space-y-1.5">
            <Input
              placeholder="Label"
              value={subField.label}
              onChange={(e) =>
                updateSubField(index, { label: e.target.value })
              }
              className="h-7 text-xs"
            />
            <Select
              value={subField.type}
              onValueChange={(value) =>
                updateSubField(index, { type: value })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.filter(
                  (ft) =>
                    ft.type !== "repeating_group" && ft.type !== "calculated"
                ).map((ft) => (
                  <SelectItem key={ft.id} value={ft.type} className="text-xs">
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeSubField(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={addSubField}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Sub-field
      </Button>
    </div>
  )
}

export function FieldConfigPanel({
  field,
  allFields,
  onFieldUpdate,
  onOpenConditionalLogic,
  onClose,
}: FieldConfigPanelProps) {
  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Settings2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          No field selected
        </h3>
        <p className="text-xs text-muted-foreground/70">
          Click on a field in the canvas to configure it
        </p>
      </div>
    )
  }

  const fieldType = FIELD_TYPES.find((ft) => ft.type === field.type)
  const isSelectType =
    field.type === "single_select" || field.type === "multi_select"
  const isNumberType = field.type === "number" || field.type === "currency"
  const isTextType = field.type === "short_text" || field.type === "long_text"
  const isDateType = field.type === "date" || field.type === "date_range"
  const isCalculated = field.type === "calculated"
  const isRepeatingGroup = field.type === "repeating_group"
  const isFileUpload = field.type === "file_upload"

  const handleUpdate = (updates: Partial<BuilderField>) => {
    onFieldUpdate(field.id, updates)
  }

  const handleValidationUpdate = (
    updates: Partial<NonNullable<BuilderField["validation"]>>
  ) => {
    handleUpdate({
      validation: { ...field.validation, ...updates },
    })
  }

  const handleConfigUpdate = (
    updates: Partial<NonNullable<BuilderField["config"]>>
  ) => {
    handleUpdate({
      config: { ...field.config, ...updates },
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-sm">Field Settings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fieldType?.label || field.type}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Basic Properties */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Basic
          </h4>

          <div className="space-y-1.5">
            <Label htmlFor="field-label" className="text-xs">
              Label
            </Label>
            <Input
              id="field-label"
              value={field.label}
              onChange={(e) => handleUpdate({ label: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="field-variable" className="text-xs">
              Variable Name
            </Label>
            <Input
              id="field-variable"
              value={field.variableName}
              onChange={(e) =>
                handleUpdate({
                  variableName: e.target.value
                    .replace(/[^a-zA-Z0-9_]/g, "_")
                    .toLowerCase(),
                })
              }
              className="h-8 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="field-description" className="text-xs">
              Description
            </Label>
            <Textarea
              id="field-description"
              value={field.description || ""}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              placeholder="Help text shown below the field"
              className="text-sm min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="field-placeholder" className="text-xs">
              Placeholder
            </Label>
            <Input
              id="field-placeholder"
              value={field.placeholder || ""}
              onChange={(e) => handleUpdate({ placeholder: e.target.value })}
              placeholder="Placeholder text"
              className="h-8 text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="field-required" className="text-xs cursor-pointer">
              Required
            </Label>
            <Switch
              id="field-required"
              checked={field.required}
              onCheckedChange={(checked) =>
                handleUpdate({ required: checked })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="field-section" className="text-xs">
              Section
            </Label>
            <Input
              id="field-section"
              value={field.section || ""}
              onChange={(e) =>
                handleUpdate({ section: e.target.value || undefined })
              }
              placeholder="Optional section name"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Separator />

        {/* Type-Specific Options */}
        {(isSelectType || isNumberType || isTextType || isDateType || isCalculated || isRepeatingGroup || isFileUpload) && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Type Settings
            </h4>

            {isSelectType && (
              <OptionsEditor
                options={field.options || [{ label: "Option 1", value: "option_1" }]}
                onChange={(options) => handleUpdate({ options })}
              />
            )}

            {isNumberType && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min Value</Label>
                    <Input
                      type="number"
                      value={field.validation?.min ?? ""}
                      onChange={(e) =>
                        handleValidationUpdate({
                          min: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="h-8 text-sm"
                      placeholder="No min"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Value</Label>
                    <Input
                      type="number"
                      value={field.validation?.max ?? ""}
                      onChange={(e) =>
                        handleValidationUpdate({
                          max: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="h-8 text-sm"
                      placeholder="No max"
                    />
                  </div>
                </div>
              </>
            )}

            {isTextType && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min Length</Label>
                    <Input
                      type="number"
                      value={field.validation?.minLength ?? ""}
                      onChange={(e) =>
                        handleValidationUpdate({
                          minLength: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-8 text-sm"
                      placeholder="No min"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Length</Label>
                    <Input
                      type="number"
                      value={field.validation?.maxLength ?? ""}
                      onChange={(e) =>
                        handleValidationUpdate({
                          maxLength: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="h-8 text-sm"
                      placeholder="No max"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pattern (Regex)</Label>
                  <Input
                    value={field.validation?.pattern || ""}
                    onChange={(e) =>
                      handleValidationUpdate({ pattern: e.target.value })
                    }
                    placeholder="e.g. ^[A-Z].*"
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </>
            )}

            {isDateType && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Date</Label>
                  <Input
                    type="date"
                    value={field.config?.minDate || ""}
                    onChange={(e) =>
                      handleConfigUpdate({ minDate: e.target.value || undefined })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Date</Label>
                  <Input
                    type="date"
                    value={field.config?.maxDate || ""}
                    onChange={(e) =>
                      handleConfigUpdate({ maxDate: e.target.value || undefined })
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {isCalculated && (
              <div className="space-y-1.5">
                <Label className="text-xs">Formula</Label>
                <Textarea
                  value={field.config?.formula || ""}
                  onChange={(e) =>
                    handleConfigUpdate({ formula: e.target.value })
                  }
                  placeholder="e.g. {{field_a}} + {{field_b}} * 0.1"
                  className="text-sm font-mono min-h-[80px] resize-none"
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground">
                  Reference other fields using their variable names in double
                  curly braces.
                </p>
              </div>
            )}

            {isRepeatingGroup && (
              <SubFieldsEditor
                subFields={field.config?.subFields || []}
                onChange={(subFields) =>
                  handleConfigUpdate({ subFields })
                }
              />
            )}

            {isFileUpload && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Accepted File Types</Label>
                  <Input
                    value={
                      field.config?.acceptedFileTypes?.join(", ") || ""
                    }
                    onChange={(e) =>
                      handleConfigUpdate({
                        acceptedFileTypes: e.target.value
                          ? e.target.value.split(",").map((t) => t.trim())
                          : undefined,
                      })
                    }
                    placeholder=".pdf, .docx, .jpg"
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Comma-separated list of file extensions.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max File Size (MB)</Label>
                  <Input
                    type="number"
                    value={field.config?.maxFileSize ?? ""}
                    onChange={(e) =>
                      handleConfigUpdate({
                        maxFileSize: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="10"
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}

            <Separator />
          </div>
        )}

        {/* Validation Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Validation
          </h4>

          <div className="flex items-center justify-between">
            <Label htmlFor="validation-required" className="text-xs cursor-pointer">
              Required
            </Label>
            <Switch
              id="validation-required"
              checked={field.required}
              onCheckedChange={(checked) =>
                handleUpdate({ required: checked })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom Error Message</Label>
            <Input
              value={field.validation?.customMessage || ""}
              onChange={(e) =>
                handleValidationUpdate({ customMessage: e.target.value })
              }
              placeholder="This field is required"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Separator />

        {/* Conditional Logic */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Conditional Logic
          </h4>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-xs"
            onClick={() => onOpenConditionalLogic(field.id)}
          >
            <GitBranch className="h-3.5 w-3.5 mr-1.5" />
            {field.conditionalLogicId
              ? "Edit Conditions"
              : "Show this field when..."}
          </Button>
          {field.conditionalLogicId && (
            <p className="text-[10px] text-muted-foreground">
              This field has conditional display logic configured.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
