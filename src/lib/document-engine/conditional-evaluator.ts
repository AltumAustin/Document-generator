import { ConditionalRule } from "@/types"

export function evaluateConditions(
  conditions: ConditionalRule[],
  answers: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true

  let result = evaluateSingleCondition(conditions[0], answers)

  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i]
    const prevOperator = conditions[i - 1].logicOperator || "AND"
    const condResult = evaluateSingleCondition(condition, answers)

    if (prevOperator === "OR") {
      result = result || condResult
    } else {
      result = result && condResult
    }
  }

  return result
}

function evaluateSingleCondition(
  condition: ConditionalRule,
  answers: Record<string, unknown>
): boolean {
  const fieldValue = answers[condition.fieldId]
  const targetValue = condition.value

  switch (condition.operator) {
    case "equals":
      return isEqual(fieldValue, targetValue)

    case "not_equals":
      return !isEqual(fieldValue, targetValue)

    case "contains": {
      const strValue = String(fieldValue || "").toLowerCase()
      const strTarget = String(targetValue).toLowerCase()
      return strValue.includes(strTarget)
    }

    case "not_contains": {
      const strValue = String(fieldValue || "").toLowerCase()
      const strTarget = String(targetValue).toLowerCase()
      return !strValue.includes(strTarget)
    }

    case "greater_than": {
      const numValue = toNumber(fieldValue)
      const numTarget = toNumber(targetValue)
      return numValue > numTarget
    }

    case "less_than": {
      const numValue = toNumber(fieldValue)
      const numTarget = toNumber(targetValue)
      return numValue < numTarget
    }

    case "is_empty":
      return isEmpty(fieldValue)

    case "is_not_empty":
      return !isEmpty(fieldValue)

    default:
      return true
  }
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  // Boolean comparisons
  if (typeof a === "boolean" || typeof b === "boolean") {
    const aBool = toBool(a)
    const bBool = toBool(b)
    return aBool === bBool
  }

  // Number comparisons
  if (typeof a === "number" || typeof b === "number") {
    return toNumber(a) === toNumber(b)
  }

  // String comparison (case-insensitive)
  return String(a || "").toLowerCase() === String(b || "").toLowerCase()
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value.toLowerCase() === "yes" || value === "1"
  }
  if (typeof value === "number") return value !== 0
  return false
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  return false
}
