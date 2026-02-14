import { toWords } from "number-to-words"
import numeral from "numeral"
import { format as formatDateFn } from "date-fns"

export function spellOutCurrency(amount: number, currency: string = "USD"): string {
  const symbols: Record<string, { name: string; plural: string; symbol: string }> = {
    USD: { name: "Dollar", plural: "Dollars", symbol: "$" },
    EUR: { name: "Euro", plural: "Euros", symbol: "€" },
    GBP: { name: "Pound", plural: "Pounds", symbol: "£" },
  }

  const curr = symbols[currency] || symbols.USD

  const wholePart = Math.floor(Math.abs(amount))
  const centsPart = Math.round((Math.abs(amount) - wholePart) * 100)

  const wholeWords = capitalizeWords(toWords(wholePart))
  const formattedAmount = numeral(amount).format("$0,0.00")

  const currencyName = wholePart === 1 ? curr.name : curr.plural

  if (centsPart > 0) {
    const centsWords = capitalizeWords(toWords(centsPart))
    return `${wholeWords} and ${centsWords}/100 ${currencyName} (${formattedAmount})`
  }

  return `${wholeWords} ${currencyName} (${formattedAmount})`
}

export function formatLegalNumber(num: number): string {
  const words = capitalizeWords(toWords(Math.floor(Math.abs(num))))
  const formatted = numeral(num).format("0,0")
  return `${words} (${formatted})`
}

export function formatLegalDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDateFn(d, "MMMM d, yyyy")
}

export function formatPercentage(num: number): string {
  const words = capitalizeWords(toWords(Math.floor(Math.abs(num))))
  return `${words} percent (${num}%)`
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
  }
  const symbol = symbols[currency] || "$"
  return `${symbol}${numeral(amount).format("0,0.00")}`
}

function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((word) => {
      if (word === "and") return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}
