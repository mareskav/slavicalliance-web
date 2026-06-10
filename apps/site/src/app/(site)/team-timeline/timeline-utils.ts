import type { TimelineEvent } from "@/lib/landing-parser"

import {
  AUTO_BASE_MS,
  AUTO_MAX_MS,
  AUTO_PER_CHAR_MS,
  CARD_WIDTH
} from "./constants"

export const parsePlacement = (text: string): { place: number | null; label: string } => {
  if (text.startsWith("🥇")) return { place: 1, label: text.replace(/^🥇\s*/, "") }
  if (text.startsWith("🥈")) return { place: 2, label: text.replace(/^🥈\s*/, "") }
  if (text.startsWith("🥉")) return { place: 3, label: text.replace(/^🥉\s*/, "") }

  const match = text.match(/^(\d+)\.\s*(?:-\s*)?(.*)$/)
  if (match) {
    const place = parseInt(match[1], 10)
    const label = (match[2] || "").replace(/^místo\s+(?:na|v)\s+/i, "").trim()
    return { place, label }
  }

  return { place: null, label: text }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const getAutoDelayMs = (event: TimelineEvent): number => {
  const textLength = event.highlights.join(" ").length
  return clamp(AUTO_BASE_MS + textLength * AUTO_PER_CHAR_MS, AUTO_BASE_MS, AUTO_MAX_MS)
}

export const getCardStep = (el: HTMLDivElement): number => {
  const firstCard = el.children.item(0) as HTMLElement | null
  if (!firstCard) return CARD_WIDTH

  const width = firstCard.getBoundingClientRect().width
  return Number.isFinite(width) && width > 0 ? width : CARD_WIDTH
}

const getStartAlignedIndex = (el: HTMLDivElement): number => {
  const childCount = el.children.length
  if (childCount === 0) return 0

  const step = getCardStep(el)
  return clamp(Math.round(el.scrollLeft / step), 0, childCount - 1)
}

const getCenterAlignedIndex = (el: HTMLDivElement): number => {
  const children = Array.from(el.children) as HTMLElement[]
  if (children.length === 0) return 0

  const viewport = el.getBoundingClientRect()
  const viewportCenter = viewport.left + viewport.width / 2
  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY

  children.forEach((child, index) => {
    const rect = child.getBoundingClientRect()
    const childCenter = rect.left + rect.width / 2
    const distance = Math.abs(childCenter - viewportCenter)

    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  return closestIndex
}

export const getCurrentIndex = (el: HTMLDivElement, alignToCenter: boolean): number =>
  alignToCenter ? getCenterAlignedIndex(el) : getStartAlignedIndex(el)
