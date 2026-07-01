<script setup lang="ts">
import { KeyRound, Loader2 } from 'lucide-vue-next';

const { isAuthenticated, user, changePassword } = useAuth();
const { t } = useI18n();

// Shown (and NOT dismissible) when the signed-in user must change their password
// — e.g. admin-created accounts and the seeded break-glass admin.
const show = computed(() => isAuthenticated.value && !!user.value?.mustChangePassword);

const current = ref('');
const next = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');

async function onSubmit() {
    error.value = '';
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

                <form class="space-y-3" @submit.prevent="onSubmit()">
                    <div>
                        <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('forcePassword.current') }}</label>
                        <input v-model="current" type="password" required autocomplete="current-password"
                            class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                        <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('forcePassword.new') }}</label>
                        <input v-model="next" type="password" required minlength="12" autocomplete="new-password"
                            class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                        <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.confirmPassword') }}</label>
                        <input v-model="confirm" type="password" required minlength="12" autocomplete="new-password"
                            class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <p class="text-xs text-muted-foreground">{{ $t('auth.passwordHint') }}</p>
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
