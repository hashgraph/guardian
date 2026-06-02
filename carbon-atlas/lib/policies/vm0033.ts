import type { PolicyConfig } from "./types"

export const vm0033: PolicyConfig = {
  slug: "vm0033",
  name: "VM0033",
  fullName: "Tidal Wetland and Seagrass Restoration",
  standard: "Verra",
  description:
    "REDD+ methodology for mangrove and tidal wetland conservation and restoration projects",

  networks: {
    mainnet: {
      policyHederaId: "1768954927.914654000",
    },
  },

  links: {
    methodology:
      "https://verra.org/methodologies/vm0033-methodology-for-tidal-wetland-and-seagrass-restoration-v2-1/",
    hederaPolicy:
      "https://guardian.hedera.com/guardian/demo-guide/carbon-offsets/verra-vm0033",
  },

  projectDeveloper: {
    name: "Allcot",
    url: "https://allcot.com",
    logoDark: "/allcot-logo.png",
    logoLight: "/allcot-logo.png",
  },

  dashboard: {
    statCards: [
      {
        key: "projects",
        label: "Registered Projects",
        description: "Active projects submitted to this policy",
        icon: "IconSitemap",
        source: "computed",
        valuePath: "activeProjectFormCount",
        format: "number",
      },
      {
        key: "validation-status",
        label: "Validation Status",
        description: "Current stage in validation lifecycle",
        icon: "IconClipboardCheck",
        source: "computed",
        valuePath: "validationStage",
        format: "text",
      },
      {
        key: "issuances",
        label: "Verified Issuances",
        description: "Approved monitoring reports on Hedera",
        icon: "IconCertificate",
        source: "count",
        entityType: "approved_report",
        format: "number",
      },
      {
        key: "ery",
        label: "Estimated VCUs",
        description: "Projected Verified Carbon Units from PDD",
        icon: "IconLeaf",
        iconColor: "text-green-600",
        source: "computed",
        valuePath: "totalERy",
        format: "tco2e",
      },
    ],
    charts: ["vcu-projections", "project-geographies"],
    recentTable: "projects",
  },

  statsExtractors: {
    // VCU total is in the project_form VC, under the net_ERR object computed
    // by the policy engine and stored back into the project_form credential subject.
    vcuEstimatePath: "project_data_per_instance.0.project_instance.net_ERR.total_VCU_per_instance",
  },

  lifecycleStages: [
    { label: "PDD Submitted", entityType: "project_form", description: "Project Design Document submitted by developer" },
    { label: "Calculated", entityType: "project", description: "Emission calculations auto-completed by policy engine" },
    { label: "Validation Report", entityType: "validation_report", description: "Third-party VVB validation report submitted" },
    { label: "Validated", entityType: "approved_project", description: "Project validated and approved by registry" },
    { label: "Monitoring Report", entityType: "report", description: "Monitoring report with measured emission reductions" },
    { label: "Verification Report", entityType: "verification_report", description: "Third-party VVB verification of monitoring data" },
    { label: "Project Crediting", entityType: "approved_report", description: "Verified Carbon Units minted on Hedera" },
  ],
}
