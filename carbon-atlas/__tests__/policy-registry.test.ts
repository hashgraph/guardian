import { describe, it, expect } from "vitest"
import {
  POLICIES,
  getPolicyBySlug,
  getSupportedNetworks,
  supportsNetwork,
  getDeployment,
  getPoliciesForNetwork,
  getDefaultPolicy,
} from "@/lib/policies/registry"
import { mecd } from "@/lib/policies/mecd"
import { vm0033 } from "@/lib/policies/vm0033"

describe("Policy Registry", () => {
  it("exports all policies", () => {
    expect(POLICIES).toHaveLength(2)
    expect(POLICIES.map((p) => p.slug)).toEqual(["mecd", "vm0033"])
  })

  it("looks up policies by slug", () => {
    expect(getPolicyBySlug("mecd")).toBe(mecd)
    expect(getPolicyBySlug("vm0033")).toBe(vm0033)
    expect(getPolicyBySlug("nonexistent")).toBeUndefined()
  })

  it("returns correct supported networks", () => {
    expect(getSupportedNetworks(mecd)).toEqual(
      expect.arrayContaining(["testnet", "mainnet"])
    )
    expect(getSupportedNetworks(vm0033)).toEqual(["mainnet"])
  })

  it("checks network support correctly", () => {
    expect(supportsNetwork(mecd, "testnet")).toBe(true)
    expect(supportsNetwork(mecd, "mainnet")).toBe(true)
    expect(supportsNetwork(vm0033, "mainnet")).toBe(true)
    expect(supportsNetwork(vm0033, "testnet")).toBe(false)
  })

  it("returns deployment for valid network", () => {
    const deployment = getDeployment(mecd, "testnet")
    expect(deployment).toBeDefined()
    expect(deployment!.policyHederaId).toBe("1767599197.624837133")
    expect(deployment!.tokenId).toBe("0.0.5922943")
  })

  it("returns undefined for unsupported network", () => {
    expect(getDeployment(vm0033, "testnet")).toBeUndefined()
  })

  it("filters policies by network", () => {
    const mainnetPolicies = getPoliciesForNetwork("mainnet")
    expect(mainnetPolicies).toHaveLength(2) // both MECD and VM0033 support mainnet

    const testnetPolicies = getPoliciesForNetwork("testnet")
    expect(testnetPolicies).toHaveLength(1) // only MECD supports testnet
    expect(testnetPolicies[0].slug).toBe("mecd")
  })

  it("default policy is mecd", () => {
    expect(getDefaultPolicy().slug).toBe("mecd")
  })

  describe("policy configs have required fields", () => {
    for (const policy of POLICIES) {
      it(`${policy.slug} has valid config`, () => {
        expect(policy.slug).toBeTruthy()
        expect(policy.name).toBeTruthy()
        expect(policy.fullName).toBeTruthy()
        expect(policy.standard).toBeTruthy()
        expect(Object.keys(policy.networks).length).toBeGreaterThan(0)
        expect(policy.links.methodology).toMatch(/^https?:\/\//)
        expect(policy.dashboard.statCards.length).toBeGreaterThan(0)
        expect(policy.dashboard.charts.length).toBeGreaterThan(0)

        // Each network deployment has a policyHederaId
        for (const [, deployment] of Object.entries(policy.networks)) {
          expect(deployment!.policyHederaId).toBeTruthy()
        }
      })
    }
  })
})
