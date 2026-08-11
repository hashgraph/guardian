<script setup lang="ts">
import { X, Loader2, Shield, User, Eye, EyeOff } from 'lucide-vue-next';
import type { AdminRole, AdminCreateUserBody } from '~/composables/useAdminUsers';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>();

const { create } = useAdminUsers();
const { passwordPolicy, fetchPasswordPolicy } = useAuth();
const { t } = useI18n();

const role = ref<AdminRole>('system_user');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const firstName = ref('');
const lastName = ref('');
const organisation = ref('');
const country = ref('');

const loading = ref(false);
const error = ref('');

// Live password rules driven by the server policy (same as sign-up).
const pwRules = computed(() => passwordRules(password.value, passwordPolicy.value));
const pwValid = computed(() => isPasswordValid(password.value, passwordPolicy.value));

type FieldErrors = {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    country?: string;
};
const fieldErrors = ref<FieldErrors>({});

function reset() {
    role.value = 'system_user';
    email.value = '';
    password.value = '';
    showPassword.value = false;
    firstName.value = '';
    lastName.value = '';
    organisation.value = '';
    country.value = '';
    error.value = '';
    fieldErrors.value = {};
    loading.value = false;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(): boolean {
    const errors: FieldErrors = {};

    if (!firstName.value.trim()) errors.firstName = t('userMgmt.validation.firstNameRequired');
    if (!lastName.value.trim()) errors.lastName = t('userMgmt.validation.lastNameRequired');

    const emailValue = email.value.trim();
    if (!emailValue) errors.email = t('userMgmt.validation.emailRequired');
    else if (!EMAIL_RE.test(emailValue)) errors.email = t('userMgmt.validation.emailInvalid');

    if (!password.value) errors.password = t('userMgmt.validation.passwordRequired');
    else if (!pwValid.value) errors.password = t('auth.passwordWeak');

    if (!country.value.trim()) errors.country = t('userMgmt.validation.countryRequired');

    fieldErrors.value = errors;
    return Object.keys(errors).length === 0;
}

// Reset whenever the modal is (re)opened; load the active password policy too.
watch(() => props.open, (open) => { if (open) { reset(); void fetchPasswordPolicy(); } });

function close() {
    emit('close');
}

async function onSubmit() {
    error.value = '';
    if (!validate()) return;
    loading.value = true;
    try {
        const body: AdminCreateUserBody = {
            email: email.value.trim(),
            password: password.value,
            role: role.value,
            firstName: firstName.value.trim() || undefined,
            lastName: lastName.value.trim() || undefined,
            organisation: organisation.value.trim() || undefined,
            country: country.value.trim() || undefined,
        };
        await create(body);
        emit('created');
        close();
    } catch (err) {
        const e = err as { data?: { message?: string | string[] } };
        const m = e?.data?.message;
        const messages = Array.isArray(m) ? m : m ? [m] : [];
        // Surface a friendly, field-level message instead of the raw
        // class-validator text (e.g. "email should be email").
        const emailMsg = messages.find((msg) => /email/i.test(msg));
        if (emailMsg) fieldErrors.value = { ...fieldErrors.value, email: t('userMgmt.validation.emailInvalid') };
        error.value = emailMsg ? '' : (messages[0] || t('auth.errorGeneric'));
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100"
            leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0"
        >
            <div
                v-if="open"
                class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
            >
                <div class="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
                    <div class="mb-4 flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-foreground">{{ $t('userMgmt.createTitle') }}</h2>
                            <p class="mt-0.5 text-sm text-muted-foreground">{{ $t('userMgmt.createSubtitle') }}</p>
                        </div>
                        <button class="rounded-md p-1 text-muted-foreground hover:bg-muted" @click="close()">
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <div v-if="error" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                        {{ error }}
                    </div>

                    <form class="space-y-4" @submit.prevent="onSubmit()">
                        <!-- Role radio -->
                        <div>
                            <label class="mb-1.5 block text-xs font-medium text-foreground">{{ $t('userMgmt.role') }}</label>
                            <div class="grid grid-cols-2 gap-3">
                                <label
                                    class="flex cursor-pointer items-start gap-2 rounded-md border p-3 transition-colors"
                                    :class="role === 'system_user' ? 'border-primary bg-primary/5' : 'hover:bg-muted'"
                                >
                                    <input v-model="role" type="radio" value="system_user" class="mt-0.5" />
                                    <span>
                                        <span class="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                            <User class="h-3.5 w-3.5" /> {{ $t('auth.roleUser') }}
                                        </span>
                                        <span class="mt-0.5 block text-xs text-muted-foreground">{{ $t('userMgmt.roleUserDesc') }}</span>
                                    </span>
                                </label>
                                <label
                                    class="flex cursor-pointer items-start gap-2 rounded-md border p-3 transition-colors"
                                    :class="role === 'admin' ? 'border-primary bg-primary/5' : 'hover:bg-muted'"
                                >
                                    <input v-model="role" type="radio" value="admin" class="mt-0.5" />
                                    <span>
                                        <span class="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                            <Shield class="h-3.5 w-3.5" /> {{ $t('auth.roleAdmin') }}
                                        </span>
                                        <span class="mt-0.5 block text-xs text-muted-foreground">{{ $t('userMgmt.roleAdminDesc') }}</span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.firstName') }} <span class="text-red-500">*</span></label>
                                <input v-model="firstName" type="text"
                                    :class="['w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', fieldErrors.firstName ? 'border-red-500' : '']"
                                    @input="fieldErrors.firstName = ''" />
                                <p v-if="fieldErrors.firstName" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ fieldErrors.firstName }}</p>
                            </div>
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.lastName') }} <span class="text-red-500">*</span></label>
                                <input v-model="lastName" type="text"
                                    :class="['w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', fieldErrors.lastName ? 'border-red-500' : '']"
                                    @input="fieldErrors.lastName = ''" />
                                <p v-if="fieldErrors.lastName" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ fieldErrors.lastName }}</p>
                            </div>
                        </div>

                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.email') }} <span class="text-red-500">*</span></label>
                            <input v-model="email" type="email" autocomplete="off"
                                :class="['w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', fieldErrors.email ? 'border-red-500' : '']"
                                @input="fieldErrors.email = ''" />
                            <p v-if="fieldErrors.email" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ fieldErrors.email }}</p>
                        </div>

                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('userMgmt.initialPassword') }} <span class="text-red-500">*</span></label>
                            <div class="relative">
                                <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
                                    :class="['w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary', fieldErrors.password ? 'border-red-500' : '']"
                                    @input="fieldErrors.password = ''" />
                                <button type="button"
                                    :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')"
                                    class="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground"
                                    @click="showPassword = !showPassword">
                                    <EyeOff v-if="showPassword" class="h-4 w-4" />
                                    <Eye v-else class="h-4 w-4" />
                                </button>
                            </div>
                            <p v-if="fieldErrors.password" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ fieldErrors.password }}</p>
                            <!-- Live password rules from the server policy -->
                            <ul class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                                <li v-for="rule in pwRules" :key="rule.key"
                                    class="flex items-center gap-1.5 text-xs"
                                    :class="rule.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'">
                                    <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="rule.ok ? 'bg-green-500' : 'bg-current opacity-40'" />
                                    {{ $t(rule.labelKey, rule.labelParams ?? {}) }}
                                </li>
                            </ul>
                            <p class="mt-1 text-xs text-muted-foreground">{{ $t('userMgmt.passwordNote') }}</p>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.organisation') }}</label>
                                <input v-model="organisation" type="text"
                                    class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.country') }} <span class="text-red-500">*</span></label>
                                <CountrySelect v-model="country" :placeholder="$t('country.placeholder')" @update:model-value="fieldErrors.country = ''" />
                                <p v-if="fieldErrors.country" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ fieldErrors.country }}</p>
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2 pt-1">
                            <button type="button" class="rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted" @click="close()">
                                {{ $t('userMgmt.cancel') }}
                            </button>
                            <button type="submit" :disabled="loading"
                                class="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                                <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                                {{ $t('userMgmt.createButton') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
