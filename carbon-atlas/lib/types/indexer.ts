export type EntityType =
  | "approved_report"
  | "verification_report"
  | "report"
  | "daily_mrv_report"
  | "approved_project"
  | "validation_report"
  | "project_form"
  | "project"
  | "approved_vvb"
  | "vvb"

export interface VCListItem {
  id: string
  consensusTimestamp: string
  topicId: string
  options: {
    entityType: EntityType
    relationships: string[]
    documentStatus: string
    issuer: string
  }
  analytics: {
    policyId: string
    schemaId: string
    schemaName: string
  }
  files: string[]
}

export interface VCDetailItem extends VCListItem {
  documents: string[]
}

export interface VCDetail {
  id: string
  item: VCDetailItem
  history: VCListItem[]
}

export interface PolicyVcListResponse {
  items: VCListItem[]
  total: number
  pageIndex: number
  pageSize: number
  order?: string
}

export interface DeviceRecord {
  device_id: number
  date_from: string
  date_to: string
  eg_p_d_y: number
}

// Parsed credential subjects for each entity type
export interface MonitoringReportCS {
  type: string
  ref?: string
  date_from?: string
  date_to?: string
  BE_y?: number
  PE_y?: number
  LE_y?: number
  ER_y?: number
  field0?: DeviceRecord[]
  [key: string]: unknown
}

export interface ProjectFormCS {
  type: string
  name?: string
  country?: string
  case_type?: string
  methodology?: string
  crediting_period_start?: string
  crediting_period_end?: string
  EFb_input?: number
  EFb_useful?: number
  BE_y?: number
  PE_y?: number
  LE_y?: number
  ER_y?: number
  [key: string]: unknown
}

export interface VerificationReportCS {
  type: string
  vvb_name?: string
  vvb_code?: string
  verification_date?: string
  conclusion?: string
  ER_verified?: number
  monitored_period_start?: string
  monitored_period_end?: string
  [key: string]: unknown
}
