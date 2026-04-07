import { describe, it, expect } from "vitest"
import {
  formatTimestamp,
  formatTimestampFull,
  formatTCO2e,
  shortenDid,
  formatKWh,
  formatRawVc,
} from "@/lib/utils/format"

describe("formatTimestamp", () => {
  it("converts Hedera consensus timestamp to readable date", () => {
    // 1767599197 = ~2025-12-05 in UTC
    const result = formatTimestamp("1767599197.624837133")
    expect(result).toMatch(/\w+ \d+, \d{4}/)
  })

  it("returns dash for empty input", () => {
    expect(formatTimestamp("")).toBe("—")
  })

  it("returns raw string for non-numeric input", () => {
    expect(formatTimestamp("not-a-timestamp")).toBe("not-a-timestamp")
  })
})

describe("formatTimestampFull", () => {
  it("includes time component", () => {
    const result = formatTimestampFull("1767599197.624837133")
    // Should contain hour:minute in addition to date
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })

  it("returns dash for empty input", () => {
    expect(formatTimestampFull("")).toBe("—")
  })
})

describe("formatTCO2e", () => {
  it("formats a number with tCO2e suffix", () => {
    expect(formatTCO2e(123.456)).toMatch(/123\.46 tCO/)
  })

  it("returns dash for undefined", () => {
    expect(formatTCO2e(undefined)).toBe("—")
  })

  it("returns dash for null", () => {
    expect(formatTCO2e(null)).toBe("—")
  })

  it("returns dash for NaN", () => {
    expect(formatTCO2e(NaN)).toBe("—")
  })
})

describe("shortenDid", () => {
  it("shortens a long DID", () => {
    const did = "did:hedera:testnet:En4cNG6kwvQ8aufrYeP3SqkHKRmGDG8BU3q4U6kXSfkF_0.0.7561092"
    const result = shortenDid(did)
    expect(result.length).toBeLessThan(did.length)
    expect(result).toContain("…")
    expect(result.startsWith("did:hedera:testn")).toBe(true)
  })

  it("returns full string for short DID", () => {
    expect(shortenDid("did:short")).toBe("did:short")
  })

  it("returns dash for undefined", () => {
    expect(shortenDid(undefined)).toBe("—")
  })
})

describe("formatKWh", () => {
  it("formats kWh value", () => {
    expect(formatKWh(1234.5)).toMatch(/1,234\.5 kWh/)
  })

  it("returns dash for undefined", () => {
    expect(formatKWh(undefined)).toBe("—")
  })
})

describe("formatRawVc", () => {
  it("pretty-prints valid JSON string", () => {
    const input = '{"key":"value","nested":{"a":1}}'
    const result = formatRawVc(input)
    expect(result).toContain("  ")       // has indentation
    expect(result).toContain('"key": "value"')
    expect(JSON.parse(result)).toEqual(JSON.parse(input))
  })

  it("returns original string for invalid JSON", () => {
    const input = "not valid json {{{"
    expect(formatRawVc(input)).toBe(input)
  })

  it("handles JSON array", () => {
    const input = '[{"a":1},{"b":2}]'
    const result = formatRawVc(input)
    expect(result).toContain("  ")
    expect(JSON.parse(result)).toEqual([{ a: 1 }, { b: 2 }])
  })
})
