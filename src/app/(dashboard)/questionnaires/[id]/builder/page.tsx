"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { FIELD_TYPES, type FieldType } from "@/types"
import { FieldPalette } from "@/components/questionnaire-builder/field-palette"
import {
  FormCanvas,
  type BuilderField,
} from "@/components/questionnaire-builder/form-canvas"
import { FieldConfigPanel } from "@/components/questionnaire-builder/field-config-panel"
import {
  ConditionalLogicBuilder,
  type ConditionalLogicConfig,
} from "@/components/questionnaire-builder/conditional-logic-builder"
import { FieldPreview } from "@/components/questionnaire-builder/field-preview"
import {
  Save,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react"

interface QuestionnaireData {
  id: string
  name: string
  description?: string
  fields: BuilderField[]
}

export default function QuestionnaireBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const questionnaireId = params.id as string

  // State
  const [questionnaire, setQuestionnaire] =
    useState<QuestionnaireData | null>(null)
  const [fields, setFields] = useState<BuilderField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [conditionalLogic, setConditionalLogic] = useState<
    ConditionalLogicConfig[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [showPreview, setShowPreview] = useState(false)
  const [conditionalLogicOpen, setConditionalLogicOpen] = useState(false)
  const [conditionalLogicTargetFieldId, setConditionalLogicTargetFieldId] =
    useState<string>("")
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // Refs for auto-save debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fieldsRef = useRef(fields)
  fieldsRef.current = fields

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Fetch questionnaire data on mount
  useEffect(() => {
    async function fetchQuestionnaire() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/questionnaires/${questionnaireId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch questionnaire")
        }
        const data: QuestionnaireData = await response.json()
        setQuestionnaire(data)
        setFields(data.fields || [])
      } catch (error) {
        console.error("Error fetching questionnaire:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (questionnaireId) {
      fetchQuestionnaire()
    }
  }, [questionnaireId])

  // Save fields to API
  const saveFields = useCallback(
    async (fieldsToSave: BuilderField[]) => {
      try {
        setIsSaving(true)
        setSaveStatus("saving")

        const response = await fetch(
          `/api/questionnaires/${questionnaireId}/fields`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: fieldsToSave }),
          }
        )

        if (!response.ok) {
          throw new Error("Failed to save fields")
        }

        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      } catch (error) {
        console.error("Error saving fields:", error)
        setSaveStatus("error")
      } finally {
        setIsSaving(false)
      }
    },
    [questionnaireId]
  )

  // Auto-save on field changes (debounced)
  useEffect(() => {
    if (isLoading || fields.length === 0) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveFields(fieldsRef.current)
    }, 2000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [fields, isLoading, saveFields])

  // Manual save
  const handleManualSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveFields(fields)
  }

  // Generate a unique variable name from a label
  const generateVariableName = (label: string): string => {
    const base = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")

    const existingNames = fields.map((f) => f.variableName)
    let name = base || "field"
    let counter = 1
    while (existingNames.includes(name)) {
      name = `${base}_${counter}`
      counter++
    }
    return name
  }

  // Create a new field from a field type
  const createFieldFromType = (fieldType: FieldType): BuilderField => {
    const id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const variableName = generateVariableName(fieldType.label)

    const newField: BuilderField = {
      id,
      type: fieldType.type,
      label: fieldType.label,
      variableName,
      required: false,
    }

    // Add default options for select fields
    if (
      fieldType.type === "single_select" ||
      fieldType.type === "multi_select"
    ) {
      newField.options = [
        { label: "Option 1", value: "option_1" },
        { label: "Option 2", value: "option_2" },
        { label: "Option 3", value: "option_3" },
      ]
    }

    return newField
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Check if dragging from palette
    if (activeId.startsWith("palette-")) {
      const fieldTypeData = active.data.current?.fieldType as
        | FieldType
        | undefined
      if (!fieldTypeData) return

      const newField = createFieldFromType(fieldTypeData)

      if (overId === "form-canvas") {
        // Drop on canvas - add to end
        setFields((prev) => [...prev, newField])
      } else {
        // Drop on existing field - insert before it
        const overIndex = fields.findIndex((f) => f.id === overId)
        if (overIndex >= 0) {
          setFields((prev) => {
            const updated = [...prev]
            updated.splice(overIndex, 0, newField)
            return updated
          })
        } else {
          setFields((prev) => [...prev, newField])
        }
      }

      // Select the newly added field
      setSelectedFieldId(newField.id)
      return
    }

    // Reordering existing fields
    if (activeId !== overId && overId !== "form-canvas") {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === activeId)
        const newIndex = prev.findIndex((f) => f.id === overId)
        if (oldIndex === -1 || newIndex === -1) return prev
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  // Field management
  const handleSelectField = (fieldId: string | null) => {
    setSelectedFieldId(fieldId)
  }

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId))
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null)
    }
    // Remove any conditional logic targeting this field
    setConditionalLogic((prev) =>
      prev.filter((cl) => cl.targetFieldId !== fieldId)
    )
  }

  const handleFieldUpdate = (
    fieldId: string,
    updates: Partial<BuilderField>
  ) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    )
  }

  // Conditional logic
  const handleOpenConditionalLogic = (fieldId: string) => {
    setConditionalLogicTargetFieldId(fieldId)
    setConditionalLogicOpen(true)
  }

  const handleSaveConditionalLogic = (logic: ConditionalLogicConfig) => {
    setConditionalLogic((prev) => {
      const existing = prev.findIndex(
        (cl) => cl.targetFieldId === logic.targetFieldId
      )
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = logic
        return updated
      }
      return [...prev, logic]
    })
    // Mark the field as having conditional logic
    handleFieldUpdate(logic.targetFieldId, {
      conditionalLogicId: logic.id,
    })
  }

  const handleRemoveConditionalLogic = (targetFieldId: string) => {
    setConditionalLogic((prev) =>
      prev.filter((cl) => cl.targetFieldId !== targetFieldId)
    )
    handleFieldUpdate(targetFieldId, { conditionalLogicId: undefined })
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null
  const existingLogicForTarget = conditionalLogic.find(
    (cl) => cl.targetFieldId === conditionalLogicTargetFieldId
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading questionnaire...
          </p>
        </div>
      </div>
    )
  }

  if (!questionnaire) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">
            Questionnaire not found
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The questionnaire you are looking for does not exist or you do not
            have access.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/questionnaires")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Questionnaires
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-background">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(`/questionnaires/${questionnaireId}`)
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{questionnaire.name}</h1>
            <p className="text-xs text-muted-foreground">
              {fields.length} field{fields.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-600">Save failed</span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4 mr-1.5" />
            ) : (
              <Eye className="h-4 w-4 mr-1.5" />
            )}
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>

          <Button
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Left Panel - Field Palette */}
          <div className="w-72 border-r bg-background overflow-hidden flex-shrink-0">
            <FieldPalette />
          </div>

          {/* Center Panel - Form Canvas or Preview */}
          <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
            {showPreview ? (
              <div className="max-w-2xl mx-auto">
                <div className="bg-background rounded-lg border shadow-sm p-6 space-y-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold">
                      {questionnaire.name}
                    </h2>
                    {questionnaire.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {questionnaire.description}
                      </p>
                    )}
                  </div>
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No fields to preview. Add fields in the builder.
                    </p>
                  ) : (
                    fields.map((field) => (
                      <FieldPreview key={field.id} field={field} />
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <FormCanvas
                  fields={fields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={handleSelectField}
                  onDeleteField={handleDeleteField}
                />
              </div>
            )}
          </div>

          <DragOverlay>
            {activeDragId && activeDragId.startsWith("palette-") ? (
              <div className="flex items-center gap-2 rounded-md border bg-background p-2.5 shadow-lg opacity-90">
                <span className="text-sm font-medium">
                  {
                    FIELD_TYPES.find(
                      (ft) =>
                        `palette-${ft.id}` === activeDragId
                    )?.label
                  }
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Right Panel - Field Configuration */}
        <div className="w-80 border-l bg-background overflow-hidden flex-shrink-0">
          <FieldConfigPanel
            field={selectedField}
            allFields={fields}
            onFieldUpdate={handleFieldUpdate}
            onOpenConditionalLogic={handleOpenConditionalLogic}
            onClose={() => setSelectedFieldId(null)}
          />
        </div>
      </div>

      {/* Conditional Logic Dialog */}
      <ConditionalLogicBuilder
        open={conditionalLogicOpen}
        onOpenChange={setConditionalLogicOpen}
        targetFieldId={conditionalLogicTargetFieldId}
        fields={fields}
        existingLogic={existingLogicForTarget || null}
        onSave={handleSaveConditionalLogic}
        onRemove={handleRemoveConditionalLogic}
      />
    </div>
  )
}
