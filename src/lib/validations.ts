import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters"),
})

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.string().default("General"),
})

export const questionnaireSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  templateId: z.string().optional(),
})

export const fieldSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1, "Label is required"),
  variable: z.string().min(1, "Variable name is required"),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  validation: z.object({
    required: z.boolean().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    customMessage: z.string().optional(),
  }).default({}),
  defaultValue: z.string().optional(),
  section: z.string().default("default"),
  order: z.number().default(0),
  isRequired: z.boolean().default(false),
  config: z.record(z.unknown()).default({}),
})

export const conditionalLogicSchema = z.object({
  fieldId: z.string().optional(),
  conditions: z.array(z.object({
    fieldId: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
    value: z.union([z.string(), z.number(), z.boolean()]),
    logicOperator: z.enum(["AND", "OR"]).optional(),
  })),
  action: z.enum(["show", "hide", "require", "skip_section"]),
  targetFieldId: z.string().optional(),
})

export const sharedLinkSchema = z.object({
  questionnaireId: z.string(),
  expiresAt: z.string().datetime().optional(),
  branding: z.object({
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
    companyName: z.string().optional(),
  }).default({}),
  maxResponses: z.number().positive().optional(),
})

export const responseSchema = z.object({
  questionnaireId: z.string(),
  answers: z.record(z.unknown()),
  respondentEmail: z.string().email().optional(),
  respondentName: z.string().optional(),
})

export const signatureRequestSchema = z.object({
  documentId: z.string(),
  signerEmail: z.string().email(),
  signerName: z.string().optional(),
  message: z.string().optional(),
})

export const apiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  permissions: z.array(z.string()).default(["read"]),
})

export const webhookSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "At least one event is required"),
})

export const teamInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type TemplateInput = z.infer<typeof templateSchema>
export type QuestionnaireInput = z.infer<typeof questionnaireSchema>
export type FieldInput = z.infer<typeof fieldSchema>
export type ConditionalLogicInput = z.infer<typeof conditionalLogicSchema>
export type SharedLinkInput = z.infer<typeof sharedLinkSchema>
export type ResponseInput = z.infer<typeof responseSchema>
export type SignatureRequestInput = z.infer<typeof signatureRequestSchema>
export type ApiKeyInput = z.infer<typeof apiKeySchema>
export type WebhookInput = z.infer<typeof webhookSchema>
export type TeamInviteInput = z.infer<typeof teamInviteSchema>
