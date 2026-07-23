/** Short display names for methodologies (used in tables, badges) */
export const METHODOLOGY_NAMES: Record<string, string> = {
    'vm0007': 'VM0007 — REDD+ Methodology',
    'vm0033': 'VM0033 — Tidal Wetland and Seagrass',
    'vm0044': 'VM0044 — Biochar',
    'vm0036': 'VM0036 — Peatland Rewetting',
    'acm0002': 'ACM0002 — Grid Connected RE',
    'acm0001': 'ACM0001 — Landfill Gas',
    'acm0006': 'ACM0006 — Biomass Energy',
    'ar-acm0003': 'AR-ACM0003 — Reforestation',
    'gs-cookstove': 'GS Cookstove Methodology',
    'gs-sdw': 'GS Safe Drinking Water v1.0',
    'gs-clean-energy': 'GS Clean Energy Methodology',
};

/** Full descriptive names for methodologies (used in tooltips, detail pages) */
export const METHODOLOGY_LONG_NAMES: Record<string, string> = {
    'vm0007': 'VM0007 — REDD+ Methodology Framework',
    'vm0033': 'VM0033 — Methodology for Tidal Wetland and Seagrass Restoration',
    'vm0044': 'VM0044 — Methodology for Biochar Utilization in Soil and Non-Soil Applications',
    'vm0036': 'VM0036 — Methodology for Rewetting Drained Tropical Peatlands',
    'acm0002': 'ACM0002 — Grid-Connected Electricity Generation from Renewable Sources',
    'acm0001': 'ACM0001 — Flaring or Use of Landfill Gas',
    'acm0006': 'ACM0006 — Electricity and Heat Generation from Biomass',
    'ar-acm0003': 'AR-ACM0003 — Afforestation and Reforestation of Lands',
    'gs-cookstove': 'Gold Standard Methodology for Metered & Measured Energy Cooking Devices',
    'gs-sdw': 'Gold Standard Methodology for Safe Drinking Water Supply v1.0',
    'gs-clean-energy': 'Gold Standard Methodology for Clean Energy Generation',
};

export function getMethodologyName(id: string): string {
    return METHODOLOGY_NAMES[id] || id;
}

export function getMethodologyLongName(id: string, fallback?: string): string {
    return METHODOLOGY_LONG_NAMES[id] || fallback || METHODOLOGY_NAMES[id] || id;
}
