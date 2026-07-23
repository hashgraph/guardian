<script setup lang="ts">
import { CheckCircle2, XCircle, Loader2 } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const { verifyEmail, openSignIn, fetchMe, isAuthenticated } = useAuth();

const status = ref<'pending' | 'success' | 'error'>('pending');
const message = ref('');

onMounted(async () => {
    const token = (route.query.token as string | undefined)?.trim();
    if (!token) {
        status.value = 'error';
        message.value = 'Missing verification token.';
        return;
    }
    try {
        const res = await verifyEmail(token);
        status.value = 'success';
        message.value = res.message;
        // If the user is signed in (same browser), refresh their profile so the
        // "verify your email" banner clears immediately.
        if (isAuthenticated.value) {
            await fetchMe();
        }
    } catch (err) {
        const e = err as { data?: { message?: string } };
        status.value = 'error';
        message.value = e?.data?.message || 'This verification link is invalid or has expired.';
    }
});

function goSignIn() {
    router.push('/');
    openSignIn();
}
</script>

<template>
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <Loader2 v-if="status === 'pending'" class="h-10 w-10 animate-spin text-primary" />
        <CheckCircle2 v-else-if="status === 'success'" class="h-10 w-10 text-green-600" />
        <XCircle v-else class="h-10 w-10 text-red-600" />

        <h1 class="mt-4 text-xl font-semibold text-foreground">
            {{ status === 'pending' ? $t('verify.verifying') : status === 'success' ? $t('verify.verified') : $t('verify.failed') }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">{{ message }}</p>

        <!-- These links are single-use and expire in 24h. On failure, guide the
             user to sign in and request a fresh link from the in-app banner. -->
        <p v-if="status === 'error'" class="mt-2 max-w-sm text-xs text-muted-foreground">
            {{ $t('verify.failedHelp') }}
        </p>

        <button
            v-if="status !== 'pending'"
            class="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            @click="goSignIn()"
        >
            {{ $t('auth.signIn') }}
        </button>
    </div>
</template>
