/**
 * Format a Hedera consensus timestamp (e.g. "1767599197.624837133") as a
 * human-readable date/time string.
 */
export function formatTimestamp(consensusTimestamp: string): string {
  if (!consensusTimestamp) return "—"
  const seconds = parseInt(consensusTimestamp.split(".")[0], 10)
  if (isNaN(seconds)) return consensusTimestamp
  return new Date(seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatTimestampFull(consensusTimestamp: string): string {
  if (!consensusTimestamp) return "—"
  const seconds = parseInt(consensusTimestamp.split(".")[0], 10)
  if (isNaN(seconds)) return consensusTimestamp
  return new Date(seconds * 1000).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Format a tCO2e value with 2 decimal places and thousands separator. */
export function formatTCO2e(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) return "—"
  return `${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} tCO₂e`
}

/** Shorten a DID for display: show first 12 + "..." + last 8 chars. */
export function shortenDid(did: string | undefined): string {
  if (!did) return "—"
  if (did.length <= 24) return did
  return `${did.slice(0, 16)}…${did.slice(-8)}`
}

/** Format a numeric kWh value. */
export function formatKWh(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—"
  return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })} kWh`
}
