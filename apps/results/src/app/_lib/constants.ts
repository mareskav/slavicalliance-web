export const pageSizeOptions = [20, 50, 100]
export const leagueCutOptions = [0, 1, 2, 3] as const
export const defaultLeagueCutCount = 3
export type LeagueCutCount = (typeof leagueCutOptions)[number]
