/**
 * Canonical project lifecycle stages (derived server-side in the project DTO)
 * and their badge colour classes. Shared across the projects list, the project
 * detail header, and the methodology linked-projects table so the stage set and
 * palette stay in sync. Labels are resolved via i18n `projects.lifecycleStages.*`.
 */
export const LIFECYCLE_STAGES = [
  'Registered',
  'Validation',
  'Monitoring',
  'Verified',
  'Issued',
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const lifecycleStageColor: Record<string, string> = {
  Registered: 'bg-slate-100 text-slate-600',
  Validation: 'bg-stat-amber/10 text-stat-amber',
  Monitoring: 'bg-stat-blue/10 text-stat-blue',
  Verified: 'bg-purple-50 text-purple-600',
  Issued: 'bg-stat-green/10 text-stat-green',
};
