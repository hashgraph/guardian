<script setup lang="ts">
/**
 * Guided product tour — overlay renderer. Mounted once in layouts/default.vue.
 *
 * The spotlight is a single transparent, absolutely-positioned div sized to the
 * target's bounding rect carrying `box-shadow: 0 0 0 9999px rgba(0,0,0,.55)`:
 * the huge spread dims the whole viewport *outside* the div while the element
 * itself shows through the hole. No masking, no SVG, no dependency.
 *
 * The tour is read-only. A separate full-screen catcher blocks page clicks so
 * the user cannot navigate away mid-step and strand the run.
 */
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next';

const { active, index, steps, currentStep, total, isFirst, isLast, next, prev, skip, finish, goTo } =
    useProductTour();
const router = useRouter();
const route = useRoute();

interface Rect { top: number; left: number; width: number; height: number }

/** null => render the centred-card fallback (welcome step, or a missing anchor). */
const rect = ref<Rect | null>(null);
/** false while navigating / waiting for the target to appear. */
const ready = ref(false);
const POPOVER_W = 340;
const GAP = 14;
/** Fallback height, used only before the popover has been measured once. */
const POPOVER_EST_H = 190;

/**
 * The popover's real height, measured. A fixed estimate under-reports tall
 * steps (a three-line body pushes the card past 250px), and the viewport clamp
 * below then lets the footer — including Next — hang off the bottom of the
 * screen. Measuring is the only way to keep the buttons reachable for every
 * step in every language.
 */
const popoverEl = ref<HTMLElement | null>(null);
const popoverH = ref(POPOVER_EST_H);
let popoverRo: ResizeObserver | null = null;

watch(popoverEl, (el) => {
    popoverRo?.disconnect();
    popoverRo = null;
    if (!el) return;
    // Height changes when the step's copy changes, not when it is repositioned,
    // so this cannot feed back into the position computed from it.
    popoverRo = new ResizeObserver(() => { popoverH.value = el.offsetHeight; });
    popoverRo.observe(el);
    popoverH.value = el.offsetHeight;
});

/** Poll for a selector for up to `timeout` ms. Resolves null on give-up. */
function waitForEl(selector: string, timeout = 2500): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
        const started = performance.now();
        const tick = () => {
            const el = document.querySelector<HTMLElement>(selector);
            if (el) return resolve(el);
            if (performance.now() - started > timeout) return resolve(null);
            requestAnimationFrame(tick);
        };
        tick();
    });
}

function unionRect(els: HTMLElement[], pad: number): Rect {
    const rects = els.map((e) => e.getBoundingClientRect());
    const top = Math.min(...rects.map((r) => r.top));
    const left = Math.min(...rects.map((r) => r.left));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const right = Math.max(...rects.map((r) => r.right));
    return {
        top: top - pad,
        left: left - pad,
        width: (right - left) + pad * 2,
        height: (bottom - top) + pad * 2,
    };
}

// The measured elements deliberately live in a plain local (not useState):
// DOM nodes and DOMRects are not serialisable into the SSR payload.
let currentEls: HTMLElement[] = [];

function measure() {
    const step = currentStep.value;
    if (!step || currentEls.length === 0) { rect.value = null; return; }
    rect.value = unionRect(currentEls, step.padding ?? 8);
}

/**
 * Identifies the in-flight resolve. resolveStep() awaits navigation, element
 * polling (up to 2.5s) and a scroll settle, so pressing Next mid-flight leaves
 * two runs racing over the same `currentEls`. Without this guard a slow earlier
 * run can wake up after a newer one started and measure its own element against
 * the newer step — spotlight on one control, copy describing another. Each run
 * abandons itself as soon as it is no longer the latest.
 */
let runId = 0;

