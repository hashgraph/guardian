const HBAR_SYMBOL = 'ℏ';

/** Standardise a balance for display: 3 decimals + ℏ. Non-numeric input is passed through. */
export function formatBalance(balance: string | number | null | undefined): string {
    if (balance === null || balance === undefined || balance === '') {
        return '';
    }
    const value = typeof balance === 'number' ? balance : parseFloat(balance);
    if (!isFinite(value)) {
        return typeof balance === 'string' ? balance : '';
    }
    return `${value.toFixed(3)} ${HBAR_SYMBOL}`;
}
