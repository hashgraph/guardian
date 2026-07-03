export type WidgetKey =
    | 'totalIssued'
    | 'activeSupply'
    | 'totalRetired'
    | 'activeProjects'
    | 'issuanceTrend'
    | 'vintageDist'
    | 'projectsSector'
    | 'projectsByRegistry'
    | 'sdgRadar'
    | 'topCountries'
    | 'topRegistries'
    | 'recentIssuances'
    | 'sdgTopList'
    | 'networkActivity'
    | 'retirementTrend'
    | 'syncStatus';

export const DEFAULT_WIDGETS: Record<WidgetKey, boolean> = {
    totalIssued: true,
    activeSupply: true,
    totalRetired: true,
    activeProjects: true,
    issuanceTrend: true,
    vintageDist: true,
    projectsSector: true,
    projectsByRegistry: true,
    sdgRadar: true,
    topCountries: true,
    topRegistries: true,
    recentIssuances: true,
    sdgTopList: true,
    networkActivity: true,
    retirementTrend: true,
    syncStatus: true,
};

export interface WidgetGroupEntry {
    key: WidgetKey;
    labelKey: string;
    descKey: string;
    iconName: string;
}

export interface WidgetGroup {
    groupLabelKey: string;
    widgets: WidgetGroupEntry[];
}

const WIDGET_GROUPS: WidgetGroup[] = [
    {
        groupLabelKey: 'portfolio.widgetGroups.kpis',
        widgets: [
            { key: 'totalIssued', labelKey: 'portfolio.kpi.totalIssued.label', descKey: 'portfolio.kpi.totalIssued.sub', iconName: 'certificate' },
            { key: 'activeSupply', labelKey: 'portfolio.kpi.activeSupply.label', descKey: 'portfolio.kpi.activeSupply.sub', iconName: 'stack' },
            { key: 'totalRetired', labelKey: 'portfolio.kpi.totalRetired.label', descKey: 'portfolio.kpi.totalRetired.sub', iconName: 'flame' },
            { key: 'activeProjects', labelKey: 'portfolio.kpi.activeProjects.label', descKey: 'portfolio.kpi.activeProjects.sub', iconName: 'plant' },
        ],
    },
    {
        groupLabelKey: 'portfolio.widgetGroups.trends',
        widgets: [
            { key: 'issuanceTrend', labelKey: 'portfolio.sections.issuanceTrend', descKey: 'portfolio.widgetDesc.issuanceTrend', iconName: 'chart-line' },
            { key: 'retirementTrend', labelKey: 'portfolio.sections.retirementTrend', descKey: 'portfolio.widgetDesc.retirementTrend', iconName: 'chart-line' },
            { key: 'vintageDist', labelKey: 'portfolio.sections.vintageDist', descKey: 'portfolio.widgetDesc.vintageDist', iconName: 'chart-bar' },
        ],
    },
    {
        groupLabelKey: 'portfolio.widgetGroups.breakdowns',
        widgets: [
            { key: 'projectsSector', labelKey: 'portfolio.sections.projectsBySector', descKey: 'portfolio.widgetDesc.projectsSector', iconName: 'chart-donut' },
            { key: 'projectsByRegistry', labelKey: 'portfolio.sections.projectsByRegistry', descKey: 'portfolio.widgetDesc.projectsByRegistry', iconName: 'chart-donut' },
            { key: 'sdgRadar', labelKey: 'portfolio.sections.sdgCoverage', descKey: 'portfolio.widgetDesc.sdgRadar', iconName: 'target' },
        ],
    },
    {
        groupLabelKey: 'portfolio.widgetGroups.tables',
        widgets: [
            { key: 'topCountries', labelKey: 'portfolio.sections.topCountries', descKey: 'portfolio.widgetDesc.topCountries', iconName: 'flag' },
            { key: 'topRegistries', labelKey: 'portfolio.sections.topRegistries', descKey: 'portfolio.widgetDesc.topRegistries', iconName: 'building' },
            { key: 'recentIssuances', labelKey: 'portfolio.sections.recentIssuances', descKey: 'portfolio.widgetDesc.recentIssuances', iconName: 'certificate' },
            { key: 'sdgTopList', labelKey: 'portfolio.sections.topSdgs', descKey: 'portfolio.widgetDesc.sdgTopList', iconName: 'target' },
        ],
    },
    {
        groupLabelKey: 'portfolio.widgetGroups.system',
        widgets: [
            { key: 'networkActivity', labelKey: 'portfolio.sections.networkActivity', descKey: 'portfolio.widgetDesc.networkActivity', iconName: 'activity' },
            { key: 'syncStatus', labelKey: 'portfolio.sections.syncStatus', descKey: 'portfolio.widgetDesc.syncStatus', iconName: 'refresh' },
        ],
    },
];

export function usePortfolioWidgets() {
    const widgets = useState<Record<WidgetKey, boolean>>('portfolio-widgets', () => ({ ...DEFAULT_WIDGETS }));

    function widgetVisible(key: WidgetKey): boolean {
        return widgets.value[key] ?? true;
    }

    function toggleWidget(key: WidgetKey): void {
        widgets.value = { ...widgets.value, [key]: !widgets.value[key] };
    }

    function setWidget(key: WidgetKey, value: boolean): void {
        widgets.value = { ...widgets.value, [key]: value };
    }

    return { widgets, widgetVisible, toggleWidget, setWidget, widgetGroups: WIDGET_GROUPS };
}
