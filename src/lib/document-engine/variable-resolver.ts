import { format as formatDate } from "date-fns"
import numeral from "numeral"
import { spellOutCurrency, formatLegalDate } from "./number-formatter"

interface FieldDefinition {
  variable: string
  type: string
  config?: Record<string, unknown>
  options?: Array<{ label: string; value: string }>
}

export function resolveVariables(
  answers: Record<string, unknown>,
  fields: FieldDefinition[]
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}

  for (const field of fields) {
    const rawValue = answers[field.variable]

    if (rawValue === undefined || rawValue === null) {
      resolved[field.variable] = ""
      continue
    }

    switch (field.type) {
      case "date":
      case "date_range": {
        if (typeof rawValue === "string" && rawValue) {
          try {
            const date = new Date(rawValue)
            resolved[field.variable] = formatDate(date, "MMMM d, yyyy")
            resolved[`${field.variable}_legal`] = formatLegalDate(rawValue)
            resolved[`${field.variable}_short`] = formatDate(date, "MM/dd/yyyy")
          } catch {
            resolved[field.variable] = rawValue
          }
        } else {
          resolved[field.variable] = rawValue
        }
        break
      }

      case "currency": {
        const num = typeof rawValue === "string" ? parseFloat(rawValue) : rawValue
        if (typeof num === "number" && !isNaN(num)) {
          resolved[field.variable] = numeral(num).format("$0,0.00")
          resolved[`${field.variable}_raw`] = num
          resolved[`${field.variable}_spelled`] = spellOutCurrency(num)
        } else {
          resolved[field.variable] = rawValue
        }
        break
      }

      case "number": {
        const numVal = typeof rawValue === "string" ? parseFloat(rawValue) : rawValue
        if (typeof numVal === "number" && !isNaN(numVal)) {
          resolved[field.variable] = numVal
          resolved[`${field.variable}_formatted`] = numeral(numVal).format("0,0")
        } else {
          resolved[field.variable] = rawValue
        }
        break
      }

      case "yes_no": {
        const boolVal = rawValue === true || rawValue === "true" || rawValue === "yes"
        resolved[field.variable] = boolVal
        resolved[`${field.variable}_text`] = boolVal ? "Yes" : "No"
        break
      }

      case "single_select": {
        resolved[field.variable] = rawValue
        if (field.options && typeof rawValue === "string") {
          const opt = field.options.find((o) => o.value === rawValue)
          resolved[`${field.variable}_label`] = opt ? opt.label : rawValue
        }
        break
      }

      case "multi_select": {
        if (Array.isArray(rawValue)) {
          resolved[field.variable] = rawValue
          resolved[`${field.variable}_joined`] = rawValue.join(", ")
          if (field.options) {
            const labels = rawValue.map((v) => {
              const opt = field.options?.find((o) => o.value === String(v))
              return opt ? opt.label : String(v)
            })
            resolved[`${field.variable}_labels`] = labels.join(", ")
          }
        } else {
          resolved[field.variable] = rawValue
        }
        break
      }

      case "repeating_group": {
        if (Array.isArray(rawValue)) {
          resolved[field.variable] = rawValue
        } else {
          resolved[field.variable] = []
        }
        break
      }

      case "address": {
        if (typeof rawValue === "object" && rawValue !== null) {
          const addr = rawValue as Record<string, string>
          resolved[field.variable] = rawValue
          const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean)
          resolved[`${field.variable}_full`] = parts.join(", ")
        } else {
          resolved[field.variable] = rawValue
        }
        break
      }

      case "calculated": {
        const formula = field.config?.formula as string | undefined
        if (formula) {
          try {
            resolved[field.variable] = evaluateFormula(formula, answers)
          } catch {
            resolved[field.variable] = rawValue
          }
        } else {
          resolved[field.variable] = rawValue
        }
        break
      }

      case "signature": {
        resolved[field.variable] = rawValue
        break
      }

      default: {
        resolved[field.variable] = rawValue
        break
      }
    }
  }

  return resolved
}

function evaluateFormula(
  formula: string,
  answers: Record<string, unknown>
): number {
  let expression = formula

  const varPattern = /\{(\w+)\}/g
  let match: RegExpExecArray | null

  while ((match = varPattern.exec(formula)) !== null) {
    const varName = match[1]
    const val = answers[varName]
    const numVal = typeof val === "number" ? val : parseFloat(String(val || "0"))
    expression = expression.replace(match[0], String(isNaN(numVal) ? 0 : numVal))
  }

  // Only allow safe math operations
  if (/^[\d\s+\-*/().]+$/.test(expression)) {
    return Function(`"use strict"; return (${expression})`)() as number
  }

  return 0
}
