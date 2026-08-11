/**
 * Guided product tour — shared state and persistence.
 *
 * Mirrors the useNetwork() / useAuth() useState pattern so the tour is an
 * SSR-safe singleton. "Already seen" is persisted in the `sx.tour` cookie,
 * following the `sx.locale` precedent in plugins/i18n-persist.ts: readable
 * during SSR, works for guests, and needs no backend change.
 */

import { TOUR_STEPS, type TourStep } from '~/lib/tour-steps';

export const TOUR_COOKIE = 'sx.tour';
/** Bump to re-show the tour to everyone after a significant UI change. */
export const TOUR_VERSION = 1;

interface TourCookieState {
    v: number;
    /** User ids (and the literal 'guest') that have already been shown the tour. */
    seen: string[];
}

/** Keep the cookie small — it is sent on every SSR request. */
const MAX_SEEN = 10;

export const useProductTour = () => {
    const { user, isAuthenticated, isAdmin, modal } = useAuth();
    const config = useRuntimeConfig();

    // Shared singletons. `stepIds` is frozen at start() so that an auth change
    // mid-tour cannot shift the index out from under the user.
    const active = useState<boolean>('tour-active', () => false);
    const stepIds = useState<string[]>('tour-step-ids', () => []);
    const index = useState<number>('tour-index', () => 0);

    const cookie = useCookie<TourCookieState>(TOUR_COOKIE, {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        default: () => ({ v: TOUR_VERSION, seen: [] }),
    });

    /**
     * Identity the "seen" flag is recorded against. Keyed per user so a shared
     * browser still greets the second person who signs into it.
     */
    const seenKey = () => user.value?.id ?? 'guest';

    function hasSeen(key = seenKey()): boolean {
        const c = cookie.value;
        // A version bump means everybody counts as "never seen".
        if (!c || c.v !== TOUR_VERSION) return false;
        return Array.isArray(c.seen) && c.seen.includes(key);
    }

    function markSeen(key = seenKey()) {
        const prev = cookie.value?.v === TOUR_VERSION && Array.isArray(cookie.value.seen)
            ? cookie.value.seen
            : [];
        if (prev.includes(key)) return;
        cookie.value = { v: TOUR_VERSION, seen: [...prev, key].slice(-MAX_SEEN) };
    }

    /**
     * Runtime feature gates. Mirrors the render condition of the feature's own
     * component — FeedbackWidget only mounts when a webhook URL is configured,
     * so without one there is no button to point at.
     */
    function featureEnabled(feature: TourStep['feature']): boolean {
        if (!feature) return true;
        if (feature === 'feedback') return !!config.public.feedbackWebhookUrl;
        return true;
    }

    function visibleSteps(): TourStep[] {
        return TOUR_STEPS.filter((s) => {
            if (!featureEnabled(s.feature)) return false;
            switch (s.audience ?? 'all') {
                case 'auth': return isAuthenticated.value;
                case 'guest': return !isAuthenticated.value;
                case 'admin': return isAdmin.value;
                default: return true;
            }
        });
    }

    /** The steps for the run currently in progress (frozen at start()). */
    const steps = computed<TourStep[]>(() =>
        stepIds.value
            .map((id) => TOUR_STEPS.find((s) => s.id === id))
            .filter((s): s is TourStep => !!s),
    );

    const currentStep = computed<TourStep | null>(() => steps.value[index.value] ?? null);
    const total = computed(() => steps.value.length);
    const isFirst = computed(() => index.value === 0);
    const isLast = computed(() => index.value >= total.value - 1);

    /** Manual start (Help menu / account card). Always runs, regardless of `seen`. */
    function start() {
        if (!import.meta.client) return;
        // Never fight a modal for the screen — AuthModals and the
        // non-dismissible ForcePasswordChangeModal both outrank the tour.
        if (modal.value || user.value?.mustChangePassword) return;
        const list = visibleSteps();
        if (list.length === 0) return;
        stepIds.value = list.map((s) => s.id);
        index.value = 0;
        active.value = true;
        // Starting counts as seen: a user who abandons the tour halfway should
        // not be ambushed by it on every subsequent login. The Help menu is
        // always there if they want it back.
        markSeen();
    }

    /** Auto start, only if this identity has never seen the tour in this browser. */
    function maybeAutoStart() {
        if (!import.meta.client) return;
        if (hasSeen()) return;
        // Defer so the auth modal has actually unmounted and the topbar has
        // re-rendered its authenticated controls (bell, avatar menu) — the
        // portfolio / notifications / account steps target those.
        nextTick(() => { setTimeout(start, 350); });
    }

    function next() { if (isLast.value) finish(); else index.value += 1; }
    function prev() { if (!isFirst.value) index.value -= 1; }
    function goTo(i: number) { if (i >= 0 && i < total.value) index.value = i; }

    function stop() {
        active.value = false;
        index.value = 0;
        stepIds.value = [];
    }
    const skip = () => { markSeen(); stop(); };
    const finish = () => { markSeen(); stop(); };

    return {
        active, index, steps, currentStep, total, isFirst, isLast,
        start, maybeAutoStart, next, prev, goTo, skip, finish,
        hasSeen, markSeen,
    };
};
