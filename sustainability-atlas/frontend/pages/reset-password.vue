<script setup lang="ts">
import { Loader2, CheckCircle2, Eye, EyeOff, Check, AlertCircle } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { resetPassword, openSignIn, passwordPolicy, fetchPasswordPolicy } = useAuth();
const { t } = useI18n();

// Load the server's password policy once so the live rules match what the API enforces.
onMounted(() => { void fetchPasswordPolicy(); });

const token = computed(() => (route.query.token as string | undefined)?.trim() ?? '');

const newPassword = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');
const done = ref(false);

// Visibility toggles + live validation — same shared policy as sign-up / change.
const showNew = ref(false);
const showConfirm = ref(false);
const newTouched = ref(false);
const pwRules = computed(() => passwordRules(newPassword.value, passwordPolicy.value));
const pwValid = computed(() => isPasswordValid(newPassword.value, passwordPolicy.value));
const confirmMatch = computed(() => confirm.value.length > 0 && newPassword.value === confirm.value);
const confirmMismatch = computed(() => confirm.value.length > 0 && newPassword.value !== confirm.value);

async function onSubmit() {
    error.value = '';
    newTouched.value = true;
    if (!token.value) {
        error.value = t('reset.missingToken');
        return;
    }
    if (!pwValid.value) {
        error.value = t('auth.passwordWeak');
        return;
    }
    if (newPassword.value !== confirm.value) {
        error.value = t('auth.errorPasswordMismatch');
        return;
    }
    loading.value = true;
    try {
        await resetPassword(token.value, newPassword.value);
        done.value = true;
    } catch (err) {
        const e = err as { data?: { message?: string | string[] } };
        const m = e?.data?.message;
        error.value = (Array.isArray(m) ? m[0] : m) || t('auth.errorGeneric');
    } finally {
        loading.value = false;
    }
}

function goSignIn() {
    router.push('/');
    openSignIn();
}
</script>

<template>
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
        <div v-if="done" class="flex flex-col items-center text-center">
            <CheckCircle2 class="h-10 w-10 text-green-600" />
            <h1 class="mt-4 text-xl font-semibold text-foreground">{{ $t('reset.doneTitle') }}</h1>
            <p class="mt-2 text-sm text-muted-foreground">{{ $t('reset.doneSubtitle') }}</p>
            <button
                class="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                @click="goSignIn()"
            >
                {{ $t('auth.signIn') }}
            </button>
        </div>

        <div v-else>
            <h1 class="text-xl font-semibold text-foreground">{{ $t('reset.title') }}</h1>
            <p class="mt-1 text-sm text-muted-foreground">{{ $t('reset.subtitle') }}</p>

            <div v-if="error" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {{ error }}
            </div>

            <form novalidate class="mt-4 space-y-3" @submit.prevent="onSubmit()">
                <div>
                    <label class="mb-1 block text-xs font-medium text-foreground">
                        {{ $t('reset.newPassword') }} <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                        <input v-model="newPassword" :type="showNew ? 'text' : 'password'" autocomplete="new-password"
                            :class="['w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary', newTouched && !pwValid ? 'border-red-500' : '']"
                            @input="newTouched = true" @blur="newTouched = true" />
                        <button type="button"
                            :aria-label="showNew ? $t('auth.hidePassword') : $t('auth.showPassword')"
                            class="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                            @click="showNew = !showNew">
                            <EyeOff v-if="showNew" class="h-4 w-4" />
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
                <button
                    type="submit" :disabled="loading"
                    class="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                    <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                    {{ $t('reset.submit') }}
                </button>
            </form>
        </div>
    </div>
</template>
