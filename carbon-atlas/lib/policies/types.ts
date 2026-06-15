import type { EntityType } from "@/lib/types/indexer"

export type NetworkId = "mainnet" | "testnet"

/**
 * A single stage in a project's lifecycle — used to render the
 * ProjectLifecycleTimeline on project detail pages.
 */
export interface LifecycleStage {
  /** Display label, e.g. "PDD Submitted" */
  label: string
  /** Entity type whose presence in the VC chain marks this stage as complete */
  entityType: EntityType
  /** Short description shown as a tooltip or sublabel */
  description?: string
}

export interface NetworkDeployment {
  policyHederaId: string
  tokenId?: string
  policyTopicId?: string
}

export interface RendererProps {
  cs: Record<string, unknown>
  rawDocuments?: string[]
  entityType: string
  schema?: Record<string, unknown>
}

export interface StatCardConfig {
  key: string
  label: string
  description: string
  icon: string
  iconColor?: string
  source: "count" | "computed"
  entityType?: EntityType
  valuePath?: string
  format?: "number" | "tco2e" | "text"
}

export type ChartSlot =
  | "emission-timeline"
  | "device-map"
  | "project-overview"
  | "project-geographies"
  | "vcu-projections"
  | "none"

export interface PolicyConfig {
  slug: string
  name: string
  fullName: string
  standard: string
  description: string

  /** Which networks this policy is deployed on. */
  networks: Partial<Record<NetworkId, NetworkDeployment>>

  links: {
    methodology: string
    hederaPolicy: string
  }

  projectDeveloper?: {
    name: string
    url: string
    logoDark: string
    logoLight: string
  }

  dashboard: {
    statCards: StatCardConfig[]
    charts: ChartSlot[]
    /**
     * What to show in the "recent activity" table at the bottom of the dashboard.
     * "issuances" (default) — shows recent approved_report VCs.
     * "projects"            — shows recent project submissions (better for
     *                         early-stage policies with no issuances yet).
     */
    recentTable?: "issuances" | "projects"
  }

  /**
   * Dot-separated paths into the approved_report credential subject JSON
   * for extracting dashboard stats.
   *
   * `vcuEstimatePath` is a path into the *project_form* CS used when a policy
   * has VCU projections but no approved reports yet (e.g. VM0033-style).
   */
  statsExtractors: {
    eryPath?: string
    deviceCountPath?: string
    periodPath?: string
    /**
     * Path into a project VC's credential subject for estimated total VCUs
     * (pre-issuance). Pair with `vcuEntityType` to specify which entity type
     * to fetch — defaults to "project_form" if unset.
     */
    vcuEstimatePath?: string
    /**
     * Entity type to fetch when extracting vcuEstimatePath.
     * Use "project" for policies where the policy engine computes VCU totals
     * in the calculated project VC. Defaults to "project_form".
     */
    vcuEntityType?: EntityType
  }

  /**
   * Optional lifecycle stages shown on project detail pages.
   * When defined, a ProjectLifecycleTimeline is rendered above the VC content.
   * Stages are shown in order; a stage is "complete" when its entityType exists
   * in the VC chain for the viewed project.
   *
   * If undefined, no lifecycle timeline is shown.
   */
  lifecycleStages?: LifecycleStage[]
}