/** Resolve the step: navigate if needed, wait for the target, scroll it in, measure. */
async function resolveStep() {
    const step = currentStep.value;
    if (!step) return;
    const myRun = ++runId;
    ready.value = false;
    currentEls = [];
    rect.value = null;

    // 1. Navigate if the step lives on another route. middleware/network.global.ts
    //    re-navigates to stamp `?network=`, so this can be two transitions and the
    //    first promise may reject — swallow it and let the polling below settle.
    if (step.route && route.path !== step.route) {
        try { await router.push(step.route); } catch { /* redirected by middleware — fine */ }
        await nextTick();
        if (myRun !== runId) return;
    }

    // 2. No target => centred card (welcome step).
    if (!step.target) { ready.value = true; return; }

    // 3. Wait for the element(s). Missing after the timeout => centred-card fallback.
    const selectors = Array.isArray(step.target) ? step.target : [step.target];
    const found = (await Promise.all(selectors.map((s) => waitForEl(s))))
        .filter((el): el is HTMLElement => !!el);
    if (myRun !== runId) return;

    // Graceful degradation: never auto-skip. A cascade of auto-skips would end
    // the tour silently with no explanation.
    if (found.length === 0) { ready.value = true; return; }

    currentEls = found;
    found[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    // scrollIntoView with smooth behaviour is asynchronous; measuring immediately
    // yields a stale rect and the spotlight lands off-target.
    await new Promise((r) => setTimeout(r, 380));
    if (myRun !== runId) return;
    measure();
    ready.value = true;
}

watch([active, index], ([on]) => { if (on) resolveStep(); }, { immediate: true });

// The click blocker cannot intercept the browser back button. Without this the
// target unmounts, `currentEls` holds detached nodes, and the next re-measure
// collapses the spotlight to a dot. Re-resolving recovers (or falls back to the
// centred card). Safe against the router.push inside resolveStep: by the time
// this fires the route already matches, so no second navigation happens, and
// the runId guard retires the superseded run.
watch(() => route.fullPath, () => { if (active.value) resolveStep(); });

// Keep the spotlight glued to its element.
function onViewportChange() { if (active.value) measure(); }

function onKeydown(e: KeyboardEvent) {
    if (!active.value) return;
    if (e.key === 'Escape') { e.preventDefault(); skip(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
}

onMounted(() => {
    window.addEventListener('resize', onViewportChange);
    // capture: true so inner scroll containers also trigger a re-measure.
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', onViewportChange);
    window.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('keydown', onKeydown);
    popoverRo?.disconnect();
    popoverRo = null;
});

const spotlightStyle = computed(() => {
    const r = rect.value;
    if (!r) return { display: 'none' };
    return {
        position: 'fixed' as const,
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
    };
});

/** Popover position: honour `placement`, flip when it would overflow, clamp to viewport. */
const popoverStyle = computed(() => {
    const r = rect.value;
    const vw = import.meta.client ? window.innerWidth : 1280;
    const vh = import.meta.client ? window.innerHeight : 800;

    if (!r) {
        // Centred fallback.
        return {
            position: 'fixed' as const,
            top: '50%',
            left: '50%',
            width: `${POPOVER_W}px`,
            maxHeight: `${vh - 24}px`,
            transform: 'translate(-50%, -50%)',
        };
    }

    const h = popoverH.value;
    let placement = currentStep.value?.placement ?? 'bottom';
    if (placement === 'bottom' && r.top + r.height + GAP + h > vh) placement = 'top';
    if (placement === 'top' && r.top - GAP - h < 0) placement = 'bottom';
    if (placement === 'right' && r.left + r.width + GAP + POPOVER_W > vw) placement = 'bottom';
    if (placement === 'left' && r.left - GAP - POPOVER_W < 0) placement = 'bottom';

    let top: number;
    let left: number;
    if (placement === 'bottom') { top = r.top + r.height + GAP; left = r.left + r.width / 2 - POPOVER_W / 2; }
    else if (placement === 'top') { top = r.top - GAP - h; left = r.left + r.width / 2 - POPOVER_W / 2; }
    else if (placement === 'right') { top = r.top; left = r.left + r.width + GAP; }
    else { top = r.top; left = r.left - GAP - POPOVER_W; }

    left = Math.min(Math.max(left, 12), vw - POPOVER_W - 12);
    // Math.max guards the case where the card is taller than the viewport:
    // pin it to the top and let it scroll rather than clamping to a negative.
    top = Math.min(Math.max(top, 12), Math.max(12, vh - h - 12));

    return {
        position: 'fixed' as const,
        top: `${top}px`,
        left: `${left}px`,
        width: `${POPOVER_W}px`,
        maxHeight: `${vh - 24}px`,
    };
});
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div v-if="active && currentStep" class="fixed inset-0 z-[1500]">
                <!-- Interaction blocker. The tour is read-only. -->
                <div class="absolute inset-0" @click.stop />

                <!-- Spotlight: transparent hole punched out of a 9999px dimming shadow. -->
                <div
                    v-show="rect"
                    :style="spotlightStyle"
                    class="pointer-events-none rounded-lg ring-2 ring-primary transition-all duration-300 ease-out"
                    style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);"
                />
                <!-- No target resolved: dim the whole screen instead of nothing. -->
                <div v-if="!rect" class="pointer-events-none absolute inset-0 bg-black/55" />

                <!-- Popover -->
                <div
                    v-show="ready"
                    ref="popoverEl"
                    :style="popoverStyle"
                    class="z-[1501] overflow-y-auto rounded-xl border bg-popover p-5 shadow-xl"
                    role="dialog"
                    aria-modal="true"
                    :aria-label="$t(`tour.steps.${currentStep.id}.title`)"
                >
                    <button
                        class="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        :aria-label="$t('tour.skip')"
                        @click="skip()"
                    >
                        <X class="h-3.5 w-3.5" />
                    </button>

                    <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {{ $t('tour.progress', { current: index + 1, total }) }}
                    </p>
                    <h2 class="mt-1 pr-6 text-base font-semibold text-foreground">
                        {{ $t(`tour.steps.${currentStep.id}.title`) }}
                    </h2>
                    <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {{ $t(`tour.steps.${currentStep.id}.body`) }}
                    </p>

                    <!-- Progress dots -->
                    <div class="mt-4 flex items-center gap-1.5">
                        <button
                            v-for="(s, i) in steps"
                            :key="s.id"
                            class="h-1.5 rounded-full transition-all"
                            :class="i === index ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'"
                            :aria-label="$t('tour.progress', { current: i + 1, total })"
                            @click="goTo(i)"
                        />
                    </div>

                    <div class="mt-4 flex items-center justify-between gap-2">
                        <button
                            class="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                            @click="skip()"
                        >
                            {{ $t('tour.skip') }}
                        </button>
                        <div class="flex items-center gap-2">
                            <button
                                v-if="!isFirst"
                                class="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                                @click="prev()"
                            >
                                <ChevronLeft class="h-3.5 w-3.5" />
                                {{ $t('tour.back') }}
                            </button>
                            <button
                                class="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                @click="isLast ? finish() : next()"
                            >
                                {{ isLast ? $t('tour.finish') : $t('tour.next') }}
                                <ChevronRight v-if="!isLast" class="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
