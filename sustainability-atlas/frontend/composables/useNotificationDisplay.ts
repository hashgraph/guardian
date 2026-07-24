import { TrendingUp, Flame, ArrowLeftRight, Bell } from 'lucide-vue-next';
import { formatCredits } from '~/lib/format';
import type { NotificationItem } from '~/composables/useNotifications';

const TYPE_ICON: Record<string, any> = {
    issuance: TrendingUp,
    retirement: Flame,
    transfer: ArrowLeftRight,
};
const TYPE_COLOR: Record<string, string> = {
    issuance: 'text-stat-green',
    retirement: 'text-stat-amber',
    transfer: 'text-stat-blue',
};

/**
 * Row-presentation helpers (icon/color/copy per notification type) used by
 * NotificationPanel.vue.
 */
export function useNotificationDisplay() {
    const { t } = useI18n();

    function iconFor(type: string) {
        return TYPE_ICON[type] ?? Bell;
    }
    function colorFor(type: string) {
        return TYPE_COLOR[type] ?? 'text-muted-foreground';
    }

    /** Falls back to 'issuance' for any type without translations (matches the i18n keys that actually exist). */
    function typeKeyFor(item: NotificationItem): string {
        return ['issuance', 'retirement', 'transfer'].includes(item.type) ? item.type : 'issuance';
    }

    function typeLabelFor(item: NotificationItem): string {
        return t(`notifications.types.${typeKeyFor(item)}`);
    }

    function amountLabel(item: NotificationItem): string | null {
        const amount = item.payload?.amount;
        if (typeof amount === 'number') return formatCredits(amount);
        if (typeof amount === 'string' && amount.trim()) return amount;
        return null;
    }

    function describe(item: NotificationItem): string {
        const amount = amountLabel(item);
        const key = typeKeyFor(item);
        return amount
            ? t(`notifications.description.${key}`, { amount })
            : t(`notifications.description.${key}NoAmount`);
    }

    function projectNameFor(item: NotificationItem): string {
        const name = item.payload?.projectName ?? item.payload?.displayName;
        return typeof name === 'string' && name.trim() ? name : item.projectKey;
    }

    // The following three back the row-expand detail block. All return `null`
    // when the payload lacks the key — true for the dev-only mock items and
    // for any issuance notification inserted before payload enrichment shipped
    // — so the template can `v-if` each line out instead of rendering "undefined".
    function registryNameFor(item: NotificationItem): string | null {
        const name = item.payload?.registryName;
        return typeof name === 'string' && name.trim() ? name : null;
    }

    function methodologyFor(item: NotificationItem): string | null {
        const name = item.payload?.methodology;
        return typeof name === 'string' && name.trim() ? name : null;
    }

    /** Same formatting as `describe`'s inline amount, exposed standalone for the expand detail block. */
    const volumeLabelFor = amountLabel;

    return { iconFor, colorFor, typeLabelFor, describe, projectNameFor, registryNameFor, methodologyFor, volumeLabelFor };
}
