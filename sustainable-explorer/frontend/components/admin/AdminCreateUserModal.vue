<script setup lang="ts">
import { X, Loader2, Shield, User } from 'lucide-vue-next';
import type { AdminRole, AdminCreateUserBody } from '~/composables/useAdminUsers';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>();

const { create } = useAdminUsers();
const { t } = useI18n();

const role = ref<AdminRole>('system_user');
const email = ref('');
const password = ref('');
const firstName = ref('');
const lastName = ref('');
const organisation = ref('');
const country = ref('');

const loading = ref(false);
const error = ref('');

function reset() {
    role.value = 'system_user';
    email.value = '';
    password.value = '';
    firstName.value = '';
    lastName.value = '';
    organisation.value = '';
    country.value = '';
    error.value = '';
    loading.value = false;
}

// Reset whenever the modal is (re)opened.
watch(() => props.open, (open) => { if (open) reset(); });

function close() {
    emit('close');
}

async function onSubmit() {
    error.value = '';
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
        error.value = (Array.isArray(m) ? m[0] : m) || t('auth.errorGeneric');
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
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.firstName') }}</label>
                                <input v-model="firstName" type="text"
                                    class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.lastName') }}</label>
                                <input v-model="lastName" type="text"
                                    class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>

                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.email') }}</label>
                            <input v-model="email" type="email" required autocomplete="off"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>

                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('userMgmt.initialPassword') }}</label>
                            <input v-model="password" type="password" required minlength="12" autocomplete="new-password"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            <p class="mt-1 text-xs text-muted-foreground">{{ $t('userMgmt.passwordNote') }}</p>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.organisation') }}</label>
                                <input v-model="organisation" type="text"
                                    class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.country') }}</label>
                                <CountrySelect v-model="country" :placeholder="$t('country.placeholder')" />
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
