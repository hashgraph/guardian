/**
 * Two-step "click to arm, click again to confirm" pattern for destructive
 * inline buttons (e.g. "Clear all"), with an auto-disarm timeout.
 */
export function useConfirmClick(action: () => void, timeoutMs = 3000) {
    const confirming = ref(false);
    let timer: ReturnType<typeof setTimeout> | null = null;

    function trigger() {
        if (!confirming.value) {
            confirming.value = true;
            timer = setTimeout(() => { confirming.value = false; }, timeoutMs);
            return;
        }

        if (timer) { clearTimeout(timer); timer = null; }
        confirming.value = false;
        action();
    }

    onUnmounted(() => {
        if (timer) clearTimeout(timer);
    });

    return { confirming, trigger };
}
