export const DASHBOARD_THRESHOLDS = {
    minProjects: 1,
    minCredits: 0,
} as const;

export function meetsDashboardThreshold(projectCount: number, issuanceCount: number): boolean {
    return projectCount > DASHBOARD_THRESHOLDS.minProjects && issuanceCount > DASHBOARD_THRESHOLDS.minCredits;
}
