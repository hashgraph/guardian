import { describe, it, expect } from "vitest"
import { buildSections } from "@/components/vc-views/vm0033/PDDView"

describe("PDDView buildSections", () => {
  it("creates a General section for top-level scalar fields", () => {
    const cs = {
      projectTitle: "Test Project",
      total_vcus: 1000,
      project_cert_type: "VCS",
    }
    const sections = buildSections(cs)
    expect(sections[0].id).toBe("top")
    expect(sections[0].title).toBe("General")
    expect(sections[0].fields.length).toBe(3)
  })

  it("creates sub-sections for nested objects", () => {
    const cs = {
      projectTitle: "Test",
      project_details: {
        field0: "Name",
        field1: "Description",
      },
      baseline_emissions: {
        BE_y: 500,
      },
    }
    const sections = buildSections(cs)
    const sectionIds = sections.map((s) => s.id)
    expect(sectionIds).toContain("top")
    expect(sectionIds).toContain("project_details")
    expect(sectionIds).toContain("baseline_emissions")
  })

  it("flattens deeply nested objects", () => {
    const cs = {
      emission_reduction: {
        baseline: {
          BE_y: 1000,
        },
        project: {
          PE_y: 200,
        },
      },
    }
    const sections = buildSections(cs)
    const erSection = sections.find((s) => s.id === "emission_reduction")
    expect(erSection).toBeDefined()
    expect(erSection!.fields.length).toBe(2)
    expect(erSection!.fields.map((f) => f.key)).toEqual([
      "emission_reduction.baseline.BE_y",
      "emission_reduction.project.PE_y",
    ])
  })

  it("excludes type, @context, and id fields", () => {
    const cs = {
      type: "SomeType",
      "@context": ["https://example.com"],
      id: "did:hedera:test",
      projectTitle: "Test",
    }
    const sections = buildSections(cs)
    const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key))
    expect(allKeys).not.toContain("type")
    expect(allKeys).not.toContain("@context")
    expect(allKeys).not.toContain("id")
    expect(allKeys).toContain("projectTitle")
  })

  it("handles empty credential subject", () => {
    const sections = buildSections({})
    expect(sections).toHaveLength(0)
  })

  it("handles arrays as values (not sections)", () => {
    const cs = {
      tags: ["carbon", "wetland"],
      nested: {
        items: [1, 2, 3],
      },
    }
    const sections = buildSections(cs)
    const topSection = sections.find((s) => s.id === "top")
    expect(topSection).toBeDefined()
    const tagsField = topSection!.fields.find((f) => f.key === "tags")
    expect(tagsField).toBeDefined()
    expect(tagsField!.value).toEqual(["carbon", "wetland"])
  })
})
