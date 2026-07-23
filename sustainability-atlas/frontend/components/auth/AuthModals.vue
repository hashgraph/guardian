<script setup lang="ts">
import { X, Loader2, Eye, EyeOff, Check, AlertCircle } from 'lucide-vue-next';
import type { SignUpPayload } from '~/composables/useAuth';

const { modal, closeModal, openSignIn, openSignUp, login, signup, forgotPassword, passwordPolicy, fetchPasswordPolicy } = useAuth();
const { t } = useI18n();

// Load the server's password policy once so the live rules match what the API enforces.
onMounted(() => { void fetchPasswordPolicy(); });

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

// Password visibility toggles (TC_USR_SU_02)
const showPassword = ref(false);
const showConfirm = ref(false);

// Per-field "touched" tracking so real-time errors only appear after the user
// has interacted with (or attempted to submit) a field — not on first render.
const touched = reactive({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirm: false,
    country: false,
});

// Email + password validation use the shared auth policy (isEmailValid /
// passwordRules) so sign-up, sign-in, forgot, reset and change-password agree.
const emailValid = computed(() => isEmailValid(suEmail.value));

// Sign-in email FE validation (TC_USR_SI_01) — blocks the network request on a
// malformed address; a valid format still yields the neutral server error.
const signinEmailTouched = ref(false);
const errSigninEmail = computed(() => {
    if (!signinEmailTouched.value) return '';
    if (!email.value.trim()) return t('auth.emailRequired');
    if (!isEmailValid(email.value)) return t('auth.emailInvalid');
    return '';
});

// Forgot-password email FE validation (TC_USR_FPW_01).
const forgotEmailTouched = ref(false);
const errForgotEmail = computed(() => {
    if (!forgotEmailTouched.value) return '';
    if (!forgotEmail.value.trim()) return t('auth.emailRequired');
    if (!isEmailValid(forgotEmail.value)) return t('auth.emailInvalid');
    return '';
});

// Live password strength rules (TC_USR_SU_02) — driven by the server policy.
const pwRules = computed(() => passwordRules(suPassword.value, passwordPolicy.value));
const pwValid = computed(() => isPasswordValid(suPassword.value, passwordPolicy.value));
const confirmMatch = computed(() => suConfirm.value.length > 0 && suPassword.value === suConfirm.value);
const confirmMismatch = computed(() => suConfirm.value.length > 0 && suPassword.value !== suConfirm.value);

// Inline, field-level error messages (shown only once the field is touched).
const errFirstName = computed(() => (touched.firstName && !suFirstName.value.trim() ? t('auth.firstNameRequired') : ''));
const errLastName = computed(() => (touched.lastName && !suLastName.value.trim() ? t('auth.lastNameRequired') : ''));
const errEmail = computed(() => {
    if (!touched.email) return '';
    if (!suEmail.value.trim()) return t('auth.emailRequired');
    if (!emailValid.value) return t('auth.emailInvalid');
    return '';
});
const errPassword = computed(() => {
    if (!touched.password) return '';
    if (!suPassword.value) return t('auth.passwordRequired');
    if (!pwValid.value) return t('auth.passwordWeak');
    return '';
});
const errConfirm = computed(() => {
    if (!touched.confirm) return '';
    if (!suConfirm.value) return t('auth.confirmRequired');
    if (confirmMismatch.value) return t('auth.errorPasswordMismatch');
    return '';
});
const errCountry = computed(() => (touched.country && !suCountry.value.trim() ? t('country.required') : ''));

const signupValid = computed(() =>
    !!suFirstName.value.trim() &&
    !!suLastName.value.trim() &&
    emailValid.value &&
    pwValid.value &&
    confirmMatch.value &&
    !!suCountry.value.trim(),
);

function resetState() {
    loading.value = false;
    error.value = '';
    notice.value = '';
}

function resetTouched() {
    touched.firstName = false;
    touched.lastName = false;
    touched.email = false;
    touched.password = false;
    touched.confirm = false;
    touched.country = false;
}

