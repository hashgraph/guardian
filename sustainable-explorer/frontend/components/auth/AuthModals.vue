<script setup lang="ts">
import { X, Loader2 } from 'lucide-vue-next';
import type { SignUpPayload } from '~/composables/useAuth';

const { modal, closeModal, openSignIn, openSignUp, login, signup, forgotPassword } = useAuth();
const { t } = useI18n();

const loading = ref(false);
const error = ref('');
const notice = ref('');
const forgotMode = ref(false);
const forgotEmail = ref('');

// Sign-in fields
const email = ref('');
const password = ref('');

// Sign-up fields
const suEmail = ref('');
const suPassword = ref('');
const suConfirm = ref('');
const suFirstName = ref('');
const suLastName = ref('');
const suOrganisation = ref('');
const suCountry = ref('');

function resetState() {
    loading.value = false;
    error.value = '';
    notice.value = '';
}

function reset() {
    resetState();
    forgotMode.value = false;
    forgotEmail.value = '';
    email.value = '';
    password.value = '';
    suEmail.value = '';
    suPassword.value = '';
    suConfirm.value = '';
    suFirstName.value = '';
    suLastName.value = '';
    suOrganisation.value = '';
    suCountry.value = '';
}

function close() {
    reset();
    closeModal();
}

function switchTo(view: 'signin' | 'signup') {
    resetState();
    forgotMode.value = false;
    if (view === 'signin') openSignIn();
    else openSignUp();
}

async function onForgot() {
    resetState();
    loading.value = true;
    try {
        const res = await forgotPassword(forgotEmail.value.trim());
        notice.value = res.message;
    } catch (err) {
        error.value = apiError(err);
    } finally {
        loading.value = false;
    }
}

function apiError(err: unknown): string {
    const e = err as { data?: { message?: string | string[] } };
    const m = e?.data?.message;
    if (Array.isArray(m)) return m[0] ?? t('auth.errorGeneric');
    return m || t('auth.errorGeneric');
}

async function onSignIn() {
    resetState();
    loading.value = true;
    try {
        await login(email.value.trim(), password.value);
        close();
    } catch (err) {
        error.value = apiError(err);
    } finally {
        loading.value = false;
    }
}

async function onSignUp() {
    resetState();
    if (suPassword.value !== suConfirm.value) {
        error.value = t('auth.errorPasswordMismatch');
        return;
    }
    if (!suCountry.value.trim()) {
        error.value = t('country.required');
        return;
    }
    loading.value = true;
    try {
        const payload: SignUpPayload = {
            email: suEmail.value.trim(),
            password: suPassword.value,
            firstName: suFirstName.value.trim(),
            lastName: suLastName.value.trim(),
            country: suCountry.value.trim(),
            organisation: suOrganisation.value.trim() || undefined,
        };
        const res = await signup(payload);
        notice.value = res.message;
    } catch (err) {
        error.value = apiError(err);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition ease-out duration-150"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition ease-in duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="modal"
                class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
            >
                <div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
                    <div class="mb-4 flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-foreground">
                                {{ modal === 'signup' ? $t('auth.createAccount') : forgotMode ? $t('auth.forgotTitle') : $t('auth.welcomeBack') }}
                            </h2>
                            <p class="mt-0.5 text-sm text-muted-foreground">
                                {{ modal === 'signup' ? $t('auth.signUpSubtitle') : forgotMode ? $t('auth.forgotSubtitle') : $t('auth.signInSubtitle') }}
                            </p>
                        </div>
                        <button class="rounded-md p-1 text-muted-foreground hover:bg-muted" @click="close()">
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <!-- Success notice (signup) -->
                    <div v-if="notice" class="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">
                        {{ notice }}
                        <button class="mt-3 block font-medium underline" @click="switchTo('signin')">
                            {{ $t('auth.backToSignIn') }}
                        </button>
                    </div>

                    <template v-else>
                        <!-- Error -->
                        <div v-if="error" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                            {{ error }}
                        </div>

                        <!-- Sign in -->
                        <form v-if="modal === 'signin' && !forgotMode" class="space-y-3" @submit.prevent="onSignIn()">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.email') }}</label>
                                <input
                                    v-model="email" type="email" required autocomplete="email"
                                    class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <div class="mb-1 flex items-center justify-between">
                                    <label class="block text-xs font-medium text-foreground">{{ $t('auth.password') }}</label>
                                    <button type="button" class="text-xs font-medium text-primary hover:underline" @click="forgotMode = true; resetState()">
                                        {{ $t('auth.forgotPassword') }}
                                    </button>
                                </div>
                                <input
                                    v-model="password" type="password" required autocomplete="current-password"
                                    class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <button
                                type="submit" :disabled="loading"
                                class="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                            >
                                <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                                {{ $t('auth.signIn') }}
                            </button>
                            <p class="text-center text-sm text-muted-foreground">
                                {{ $t('auth.noAccount') }}
                                <button type="button" class="font-medium text-primary hover:underline" @click="switchTo('signup')">
                                    {{ $t('auth.createAccount') }}
                                </button>
                            </p>
                        </form>

                        <!-- Forgot password -->
                        <form v-else-if="modal === 'signin' && forgotMode" class="space-y-3" @submit.prevent="onForgot()">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.email') }}</label>
                                <input
                                    v-model="forgotEmail" type="email" required autocomplete="email"
                                    class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <button
                                type="submit" :disabled="loading"
                                class="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                            >
                                <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                                {{ $t('auth.sendResetLink') }}
                            </button>
                            <p class="text-center text-sm text-muted-foreground">
                                <button type="button" class="font-medium text-primary hover:underline" @click="forgotMode = false; resetState()">
                                    {{ $t('auth.backToSignIn') }}
                                </button>
                            </p>
                        </form>

                        <!-- Sign up -->
                        <form v-else class="space-y-3" @submit.prevent="onSignUp()">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.firstName') }}</label>
                                    <input v-model="suFirstName" type="text" required autocomplete="given-name"
                                        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.lastName') }}</label>
                                    <input v-model="suLastName" type="text" required autocomplete="family-name"
                                        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.email') }}</label>
                                <input v-model="suEmail" type="email" required autocomplete="email"
                                    class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.password') }}</label>
                                    <input v-model="suPassword" type="password" required autocomplete="new-password" minlength="12"
                                        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.confirmPassword') }}</label>
                                    <input v-model="suConfirm" type="password" required autocomplete="new-password" minlength="12"
                                        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <p class="text-xs text-muted-foreground">{{ $t('auth.passwordHint') }}</p>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.organisation') }}</label>
                                    <input v-model="suOrganisation" type="text" autocomplete="organization"
                                        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.country') }}</label>
                                    <CountrySelect v-model="suCountry" :placeholder="$t('country.placeholder')" />
                                </div>
                            </div>
                            <button
                                type="submit" :disabled="loading"
                                class="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                            >
                                <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                                {{ $t('auth.createAccount') }}
                            </button>
                            <p class="text-center text-sm text-muted-foreground">
                                {{ $t('auth.haveAccount') }}
                                <button type="button" class="font-medium text-primary hover:underline" @click="switchTo('signin')">
                                    {{ $t('auth.signIn') }}
                                </button>
                            </p>
                        </form>
                    </template>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
