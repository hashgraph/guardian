import { describe, it, expect } from "vitest"
import { buildChain, getProjectDevelopers, deduplicateProjects, ENTITY_TYPE_CONFIG } from "@/lib/utils/trust-chain"
import type { VCListItem } from "@/lib/types/indexer"

// Mirrors the real 10-VC dataset from the MECD policy
function makeVc(
  consensusTimestamp: string,
  entityType: string,
  relationships: string[] = [],
  issuer = `did:hedera:testnet:issuer_${entityType}`
): VCListItem {
  return {
    id: `mongo_${consensusTimestamp}`,
    consensusTimestamp,
    topicId: "0.0.7561138",
    options: {
      entityType: entityType as VCListItem["options"]["entityType"],
      relationships,
      documentStatus: "NEW",
      issuer,
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
const projectForm = makeVc("1767599555.977638000", "project_form", ["1767599482.842853323"], "did:hedera:testnet:developer_1")
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
    // Root should be the approved_report (lowest order = first)
    expect(chain[0].entityType).toBe("approved_report")
  })

  it("includes lifecycle entity types in chain", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    const types = chain.map((n) => n.entityType)
    expect(types).toContain("report")
    expect(types).toContain("daily_mrv_report")
    expect(types).toContain("verification_report")
    expect(types).toContain("validation_report")
    expect(types).toContain("approved_project")
    expect(types).toContain("project_form")
    expect(types).toContain("project")
  })

  it("excludes VVB administrative entity types from chain", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    const types = chain.map((n) => n.entityType)
    expect(types).not.toContain("vvb")
    expect(types).not.toContain("approved_vvb")
  })

  it("returns exactly 8 lifecycle nodes for the full MECD chain", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    expect(chain).toHaveLength(8)
  })

  it("sorts nodes by lifecycle order (newest first)", () => {
    const chain = buildChain(allVcs, "1767600748.312578844")
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].config.order).toBeGreaterThanOrEqual(chain[i - 1].config.order)
    }
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
})

describe("deduplicateProjects", () => {
  it("returns one row per project (approved_project absorbs its project_form)", () => {
    const projects = deduplicateProjects(allVcs)
    expect(projects).toHaveLength(1)
    expect(projects[0].stage).toBe("Validated")
  })

  it("uses project developer DID from the linked project_form", () => {
    const projects = deduplicateProjects(allVcs)
    expect(projects[0].developerDid).toBe("did:hedera:testnet:developer_1")
  })

  it("shows uncovered project_forms as Submitted when no approved_project exists", () => {
    const onlyForm = allVcs.filter(
      (vc) => !["approved_project", "project"].includes(vc.options.entityType)
    )
    const projects = deduplicateProjects(onlyForm)
    expect(projects).toHaveLength(1)
    expect(projects[0].stage).toBe("Submitted")
    expect(projects[0].vc.options.entityType).toBe("project_form")
  })
})

describe("getProjectDevelopers", () => {
  it("extracts issuers from project_form VCs", () => {
    const devs = getProjectDevelopers(allVcs)
    expect(devs.length).toBeGreaterThan(0)
    expect(devs[0]).toContain("did:hedera:testnet:developer_1")
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