function reset() {
    resetState();
    resetTouched();
    signinEmailTouched.value = false;
    forgotEmailTouched.value = false;
    showPassword.value = false;
    showConfirm.value = false;
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
    forgotEmailTouched.value = true;
    if (!isEmailValid(forgotEmail.value)) return; // inline error does the messaging
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
    signinEmailTouched.value = true;
    if (!isEmailValid(email.value)) return; // inline error does the messaging
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
    // Mark every field touched so all inline errors surface on a submit attempt.
    touched.firstName = touched.lastName = touched.email = true;
    touched.password = touched.confirm = touched.country = true;
    if (!signupValid.value) return; // inline field errors do the messaging
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
                        <form v-if="modal === 'signin' && !forgotMode" novalidate class="space-y-3" @submit.prevent="onSignIn()">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.email') }}</label>
                                <input
                                    v-model="email" type="email" autocomplete="email"
                                    :class="['w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', errSigninEmail ? 'border-red-500' : '']"
                                    @input="signinEmailTouched = true" @blur="signinEmailTouched = true"
                                />
                                <p v-if="errSigninEmail" class="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle class="h-3.5 w-3.5 shrink-0" /> {{ errSigninEmail }}
                                </p>
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
                        <form v-else-if="modal === 'signin' && forgotMode" novalidate class="space-y-3" @submit.prevent="onForgot()">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.email') }}</label>
                                <input
                                    v-model="forgotEmail" type="email" autocomplete="email"
                                    :class="['w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', errForgotEmail ? 'border-red-500' : '']"
                                    @input="forgotEmailTouched = true" @blur="forgotEmailTouched = true"
                                />
                                <p v-if="errForgotEmail" class="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle class="h-3.5 w-3.5 shrink-0" /> {{ errForgotEmail }}
                                </p>
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
                        <form v-else novalidate class="space-y-3" @submit.prevent="onSignUp()">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">
                                        {{ $t('auth.firstName') }} <span class="text-red-500">*</span>
                                    </label>
                                    <input v-model="suFirstName" type="text" autocomplete="given-name"
                                        :class="['w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', errFirstName ? 'border-red-500' : '']"
                                        @blur="touched.firstName = true" />
                                    <p v-if="errFirstName" class="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                        <AlertCircle class="h-3.5 w-3.5 shrink-0" /> {{ errFirstName }}
                                    </p>
                                </div>
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">
                                        {{ $t('auth.lastName') }} <span class="text-red-500">*</span>
                                    </label>
                                    <input v-model="suLastName" type="text" autocomplete="family-name"
                                        :class="['w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', errLastName ? 'border-red-500' : '']"
                                        @blur="touched.lastName = true" />
                                    <p v-if="errLastName" class="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                        <AlertCircle class="h-3.5 w-3.5 shrink-0" /> {{ errLastName }}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">
                                    {{ $t('auth.email') }} <span class="text-red-500">*</span>
                                </label>
                                <input v-model="suEmail" type="email" autocomplete="email"
                                    :class="['w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', errEmail ? 'border-red-500' : '']"
                                    @input="touched.email = true" @blur="touched.email = true" />
                                <p v-if="errEmail" class="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle class="h-3.5 w-3.5 shrink-0" /> {{ errEmail }}
                                </p>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">
                                        {{ $t('auth.password') }} <span class="text-red-500">*</span>
                                    </label>
                                    <div class="relative">
                                        <input v-model="suPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
                                            :class="['w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary', errPassword ? 'border-red-500' : '']"
                                            @input="touched.password = true" @blur="touched.password = true" />
                                        <button type="button"
                                            :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')"
                                            class="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                                            @click="showPassword = !showPassword">
                                            <EyeOff v-if="showPassword" class="h-4 w-4" />
                                            <Eye v-else class="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">
                                        {{ $t('auth.confirmPassword') }} <span class="text-red-500">*</span>
                                    </label>
                                    <div class="relative">
                                        <input v-model="suConfirm" :type="showConfirm ? 'text' : 'password'" autocomplete="new-password"
                                            :class="['w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary', errConfirm ? 'border-red-500' : confirmMatch ? 'border-green-500' : '']"
                                            @input="touched.confirm = true" @blur="touched.confirm = true" />
                                        <button type="button"
                                            :aria-label="showConfirm ? $t('auth.hidePassword') : $t('auth.showPassword')"
                                            class="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                                            @click="showConfirm = !showConfirm">
                                            <EyeOff v-if="showConfirm" class="h-4 w-4" />
                                            <Eye v-else class="h-4 w-4" />
                                        </button>
                                    </div>
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
                            <p v-if="errConfirm" class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                <AlertCircle class="h-3.5 w-3.5 shrink-0" /> {{ errConfirm }}
                            </p>
                            <p v-else-if="confirmMatch" class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Check class="h-3.5 w-3.5 shrink-0" /> {{ $t('auth.passwordsMatch') }}
                            </p>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.organisation') }}</label>
                                    <input v-model="suOrganisation" type="text" autocomplete="organization"
                                        class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label class="mb-1 block text-xs font-medium text-foreground">
                                        {{ $t('auth.country') }} <span class="text-red-500">*</span>
                                    </label>
                                    <CountrySelect v-model="suCountry" :placeholder="$t('country.placeholder')"
                                        @update:model-value="touched.country = true" />
                                    <p v-if="errCountry" class="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                        <AlertCircle class="h-3.5 w-3.5 shrink-0" /> {{ errCountry }}
                                    </p>
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
