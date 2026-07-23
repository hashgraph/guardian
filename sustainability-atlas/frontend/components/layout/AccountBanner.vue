<script setup lang="ts">
import { MailWarning, Loader2 } from 'lucide-vue-next';

const { isAuthenticated, user, openSignIn, resendVerification } = useAuth();
const { t } = useI18n();

const unverified = computed(() => isAuthenticated.value && !!user.value && !user.value.emailVerifiedAt);

const resending = ref(false);
const notice = ref('');
const cooldown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

function startCooldown(seconds: number) {
    cooldown.value = seconds;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        cooldown.value = Math.max(0, cooldown.value - 1);
        if (cooldown.value === 0 && timer) { clearInterval(timer); timer = null; }
    }, 1000);
}

onUnmounted(() => { if (timer) clearInterval(timer); });

async function resend() {
    if (resending.value || cooldown.value > 0) return;
    resending.value = true;
    notice.value = '';
    try {
        const res = await resendVerification();
        notice.value = res.message;
        if (res.retryAfterSeconds) startCooldown(res.retryAfterSeconds);
        else if (res.sent) startCooldown(60);
    } catch {
        notice.value = t('auth.errorGeneric');
    } finally {
        resending.value = false;
    }
}
</script>

<template>
    <!-- Guest — slim green bar with an inline "sign in from here" link -->
    <div
        v-if="!isAuthenticated"
        class="border-b border-green-200 bg-green-50 px-6 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
    >
        {{ $t('banner.guest') }}
        <button
            type="button"
            class="font-medium text-green-700 underline underline-offset-2 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            @click="openSignIn()"
        >
            {{ $t('banner.signInHere') }}
        </button>
    </div>

    <!-- Authenticated but email not verified — rounded amber/orange warning -->
    <div
        v-else-if="unverified"
        class="mx-4 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-300 bg-orange-100 px-4 py-2.5 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
    >
        <span class="flex items-center gap-2 font-medium">
            <MailWarning class="h-4 w-4 shrink-0" />
            {{ notice || $t('banner.unverified', { email: user?.email }) }}
        </span>
        <button
            :disabled="resending || cooldown > 0"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-orange-400 bg-orange-200/60 px-3 py-1 text-xs font-semibold text-orange-900 hover:bg-orange-200 disabled:opacity-60 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-200 dark:hover:bg-orange-900/60"
            @click="resend()"
        >
            <Loader2 v-if="resending" class="h-3.5 w-3.5 animate-spin" />
            <template v-if="cooldown > 0">{{ $t('banner.resendIn', { s: cooldown }) }}</template>
            <template v-else>{{ $t('banner.resend') }}</template>
        </button>
    </div>
</template>
