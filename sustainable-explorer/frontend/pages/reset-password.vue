<script setup lang="ts">
import { Loader2, CheckCircle2 } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { resetPassword, openSignIn } = useAuth();
const { t } = useI18n();

const token = computed(() => (route.query.token as string | undefined)?.trim() ?? '');

const newPassword = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');
const done = ref(false);

async function onSubmit() {
    error.value = '';
    if (!token.value) {
        error.value = t('reset.missingToken');
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

            <form class="mt-4 space-y-3" @submit.prevent="onSubmit()">
                <div>
                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('reset.newPassword') }}</label>
                    <input v-model="newPassword" type="password" required autocomplete="new-password" minlength="12"
                        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.confirmPassword') }}</label>
                    <input v-model="confirm" type="password" required autocomplete="new-password" minlength="12"
                        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <p class="text-xs text-muted-foreground">{{ $t('auth.passwordHint') }}</p>
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
