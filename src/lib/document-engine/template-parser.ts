import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import type { TemplateVariable } from "@/types"

/**
 * Regex patterns for extracting template tags from docx content.
 *
 * SIMPLE_VAR matches standalone variables like {{firstName}}
 * CONDITIONAL_OPEN matches {{#if conditionName}}
 * CONDITIONAL_CLOSE matches {{/if conditionName}} or {{/if}}
 * LOOP_OPEN matches {{#each items}} or {{#items}}
 * LOOP_CLOSE matches {{/each items}} or {{/items}}
 * ALL_TAGS matches any {{...}} tag for general extraction
 */
const SIMPLE_VAR_RE = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
const CONDITIONAL_OPEN_RE = /\{\{#if\s+([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
const CONDITIONAL_CLOSE_RE = /\{\{\/if(?:\s+[a-zA-Z_][a-zA-Z0-9_.]*)?\}\}/g
const LOOP_OPEN_RE = /\{\{#(?:each\s+)?([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
const LOOP_CLOSE_RE = /\{\{\/(?:each\s+)?([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
const ALL_TAGS_RE = /\{\{([^}]+)\}\}/g

/**
 * Set of tag prefixes that are control-flow markers rather than variable names.
 */
const CONTROL_PREFIXES = ["#if", "/if", "#each", "/each", "#", "/"]

/**
 * Infer the TemplateVariable type from the variable name using naming conventions.
 * For example, names containing "date" suggest a date type, "amount" or "price"
 * suggest a number type, etc.
 */
function inferVariableType(
  name: string
): TemplateVariable["type"] {
  const lower = name.toLowerCase()

  if (lower.includes("date") || lower.includes("dob") || lower.includes("born")) {
    return "date"
  }
  if (
    lower.includes("amount") ||
    lower.includes("price") ||
    lower.includes("total") ||
    lower.includes("quantity") ||
    lower.includes("count") ||
    lower.includes("number") ||
    lower.includes("rate") ||
    lower.includes("percentage") ||
    lower.includes("age")
  ) {
    return "number"
  }
  if (
    lower.includes("is_") ||
    lower.includes("has_") ||
    lower.includes("show") ||
    lower.includes("enable") ||
    lower.includes("active") ||
    lower.includes("approved")
  ) {
    return "boolean"
  }
  if (
    lower.includes("items") ||
    lower.includes("list") ||
    lower.includes("entries") ||
    lower.includes("rows")
  ) {
    return "list"
  }
  if (
    lower.includes("signature") ||
    lower.includes("logo") ||
    lower.includes("image") ||
    lower.includes("photo")
  ) {
    return "image"
  }

  return "text"
}

/**
 * Check whether a tag string is a control-flow directive rather than a variable reference.
 */
function isControlTag(tag: string): boolean {
  const trimmed = tag.trim()
  for (const prefix of CONTROL_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return true
    }
  }
  return false
}

/**
 * Extract the raw XML content from a .docx buffer so we can scan for template tags.
 * Docxtemplater normally processes these, but we want to discover them before rendering.
 */
function extractXmlContent(buffer: Buffer): string {
  const zip = new PizZip(buffer)
  const contentParts: string[] = []

  // The main document body
  const docXml = zip.file("word/document.xml")
  if (docXml) {
    contentParts.push(docXml.asText())
  }

  // Headers and footers can also contain template tags
  const headerFooterPattern = /^word\/(header|footer)\d+\.xml$/
  const files = zip.files
  for (const relativePath of Object.keys(files)) {
    if (headerFooterPattern.test(relativePath)) {
      contentParts.push(files[relativePath].asText())
    }
  }

  return contentParts.join("\n")
}

/**
 * Collect all conditional ({{#if ...}}) variable names from the XML text.
 */
function collectConditionalNames(xml: string): Set<string> {
  const names = new Set<string>()
  let match: RegExpExecArray | null

  CONDITIONAL_OPEN_RE.lastIndex = 0
  while ((match = CONDITIONAL_OPEN_RE.exec(xml)) !== null) {
    names.add(match[1])
  }
  return names
}

/**
 * Collect all loop ({{#each ...}} or {{#...}}) variable names from the XML text.
 * We need to distinguish loops from conditionals -- anything in the loop regex
 * that is NOT also in the conditional set is a loop.
 */
function collectLoopNames(xml: string, conditionalNames: Set<string>): Set<string> {
  const names = new Set<string>()
  let match: RegExpExecArray | null

  LOOP_OPEN_RE.lastIndex = 0
  while ((match = LOOP_OPEN_RE.exec(xml)) !== null) {
    const name = match[1]
    // Skip if this is actually an "if" block captured by the broader # pattern
    if (name === "if" || name === "each") continue
    if (!conditionalNames.has(name)) {
      names.add(name)
    }
  }
  return names
}

/**
 * Parse a .docx template buffer and extract all template variables, including
 * information about whether each variable is used inside a conditional or loop block.
 *
 * The function first attempts to use Docxtemplater's built-in tag parsing. If that
 * yields no results (for example, due to malformed XML), it falls back to regex
 * extraction from the raw XML content.
 *
 * @param buffer - A Buffer containing the raw .docx file bytes
 * @returns An array of TemplateVariable objects describing each discovered variable
 */
export function parseTemplateVariables(buffer: Buffer): TemplateVariable[] {
  const variableMap = new Map<string, TemplateVariable>()

  // ── Strategy 1: Use Docxtemplater's getFullText / getTags ──────────────────
  try {
    const zip = new PizZip(buffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    } as any) // eslint-disable-line

    // Get the full text which preserves template tags as literal strings
    const fullText: string = doc.getFullText()

    const xmlContent = extractXmlContent(buffer)
    const conditionalNames = collectConditionalNames(xmlContent)
    const loopNames = collectLoopNames(xmlContent, conditionalNames)

    // Extract simple variables from full text
    SIMPLE_VAR_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = SIMPLE_VAR_RE.exec(fullText)) !== null) {
      const name = match[1]
      if (!isControlTag(name) && !variableMap.has(name)) {
        variableMap.set(name, {
          name,
          type: inferVariableType(name),
          isConditional: conditionalNames.has(name),
          isLoop: loopNames.has(name),
        })
      }
    }

    // Also scan the raw XML for tags that might be split across XML elements
    ALL_TAGS_RE.lastIndex = 0
    while ((match = ALL_TAGS_RE.exec(xmlContent)) !== null) {
      const rawTag = match[1].trim()
      if (isControlTag(rawTag)) continue

      // Clean up any XML artifacts that might be embedded in the tag
      const cleanName = rawTag.replace(/<[^>]+>/g, "").trim()
      if (!cleanName || variableMap.has(cleanName)) continue

      // Only add names that look like valid identifiers
      if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(cleanName)) {
        variableMap.set(cleanName, {
          name: cleanName,
          type: inferVariableType(cleanName),
          isConditional: conditionalNames.has(cleanName),
          isLoop: loopNames.has(cleanName),
        })
      }
    }

    // Make sure all conditional and loop names are represented
    for (const name of conditionalNames) {
      if (!variableMap.has(name)) {
        variableMap.set(name, {
          name,
          type: inferVariableType(name),
          isConditional: true,
          isLoop: false,
        })
      }
    }
    for (const name of loopNames) {
      if (!variableMap.has(name)) {
        variableMap.set(name, {
          name,
          type: "list",
          isConditional: false,
          isLoop: true,
        })
      }
    }
  } catch {
    // ── Strategy 2: Fallback to pure regex on raw XML ──────────────────────────
    const xmlContent = extractXmlContent(buffer)
    const conditionalNames = collectConditionalNames(xmlContent)
    const loopNames = collectLoopNames(xmlContent, conditionalNames)

    ALL_TAGS_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = ALL_TAGS_RE.exec(xmlContent)) !== null) {
      const rawTag = match[1].trim()
      if (isControlTag(rawTag)) continue

      const cleanName = rawTag.replace(/<[^>]+>/g, "").trim()
      if (!cleanName || variableMap.has(cleanName)) continue

      if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(cleanName)) {
        variableMap.set(cleanName, {
          name: cleanName,
          type: inferVariableType(cleanName),
          isConditional: conditionalNames.has(cleanName),
          isLoop: loopNames.has(cleanName),
        })
      }
    }

    for (const name of conditionalNames) {
      if (!variableMap.has(name)) {
        variableMap.set(name, {
          name,
          type: inferVariableType(name),
          isConditional: true,
          isLoop: false,
        })
      }
    }
    for (const name of loopNames) {
      if (!variableMap.has(name)) {
        variableMap.set(name, {
          name,
          type: "list",
          isConditional: false,
          isLoop: true,
        })
      }
    }
  }

  return Array.from(variableMap.values())
}
