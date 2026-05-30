const dateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric"
})

const compactDateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric"
})

export const formatDate = (value: string) => dateFormatter.format(new Date(value))

export const formatCompactDate = (value: string) =>
  compactDateFormatter.format(new Date(value)).replace(/\s/g, "")

export const formatNumber = (value: number | null) => {
  if (value === null) {
    return "-"
  }
  return new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(value)
}

export const formatDroppedPoints = (values: number[]) => {
  if (values.length === 0) {
    return "-"
  }
  return values.map(formatNumber).join(" + ")
}

export const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback
  }
  return parsed
}
