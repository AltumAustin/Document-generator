"use client"

import React from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FIELD_TYPES } from "@/types"
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  DollarSign,
  CircleDot,
  CheckSquare,
  Calendar,
  CalendarRange,
  ToggleLeft,
  Upload,
  PenTool,
  Repeat,
  MapPin,
  Calculator,
  GripVertical,
  Trash2,
  Inbox,
} from "lucide-react"

const ICON_MAP: Record<string, React.ElementType> = {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  DollarSign,
  CircleDot,
  CheckSquare,
  Calendar,
  CalendarRange,
  ToggleLeft,
  Upload,
  PenTool,
  Repeat,
  MapPin,
  Calculator,
}

export interface BuilderField {
  id: string
  type: string
  label: string
  variableName: string
  description?: string
  placeholder?: string
  required: boolean
  section?: string
  options?: { label: string; value: string }[]
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    customMessage?: string
  }
  config?: {
    formula?: string
    acceptedFileTypes?: string[]
    maxFileSize?: number
    minDate?: string
    maxDate?: string
    subFields?: BuilderField[]
  }
  conditionalLogicId?: string
}

interface SortableFieldItemProps {
  field: BuilderField
  isSelected: boolean
  onSelect: (fieldId: string) => void
  onDelete: (fieldId: string) => void
}

function SortableFieldItem({
  field,
  isSelected,
  onSelect,
  onDelete,
}: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const fieldType = FIELD_TYPES.find((ft) => ft.type === field.type)
  const IconComponent = fieldType ? ICON_MAP[fieldType.icon] : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-lg border bg-background p-3 transition-all cursor-pointer ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
          : "border-border hover:border-muted-foreground/30 hover:shadow-sm"
      } ${isDragging ? "opacity-50 shadow-lg" : ""}`}
      onClick={() => onSelect(field.id)}
    >
      <div
        className="flex-shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {IconComponent && (
        <div className="flex-shrink-0 rounded-md bg-muted p-1.5">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{field.label}</span>
          {field.required && (
            <span className="text-red-500 text-sm font-bold" title="Required">
              *
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {fieldType?.label || field.type}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono truncate">
            {`{{${field.variableName}}}`}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(field.id)
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface FormCanvasProps {
  fields: BuilderField[]
  selectedFieldId: string | null
  onSelectField: (fieldId: string | null) => void
  onDeleteField: (fieldId: string) => void
}

export function FormCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
}: FormCanvasProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "form-canvas",
  })

  const fieldIds = fields.map((f) => f.id)

  // Group fields by section
  const sections: { section: string | null; fields: BuilderField[] }[] = []
  let currentSection: string | null = null

  for (const field of fields) {
    const fieldSection = field.section || null
    if (fieldSection !== currentSection) {
      currentSection = fieldSection
      sections.push({ section: fieldSection, fields: [field] })
    } else {
      sections[sections.length - 1].fields.push(field)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[400px] rounded-lg border-2 border-dashed transition-colors p-4 ${
        isOver
          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
          : "border-border"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectField(null)
        }
      }}
    >
      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            No fields yet
          </h3>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            Drag fields from the palette to build your questionnaire
          </p>
        </div>
      ) : (
        <SortableContext
          items={fieldIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sections.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                {section.section && (
                  <div className="flex items-center gap-3 pt-4 pb-2 first:pt-0">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.section}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                {section.fields.map((field) => (
                  <SortableFieldItem
                    key={field.id}
                    field={field}
                    isSelected={selectedFieldId === field.id}
                    onSelect={onSelectField}
                    onDelete={onDeleteField}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  )
}
