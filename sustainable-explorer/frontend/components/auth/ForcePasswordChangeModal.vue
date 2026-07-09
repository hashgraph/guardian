<script setup lang="ts">
import { KeyRound, Loader2, Eye, EyeOff, Check, AlertCircle } from 'lucide-vue-next';

const { isAuthenticated, user, changePassword, passwordPolicy, fetchPasswordPolicy } = useAuth();
const { t } = useI18n();

// Shown (and NOT dismissible) when the signed-in user must change their password
// — e.g. admin-created accounts and the seeded break-glass admin.
const show = computed(() => isAuthenticated.value && !!user.value?.mustChangePassword);

const current = ref('');
const next = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');

// Visibility toggles + live validation against the server policy (same as sign-up).
const showCurrent = ref(false);
const showNext = ref(false);
const showConfirm = ref(false);
const nextTouched = ref(false);
const pwRules = computed(() => passwordRules(next.value, passwordPolicy.value));
const pwValid = computed(() => isPasswordValid(next.value, passwordPolicy.value));
const confirmMatch = computed(() => confirm.value.length > 0 && next.value === confirm.value);
const confirmMismatch = computed(() => confirm.value.length > 0 && next.value !== confirm.value);

// Load the active policy as soon as the mandatory modal is shown.
watch(show, (visible) => { if (visible) void fetchPasswordPolicy(); }, { immediate: true });

async function onSubmit() {
    error.value = '';
    nextTouched.value = true;
    if (!pwValid.value) {
        error.value = t('auth.passwordWeak');
        return;
    }
    if (next.value !== confirm.value) {
        error.value = t('auth.errorPasswordMismatch');
        return;
    }
    loading.value = true;
    try {
        await changePassword(current.value, next.value);
        // user.mustChangePassword is now false → the modal closes automatically.
        current.value = '';
        next.value = '';
        confirm.value = '';
    } catch (err) {
        const e = err as { data?: { message?: string | string[] } };
        const m = e?.data?.message;
        error.value = (Array.isArray(m) ? m[0] : m) || t('auth.errorGeneric');
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <Teleport to="body">
        <div
            v-if="show"
            class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
        >
            <div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
                <div class="mb-4 flex items-center gap-2">
                    <KeyRound class="h-5 w-5 text-primary" />
                    <h2 class="text-lg font-semibold text-foreground">{{ $t('forcePassword.title') }}</h2>
                </div>
                <p class="mb-4 text-sm text-muted-foreground">{{ $t('forcePassword.subtitle') }}</p>

                <div v-if="error" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {{ error }}
                </div>

                <form novalidate class="space-y-3" @submit.prevent="onSubmit()">
                    <div>
                        <label class="mb-1 block text-xs font-medium text-foreground">
                            {{ $t('forcePassword.current') }} <span class="text-red-500">*</span>
                        </label>
                        <div class="relative">
                            <input v-model="current" :type="showCurrent ? 'text' : 'password'" autocomplete="current-password"
                                class="w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            <button type="button"
                                :aria-label="showCurrent ? $t('auth.hidePassword') : $t('auth.showPassword')"
                                class="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                                @click="showCurrent = !showCurrent">
                                <EyeOff v-if="showCurrent" class="h-4 w-4" />
                                <Eye v-else class="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="mb-1 block text-xs font-medium text-foreground">
                            {{ $t('forcePassword.new') }} <span class="text-red-500">*</span>
                        </label>
                        <div class="relative">
                            <input v-model="next" :type="showNext ? 'text' : 'password'" autocomplete="new-password"
                                :class="['w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary', nextTouched && !pwValid ? 'border-red-500' : '']"
                                @input="nextTouched = true" @blur="nextTouched = true" />
                            <button type="button"
                                :aria-label="showNext ? $t('auth.hidePassword') : $t('auth.showPassword')"
                                class="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                                @click="showNext = !showNext">
                                <EyeOff v-if="showNext" class="h-4 w-4" />
                                <Eye v-else class="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="mb-1 block text-xs font-medium text-foreground">
                            {{ $t('auth.confirmPassword') }} <span class="text-red-500">*</span>
                        </label>
                        <div class="relative">
                            <input v-model="confirm" :type="showConfirm ? 'text' : 'password'" autocomplete="new-password"
                                :class="['w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary', confirmMismatch ? 'border-red-500' : confirmMatch ? 'border-green-500' : '']" />
                            <button type="button"
                                :aria-label="showConfirm ? $t('auth.hidePassword') : $t('auth.showPassword')"
                                class="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                                @click="showConfirm = !showConfirm">
                                <EyeOff v-if="showConfirm" class="h-4 w-4" />
                                <Eye v-else class="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <!-- Live password strength rules -->
                    <ul class="grid grid-cols-2 gap-x-3 gap-y-1">
                        <li v-for="rule in pwRules" :key="rule.key"
                            class="flex items-center gap-1.5 text-xs"
                            :class="rule.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'">
                            <Check v-if="rule.ok" class="h-3.5 w-3.5 shrink-0" />
                            <span v-else class="h-3.5 w-3.5 shrink-0 rounded-full border border-current" />
                            {{ $t(rule.labelKey, rule.labelParams ?? {}) }}
                        </li>
                    </ul>

                    <!-- Confirm-password match feedback (real-time) -->
                    <p v-if="confirmMismatch" class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle class="h-3.5 w-3.5 shrink-0" /> {{ $t('auth.errorPasswordMismatch') }}
                    </p>
                    <p v-else-if="confirmMatch" class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Check class="h-3.5 w-3.5 shrink-0" /> {{ $t('auth.passwordsMatch') }}
                    </p>
                    <button type="submit" :disabled="loading"
                        class="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                        {{ $t('forcePassword.submit') }}
                    </button>
                </form>
            </div>
        </div>
    </Teleport>
</template>
