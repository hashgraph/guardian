import * as React from "react"
import type { VCDetail, EntityType } from "@/lib/types/indexer"
import { parseCredentialSubject } from "@/lib/api/vc-documents"
import { MonitoringReportView } from "./MonitoringReportView"
import { VerificationReportView } from "./VerificationReportView"
import { DeviceDataView } from "./DeviceDataView"
import { ProjectView } from "./ProjectView"
import { ValidationReportView } from "./ValidationReportView"
import { VVBView } from "./VVBView"
import { GenericVCView } from "./GenericVCView"

interface VCRendererProps {
  vcDetail: VCDetail
  /** Override entityType (used when the VC detail response lacks it, e.g. mainnet) */
  entityTypeOverride?: EntityType
}

export function VCRenderer({ vcDetail, entityTypeOverride }: VCRendererProps) {
  const entityType = entityTypeOverride ?? vcDetail.item.options?.entityType as EntityType
  const cs = parseCredentialSubject<Record<string, unknown>>(vcDetail)
  const rawDocs = vcDetail.item.documents

  if (!cs) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not parse credential subject.
      </p>
    )
  }

  switch (entityType) {
    case "approved_report":
    case "report":
      return (
        <MonitoringReportView cs={cs} rawDocuments={rawDocs} />
      )

    case "verification_report":
      return (
        <VerificationReportView cs={cs} rawDocuments={rawDocs} />
      )

    case "daily_mrv_report":
      return (
        <DeviceDataView credentialSubject={cs} rawDocuments={rawDocs} />
      )

    case "project_form":
    case "project":
    case "approved_project":
      return (
        <ProjectView cs={cs} entityType={entityType} rawDocuments={rawDocs} />
      )

    case "validation_report":
      return (
        <ValidationReportView cs={cs} rawDocuments={rawDocs} />
      )

    case "vvb":
    case "approved_vvb":
      return (
        <VVBView cs={cs} entityType={entityType} />
      )

    default:
      return (
        <GenericVCView credentialSubject={cs} rawDocuments={rawDocs} />
      )
  }
}
