import { describe, it, expect } from "vitest"
import { buildChain, getProjectDevelopers, ENTITY_TYPE_CONFIG } from "@/lib/utils/trust-chain"
import type { VCListItem } from "@/lib/types/indexer"

// Mirrors the real 10-VC dataset from the MECD policy
function makeVc(
  consensusTimestamp: string,
  entityType: string,
  relationships: string[] = []
): VCListItem {
  return {
    id: `mongo_${consensusTimestamp}`,
    consensusTimestamp,
    topicId: "0.0.7561138",
    options: {
      entityType: entityType as VCListItem["options"]["entityType"],
      relationships,
      documentStatus: "NEW",
      issuer: `did:hedera:testnet:issuer_${entityType}`,
    },
    analytics: {
      policyId: "1767599197.624837133",
      schemaId: "schema_1",
      schemaName: "Test",
    },
    files: [],
  }
}

// Real relationship graph from the MECD policy
const vvb = makeVc("1767599469.174809683", "vvb", ["1767599430.841141131"])
const approvedVvb = makeVc("1767599618.917681000", "approved_vvb", ["1767599469.174809683"])
const projectForm = makeVc("1767599555.977638000", "project_form", ["1767599482.842853323"])
const project = makeVc("1767599565.954854000", "project", ["1767599555.977638000", "1767599482.842853323"])
const approvedProject = makeVc("1767599639.104282237", "approved_project", ["1767599565.954854000", "1767599618.917681000"])
const validationReport = makeVc("1767599673.705876458", "validation_report", ["1767599639.104282237", "1767599430.841141131"])
const dailyMrv = makeVc("1767599794.276501000", "daily_mrv_report", ["1767599565.954854000"])
const report = makeVc("1767600603.136402856", "report", ["1767599794.276501000", "1767599482.842853323"])
const approvedReport = makeVc("1767600748.312578844", "approved_report", ["1767600603.136402856"])
const verificationReport = makeVc("1767601105.625149000", "verification_report", ["1767599430.841141131"])

const allVcs: VCListItem[] = [
  dailyMrv, approvedVvb, approvedProject, verificationReport,
  approvedReport, validationReport, vvb, projectForm, project, report,
]

describe("buildChain", () => {
  it("traverses from approved_report root through relationships", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    expect(chain.length).toBeGreaterThan(0)
    // Root should be the approved_report
    expect(chain[0].entityType).toBe("approved_report")
    expect(chain[0].depth).toBe(0)
  })

  it("includes report, daily_mrv_report in chain from approved_report", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    const types = chain.map((n) => n.entityType)
    expect(types).toContain("report")
    expect(types).toContain("daily_mrv_report")
  })

  it("follows nested relationships to project data", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    const types = chain.map((n) => n.entityType)
    // approved_report -> report -> daily_mrv_report -> project
    expect(types).toContain("project")
  })

  it("returns empty array for unknown root", () => {
    const chain = buildChain(allVcs, "9999999999.000000000")
    expect(chain).toEqual([])
  })

  it("does not revisit nodes (prevents cycles)", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    const timestamps = chain.map((n) => n.vc.consensusTimestamp)
    expect(new Set(timestamps).size).toBe(timestamps.length)
  })

  it("each node has a valid config from ENTITY_TYPE_CONFIG", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    for (const node of chain) {
      expect(ENTITY_TYPE_CONFIG[node.entityType]).toBeDefined()
      expect(node.config.label).toBeTruthy()
      expect(node.config.color).toBeTruthy()
    }
  })

  it("handles root with no relationships gracefully", () => {
    const isolated = makeVc("9999999999.111111000", "vvb", [])
    const chain = buildChain([...allVcs, isolated], "9999999999.111111000")
    expect(chain).toHaveLength(1)
    expect(chain[0].entityType).toBe("vvb")
  })
})

describe("getProjectDevelopers", () => {
  it("extracts issuers from project_form VCs", () => {
    const devs = getProjectDevelopers(allVcs)
    expect(devs.length).toBeGreaterThan(0)
    expect(devs[0]).toContain("did:hedera:testnet:issuer_project_form")
  })

  it("returns empty array when no project_form VCs exist", () => {
    const nonProjectVcs = allVcs.filter(
      (vc) => vc.options.entityType !== "project_form"
    )
    expect(getProjectDevelopers(nonProjectVcs)).toEqual([])
  })
})

describe("ENTITY_TYPE_CONFIG", () => {
  it("covers all 10 entity types", () => {
    const expected = [
      "approved_report", "verification_report", "report", "daily_mrv_report",
      "approved_project", "validation_report", "project_form", "project",
      "approved_vvb", "vvb",
    ]
    for (const et of expected) {
      expect(ENTITY_TYPE_CONFIG[et as keyof typeof ENTITY_TYPE_CONFIG]).toBeDefined()
    }
  })
})
