"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { ConditionalRule } from "@/types"
import type { BuilderField } from "./form-canvas"
import { Plus, Trash2 } from "lucide-react"

type Operator = ConditionalRule["operator"]

interface ConditionRow {
  id: string
  fieldId: string
  operator: Operator
  value: string | number | boolean
}

interface ConditionalLogicConfig {
  id: string
  targetFieldId: string
  logicOperator: "AND" | "OR"
  conditions: ConditionRow[]
  action: "show" | "hide" | "require"
}

const TEXT_OPERATORS: { value: Operator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
]

const NUMBER_OPERATORS: { value: Operator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
]

const BOOLEAN_OPERATORS: { value: Operator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
]

const SELECT_OPERATORS: { value: Operator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
]

function getOperatorsForFieldType(
  fieldType: string
): { value: Operator; label: string }[] {
  switch (fieldType) {
    case "number":
    case "currency":
      return NUMBER_OPERATORS
    case "yes_no":
      return BOOLEAN_OPERATORS
    case "single_select":
    case "multi_select":
      return SELECT_OPERATORS
    default:
      return TEXT_OPERATORS
  }
}

function isNoValueOperator(operator: Operator): boolean {
  return operator === "is_empty" || operator === "is_not_empty"
}

interface ConditionalLogicBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetFieldId: string
  fields: BuilderField[]
  existingLogic?: ConditionalLogicConfig | null
  onSave: (logic: ConditionalLogicConfig) => void
  onRemove: (targetFieldId: string) => void
}

export function ConditionalLogicBuilder({
  open,
  onOpenChange,
  targetFieldId,
  fields,
  existingLogic,
  onSave,
  onRemove,
}: ConditionalLogicBuilderProps) {
  const [logicOperator, setLogicOperator] = useState<"AND" | "OR">("AND")
  const [action, setAction] = useState<"show" | "hide" | "require">("show")
  const [conditions, setConditions] = useState<ConditionRow[]>([])

  const otherFields = fields.filter((f) => f.id !== targetFieldId)
  const targetField = fields.find((f) => f.id === targetFieldId)

  useEffect(() => {
    if (open) {
      if (existingLogic) {
        setLogicOperator(existingLogic.logicOperator)
        setAction(existingLogic.action)
        setConditions(existingLogic.conditions)
      } else {
        setLogicOperator("AND")
        setAction("show")
        setConditions([
          {
            id: `cond_${Date.now()}`,
            fieldId: otherFields[0]?.id || "",
            operator: "equals",
            value: "",
          },
        ])
      }
    }
  }, [open, existingLogic])

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fieldId: otherFields[0]?.id || "",
        operator: "equals",
        value: "",
      },
    ])
  }

  const updateCondition = (
    index: number,
    updates: Partial<ConditionRow>
  ) => {
    const updated = [...conditions]
    updated[index] = { ...updated[index], ...updates }
    setConditions(updated)
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    const validConditions = conditions.filter((c) => c.fieldId)
    if (validConditions.length === 0) return

    onSave({
      id: existingLogic?.id || `logic_${Date.now()}`,
      targetFieldId,
      logicOperator,
      conditions: validConditions,
      action,
    })
    onOpenChange(false)
  }

  const handleRemove = () => {
    onRemove(targetFieldId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conditional Logic</DialogTitle>
          <DialogDescription>
            Configure when &quot;{targetField?.label || "this field"}&quot;
            should be displayed or required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Action */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Action</Label>
            <Select
              value={action}
              onValueChange={(v) => setAction(v as typeof action)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="show">Show this field</SelectItem>
                <SelectItem value="hide">Hide this field</SelectItem>
                <SelectItem value="require">Require this field</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logic Operator */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              When{" "}
              <button
                type="button"
                className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold text-xs hover:bg-primary/20 transition-colors"
                onClick={() =>
                  setLogicOperator((prev) =>
                    prev === "AND" ? "OR" : "AND"
                  )
                }
              >
                {logicOperator === "AND" ? "ALL" : "ANY"}
              </button>{" "}
              of these conditions are met:
            </Label>
          </div>

          {/* Conditions */}
          <div className="space-y-3">
            {conditions.map((condition, index) => {
              const selectedField = otherFields.find(
                (f) => f.id === condition.fieldId
              )
              const operators = selectedField
                ? getOperatorsForFieldType(selectedField.type)
                : TEXT_OPERATORS
              const showValueInput = !isNoValueOperator(condition.operator)

              // Check if the selected field has options (for select types)
              const hasOptions =
                selectedField &&
                (selectedField.type === "single_select" ||
                  selectedField.type === "multi_select") &&
                selectedField.options &&
                selectedField.options.length > 0

              return (
                <div
                  key={condition.id}
                  className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Field Selection */}
                    <Select
                      value={condition.fieldId}
                      onValueChange={(v) =>
                        updateCondition(index, {
                          fieldId: v,
                          operator: "equals",
                          value: "",
                        })
                      }
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherFields.map((f) => (
                          <SelectItem
                            key={f.id}
                            value={f.id}
                            className="text-xs"
                          >
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Operator Selection */}
                    <Select
                      value={condition.operator}
                      onValueChange={(v) =>
                        updateCondition(index, {
                          operator: v as Operator,
                        })
                      }
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem
                            key={op.value}
                            value={op.value}
                            className="text-xs"
                          >
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Value Input */}
                    {showValueInput && (
                      <>
                        {hasOptions ? (
                          <Select
                            value={String(condition.value)}
                            onValueChange={(v) =>
                              updateCondition(index, { value: v })
                            }
                          >
                            <SelectTrigger className="text-xs h-9">
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedField!.options!.map((opt) => (
                                <SelectItem
                                  key={opt.value}
                                  value={opt.value}
                                  className="text-xs"
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : selectedField?.type === "yes_no" ? (
                          <Select
                            value={String(condition.value)}
                            onValueChange={(v) =>
                              updateCondition(index, {
                                value: v === "true",
                              })
                            }
                          >
                            <SelectTrigger className="text-xs h-9">
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true" className="text-xs">
                                Yes
                              </SelectItem>
                              <SelectItem value="false" className="text-xs">
                                No
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : selectedField?.type === "number" ||
                          selectedField?.type === "currency" ? (
                          <Input
                            type="number"
                            value={String(condition.value)}
                            onChange={(e) =>
                              updateCondition(index, {
                                value: e.target.value
                                  ? Number(e.target.value)
                                  : "",
                              })
                            }
                            placeholder="Value"
                            className="h-9 text-xs"
                          />
                        ) : (
                          <Input
                            value={String(condition.value)}
                            onChange={(e) =>
                              updateCondition(index, {
                                value: e.target.value,
                              })
                            }
                            placeholder="Value"
                            className="h-9 text-xs"
                          />
                        )}
                      </>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCondition(index)}
                    disabled={conditions.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addCondition}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Condition
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {existingLogic && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="mr-auto"
            >
              Remove Logic
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={
              conditions.length === 0 ||
              conditions.every((c) => !c.fieldId)
            }
          >
            Save Conditions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { ConditionalLogicConfig }
