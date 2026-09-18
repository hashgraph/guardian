/** Locks/unlocks page scroll while `locked` is true. Client-only; restores on unmount. */
export function useScrollLock(locked: Ref<boolean>) {
    watch(locked, (isLocked) => {
        if (!import.meta.client) return;
        document.body.style.overflow = isLocked ? 'hidden' : '';
    }, { immediate: true });

    onUnmounted(() => {
        if (import.meta.client) document.body.style.overflow = '';
    });
}
