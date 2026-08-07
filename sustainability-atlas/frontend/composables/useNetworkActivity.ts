import type { ActivityItem } from '~/types/models';
import { relativeTime, type Translate } from '~/lib/relative-time';
import { formatCredits } from '~/lib/format';

type ActivityCategory =
    | 'project_registered'
    | 'methodology_registered'
    | 'registry_registered'
    | 'credit_minted'
    | 'credit_retired'
    | 'other';

interface NetworkActivityApiItem {
    category: ActivityCategory;
    occurredAt: string;
    title: string | null;
    subtitle: string | null;
    amount: number | null;
    projectKey: string | null;
    topicId: string | null;
    messageType: string | null;
}

const POLL_INTERVAL_MS = 25_000;

function detailWithAmount(title: string | null, amount: number | null): string {
    if (amount == null) return title ?? '';
    return title ? `${formatCredits(amount)} — ${title}` : formatCredits(amount);
}

function mapOther(row: NetworkActivityApiItem, t: Translate, time: string): ActivityItem {
    const detail = row.title ?? '';
    switch (row.messageType) {
        case 'Token':
            return { time, action: t('dashboard.activity.tokenCreated'), detail, type: 'token' };
        case 'DID-Document':
            return { time, action: t('dashboard.activity.identityPublished'), detail, type: 'identity' };
        case 'VP-Document':
            return { time, action: t('dashboard.activity.verificationApproved'), detail, type: 'verification' };
        case 'Role-Document':
            return { time, action: t('dashboard.activity.roleGranted'), detail, type: 'role' };
        default:
            return { time, action: t('dashboard.activity.networkEvent'), detail, type: 'other' };
    }
}

function mapActivityRow(row: NetworkActivityApiItem, t: Translate): ActivityItem {
    const time = relativeTime(row.occurredAt, t);
    switch (row.category) {
        case 'project_registered':
            return {
                time,
                action: t('dashboard.activity.newProjectRegistered'),
                detail: row.subtitle ? `${row.title ?? ''} — ${row.subtitle}` : (row.title ?? ''),
                type: 'project',
            };
        case 'methodology_registered':
            return { time, action: t('dashboard.activity.methodologyRegistered'), detail: row.title ?? '', type: 'methodology' };
        case 'registry_registered':
            return { time, action: t('dashboard.activity.registryRegistered'), detail: row.title ?? '', type: 'registry' };
        case 'credit_minted':
            return { time, action: t('dashboard.activity.creditMinted'), detail: detailWithAmount(row.title, row.amount), type: 'credit' };
        case 'credit_retired':
            return { time, action: t('dashboard.activity.creditRetired'), detail: detailWithAmount(row.title, row.amount), type: 'retirement' };
        case 'other':
        default:
            return mapOther(row, t, time);
    }
}

/**
 * Real Network Activity feed — latest 10 Guardian events, newest first,
 * polled every ~25s.
 *
 * Two mutually exclusive modes:
 *  - Dashboard: called with no `projectKeys`, optionally with the same
 *    `developer`/`registry` filter ref the rest of the dashboard uses
 *    (see useDashboardSummary) — the feed narrows to match. An empty
 *    watchlist is not applicable here.
 *  - Portfolio: called with `projectKeys` (the active watchlist) — the feed
 *    is scoped entirely to those projects. An empty watchlist short-circuits
 *    to an empty feed without hitting the API.
 */
export function useNetworkActivity(
    projectKeys?: Ref<string[]>,
    dashboardFilters?: Ref<{ developer?: string; registry?: string }>,
) {
    const { network } = useNetwork();
    const { t } = useI18n();
    const { apiFetch } = useApiFetch();
    const config = useRuntimeConfig();
    const isPortfolio = projectKeys !== undefined;

    const baseURL = (): string =>
        import.meta.server
            ? (config.apiBaseUrl as string)
            : (config.public.apiBaseUrl as string);

    const sortedKeys = computed(() =>
        isPortfolio ? [...new Set(projectKeys!.value)].sort() : [],
    );

    // 'All Developers' / 'All Registries' are the UI's no-filter sentinels,
    // same convention as useDashboardSummary.
    const query = computed(() => {
        const f = dashboardFilters?.value ?? {};
        const q: Record<string, string> = {};
        if (f.registry && f.registry !== 'All Registries') q.registry = f.registry;
        if (f.developer && f.developer !== 'All Developers') q.developer = f.developer;
        return q;
    });

    const key = computed(() => isPortfolio
        ? `network-activity:${network.value}:portfolio:${sortedKeys.value.join('|')}`
        : `network-activity:${network.value}:global:${JSON.stringify(query.value)}`);

    async function fetchActivity(): Promise<NetworkActivityApiItem[]> {
        if (isPortfolio) {
            if (sortedKeys.value.length === 0) return [];
            return apiFetch<NetworkActivityApiItem[]>(
                `/api/v1/${network.value}/portfolio/network-activity`,
                {
                    method: 'POST',
                    baseURL: baseURL(),
                    credentials: 'include',
                    body: { projectKeys: sortedKeys.value },
                },
            ).catch(() => []);
        }
        return $fetch<NetworkActivityApiItem[]>(
            `/api/v1/${network.value}/dashboard/network-activity`,
            { baseURL: baseURL(), query: query.value },
        ).catch(() => []);
    }

    const { data, pending, refresh } = useAsyncData<NetworkActivityApiItem[]>(
        key.value,
        fetchActivity,
        {
            watch: isPortfolio ? [network, sortedKeys] : [network, query],
            default: () => [],
        },
    );

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    onMounted(() => {
        pollTimer = setInterval(() => { refresh(); }, POLL_INTERVAL_MS);
    });
    onUnmounted(() => {
        if (pollTimer) clearInterval(pollTimer);
    });

    const activityItems = computed<ActivityItem[]>(() =>
        (data.value ?? []).map(row => mapActivityRow(row, t)),
    );

    return { activityItems, pending, refresh };
}
