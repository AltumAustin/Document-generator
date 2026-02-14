"use client"

import React, { useState, useMemo } from "react"
import { useDraggable } from "@dnd-kit/core"
import { Input } from "@/components/ui/input"
import { FIELD_TYPES, type FieldType } from "@/types"
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
  Search,
  GripVertical,
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

interface FieldCategory {
  name: string
  types: string[]
}

const CATEGORIES: FieldCategory[] = [
  {
    name: "Text Inputs",
    types: ["short_text", "long_text", "email", "phone"],
  },
  {
    name: "Selection",
    types: ["single_select", "multi_select", "yes_no"],
  },
  {
    name: "Date & Time",
    types: ["date", "date_range"],
  },
  {
    name: "Special",
    types: ["number", "currency", "file_upload", "signature", "repeating_group", "address", "calculated"],
  },
]

interface DraggableFieldItemProps {
  fieldType: FieldType
}

function DraggableFieldItem({ fieldType }: DraggableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${fieldType.id}`,
      data: {
        type: "palette-item",
        fieldType,
      },
    })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined

  const IconComponent = ICON_MAP[fieldType.icon]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 rounded-md border border-border bg-background p-2.5 cursor-grab transition-colors hover:bg-accent hover:border-accent-foreground/20 ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      {IconComponent && (
        <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{fieldType.label}</span>
        <span className="text-xs text-muted-foreground truncate">
          {fieldType.description}
        </span>
      </div>
    </div>
  )
}

export function FieldPalette() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    if (!query) {
      return CATEGORIES.map((category) => ({
        ...category,
        fieldTypes: category.types
          .map((typeId) => FIELD_TYPES.find((ft) => ft.id === typeId))
          .filter(Boolean) as FieldType[],
      }))
    }

    return CATEGORIES.map((category) => ({
      ...category,
      fieldTypes: category.types
        .map((typeId) => FIELD_TYPES.find((ft) => ft.id === typeId))
        .filter(
          (ft): ft is FieldType =>
            ft !== undefined &&
            (ft.label.toLowerCase().includes(query) ||
              ft.description.toLowerCase().includes(query))
        ),
    })).filter((category) => category.fieldTypes.length > 0)
  }, [searchQuery])

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-3">Field Types</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {filteredCategories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No fields match your search.
          </p>
        )}

        {filteredCategories.map((category) => (
          <div key={category.name}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {category.name}
            </h4>
            <div className="space-y-1.5">
              {category.fieldTypes.map((fieldType) => (
                <DraggableFieldItem key={fieldType.id} fieldType={fieldType} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
