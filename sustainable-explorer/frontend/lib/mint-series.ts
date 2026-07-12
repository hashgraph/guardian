export interface MonthlyAmount {
    month: string;
    amount: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_NAMES = ['Q1', 'Q2', 'Q3', 'Q4'];

/**
 * Buckets a monthly `{month, amount}` series (as returned by mint-stats and
 * portfolio-stats) into monthly/quarterly/yearly chart points. Shared between
 * useMintStats and usePortfolioDashboard so the two don't drift.
 */
export function bucketMintSeries(
    monthly: MonthlyAmount[],
    period: 'monthly' | 'quarterly' | 'yearly',
): { label: string; value: number }[] {
    if (monthly.length === 0) return [];

    const buckets = new Map<string, { sortKey: string; label: string; value: number }>();

    for (const entry of monthly) {
        const d = new Date(entry.month);
        if (isNaN(d.getTime())) continue;
        const yy = String(d.getFullYear()).slice(2);
        let sortKey: string;
        let label: string;

        if (period === 'yearly') {
            sortKey = String(d.getFullYear());
            label = sortKey;
        } else if (period === 'quarterly') {
            const q = Math.floor(d.getMonth() / 3);
            sortKey = `${d.getFullYear()}-Q${q}`;
            label = `${QUARTER_NAMES[q]} '${yy}`;
        } else {
            sortKey = entry.month.slice(0, 7);
            label = `${MONTH_NAMES[d.getMonth()]} '${yy}`;
        }

        if (!buckets.has(sortKey)) buckets.set(sortKey, { sortKey, label, value: 0 });
        buckets.get(sortKey)!.value += entry.amount;
    }

    return [...buckets.values()]
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ label, value }) => ({ label, value }));
}
