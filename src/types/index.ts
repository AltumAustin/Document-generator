export interface TemplateVariable {
  name: string
  type: "text" | "number" | "date" | "boolean" | "list" | "image"
  description?: string
  defaultValue?: string
  isConditional?: boolean
  isLoop?: boolean
}

export interface FieldType {
  id: string
  type: string
  label: string
  icon: string
  description: string
}

export const FIELD_TYPES: FieldType[] = [
  { id: "short_text", type: "short_text", label: "Short Text", icon: "Type", description: "Single line text input" },
  { id: "long_text", type: "long_text", label: "Long Text", icon: "AlignLeft", description: "Multi-line text area" },
  { id: "email", type: "email", label: "Email", icon: "Mail", description: "Email address input" },
  { id: "phone", type: "phone", label: "Phone", icon: "Phone", description: "Phone number input" },
  { id: "number", type: "number", label: "Number", icon: "Hash", description: "Numeric input" },
  { id: "currency", type: "currency", label: "Currency", icon: "DollarSign", description: "Currency amount input" },
  { id: "single_select", type: "single_select", label: "Single Select", icon: "CircleDot", description: "Dropdown or radio selection" },
  { id: "multi_select", type: "multi_select", label: "Multi Select", icon: "CheckSquare", description: "Multiple choice checkboxes" },
  { id: "date", type: "date", label: "Date", icon: "Calendar", description: "Date picker" },
  { id: "date_range", type: "date_range", label: "Date Range", icon: "CalendarRange", description: "Start and end date" },
  { id: "yes_no", type: "yes_no", label: "Yes/No", icon: "ToggleLeft", description: "Boolean toggle" },
  { id: "file_upload", type: "file_upload", label: "File Upload", icon: "Upload", description: "File attachment" },
  { id: "signature", type: "signature", label: "Signature", icon: "PenTool", description: "Signature capture" },
  { id: "repeating_group", type: "repeating_group", label: "Repeating Group", icon: "Repeat", description: "Add multiple entries" },
  { id: "address", type: "address", label: "Address", icon: "MapPin", description: "Address with fields" },
  { id: "calculated", type: "calculated", label: "Calculated", icon: "Calculator", description: "Formula-based field" },
]

export interface ConditionalRule {
  id: string
  fieldId: string
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty"
  value: string | number | boolean
  logicOperator?: "AND" | "OR"
}

export interface QuestionnaireSettings {
  allowSave: boolean
  showProgressBar: boolean
  requireEmail: boolean
  submitButtonText: string
  confirmationMessage: string
  redirectUrl?: string
  notifyOnSubmission: boolean
  notificationEmails: string[]
}

export const DEFAULT_QUESTIONNAIRE_SETTINGS: QuestionnaireSettings = {
  allowSave: true,
  showProgressBar: true,
  requireEmail: false,
  submitButtonText: "Submit",
  confirmationMessage: "Thank you! Your response has been submitted.",
  notifyOnSubmission: true,
  notificationEmails: [],
}
