import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import expressionParser from "angular-expressions"

function angularParser(tag: string) {
  tag = tag
    .replace(/^\.$/, "this")
    .replace(/('|')/g, "'")
    .replace(/("|")/g, '"')

  if (tag === ".") {
    return {
      get: function (s: any) { // eslint-disable-line
        return s
      },
    }
  }

  const expr = expressionParser.compile(tag)
  return {
    get: function (scope: any, context: any) { // eslint-disable-line
      let obj: Record<string, unknown> = {}
      const scopeList = context.scopeList || [scope]
      const num = context.num || 0

      for (let i = 0, len = num + 1; i < len; i++) {
        obj = Object.assign(obj, scopeList[i])
      }

      return expr(scope, obj)
    },
  }
}

export function generateDocx(
  templateBuffer: Buffer,
  data: Record<string, unknown>
): Buffer {
  const zip = new PizZip(templateBuffer)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    parser: angularParser,
    nullGetter() {
      return ""
    },
  })

  doc.render(data)

  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })

  return buf as Buffer
}

export function validateTemplate(templateBuffer: Buffer): {
  valid: boolean
  errors: string[]
} {
  try {
    const zip = new PizZip(templateBuffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
    })

    // Compile to check for syntax errors
    doc.compile()

    return { valid: true, errors: [] }
  } catch (error) {
    const errors: string[] = []
    if (error && typeof error === "object" && "properties" in error) {
      const props = (error as Record<string, Record<string, unknown[]>>).properties
      if (props.errors) {
        for (const e of props.errors) {
          const errObj = e as Record<string, unknown>
          errors.push(`${errObj.message || "Template syntax error"}`)
        }
      }
    } else if (error instanceof Error) {
      errors.push(error.message)
    }
    return { valid: false, errors }
  }
}
