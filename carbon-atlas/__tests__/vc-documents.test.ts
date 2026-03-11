import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock fetch globally before importing modules
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { getAllPolicyVcs, parseCredentialSubject } from "@/lib/api/vc-documents"
import type { VCDetail, VCListItem } from "@/lib/types/indexer"

function makeListItem(
  consensusTimestamp: string,
  entityType: string
): VCListItem {
  return {
    id: `mongo_${consensusTimestamp}`,
    consensusTimestamp,
    topicId: "0.0.7561138",
    options: {
      entityType: entityType as VCListItem["options"]["entityType"],
      relationships: [],
      documentStatus: "NEW",
      issuer: "did:hedera:testnet:test",
    },
    analytics: {
      policyId: "1767599197.624837133",
      schemaId: "s1",
      schemaName: "Test",
    },
    files: [],
  }
}

const sampleItems: VCListItem[] = [
  makeListItem("1.000", "approved_report"),
  makeListItem("2.000", "project"),
  makeListItem("3.000", "daily_mrv_report"),
  makeListItem("4.000", "approved_report"),
  makeListItem("5.000", "vvb"),
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getAllPolicyVcs", () => {
  it("fetches all items and returns unfiltered when no entityType", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: sampleItems,
        total: 5,
        pageIndex: 0,
        pageSize: 100,
      }),
    })

    const result = await getAllPolicyVcs()
    expect(result).toHaveLength(5)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("filters client-side by entityType", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: sampleItems,
        total: 5,
        pageIndex: 0,
        pageSize: 100,
      }),
    })

    const result = await getAllPolicyVcs("approved_report")
    expect(result).toHaveLength(2)
    expect(result.every((v) => v.options.entityType === "approved_report")).toBe(true)
  })

  it("returns empty when entityType has no matches", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: sampleItems,
        total: 5,
        pageIndex: 0,
        pageSize: 100,
      }),
    })

    const result = await getAllPolicyVcs("validation_report")
    expect(result).toHaveLength(0)
  })

  it("paginates when total exceeds page size", async () => {
    // Simulate 150 items across 2 pages (PAGE_SIZE=100 in the real code)
    const page1 = Array.from({ length: 100 }, (_, i) =>
      makeListItem(`${i}.000`, i % 2 === 0 ? "approved_report" : "project")
    )
    const page2 = Array.from({ length: 50 }, (_, i) =>
      makeListItem(`${100 + i}.000`, "daily_mrv_report")
    )

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: page1, total: 150, pageIndex: 0, pageSize: 100 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: page2, total: 150, pageIndex: 1, pageSize: 100 }),
      })

    const result = await getAllPolicyVcs()
    expect(result).toHaveLength(150)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe("parseCredentialSubject", () => {
  it("parses a valid VC detail with stringified document", () => {
    const vcDetail: VCDetail = {
      id: "1767600748.312578844",
      item: {
        id: "mongo_1",
        consensusTimestamp: "1767600748.312578844",
        topicId: "0.0.7561138",
        options: {
          entityType: "approved_report",
          relationships: [],
          documentStatus: "NEW",
          issuer: "did:test",
        },
        analytics: { policyId: "p1", schemaId: "s1", schemaName: "Test" },
        files: [],
        documents: [
          JSON.stringify({
            credentialSubject: [
              { ER_y: 42.5, type: "approved_report" },
            ],
          }),
        ],
      },
      history: [],
    }

    const cs = parseCredentialSubject<{ ER_y: number; type: string }>(vcDetail)
    expect(cs).not.toBeNull()
    expect(cs!.ER_y).toBe(42.5)
    expect(cs!.type).toBe("approved_report")
  })

  it("returns null for empty documents", () => {
    const vcDetail: VCDetail = {
      id: "1",
      item: {
        id: "m1",
        consensusTimestamp: "1.0",
        topicId: "t1",
        options: {
          entityType: "vvb",
          relationships: [],
          documentStatus: "NEW",
          issuer: "did:test",
        },
        analytics: { policyId: "p1", schemaId: "s1", schemaName: "Test" },
        files: [],
        documents: [],
      },
      history: [],
    }
    expect(parseCredentialSubject(vcDetail)).toBeNull()
  })

  it("returns null for malformed JSON", () => {
    const vcDetail: VCDetail = {
      id: "1",
      item: {
        id: "m1",
        consensusTimestamp: "1.0",
        topicId: "t1",
        options: {
          entityType: "vvb",
          relationships: [],
          documentStatus: "NEW",
          issuer: "did:test",
        },
        analytics: { policyId: "p1", schemaId: "s1", schemaName: "Test" },
        files: [],
        documents: ["not valid json {{{"],
      },
      history: [],
    }
    expect(parseCredentialSubject(vcDetail)).toBeNull()
  })
})
