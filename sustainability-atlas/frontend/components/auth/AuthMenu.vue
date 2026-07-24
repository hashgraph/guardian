<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { LogIn, UserCircle, Users, LogOut, ChevronDown } from 'lucide-vue-next';

const { user, isAuthenticated, isAdmin, openSignIn, logout } = useAuth();

const open = ref(false);
const menuRef = ref<HTMLElement | null>(null);
onClickOutside(menuRef, () => { open.value = false; });

const initials = computed(() => {
    const u = user.value;
    if (!u) return '';
    const f = u.firstName?.trim();
    const l = u.lastName?.trim();
    if (f || l) return `${f?.[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase();
    return u.email.slice(0, 2).toUpperCase();
});

const displayName = computed(() => {
    const u = user.value;
    if (!u) return '';
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.email;
});

const router = useRouter();

function go(path: string) {
    open.value = false;
    router.push(path);
}

async function onLogout() {
    open.value = false;
    await logout();
    router.push('/');
}
</script>

<template>
    <!-- Guest: Sign In button -->
    <button
        v-if="!isAuthenticated"
        class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        @click="openSignIn()"
    >
        <LogIn class="h-3.5 w-3.5" />
        <span>{{ $t('auth.signIn') }}</span>
    </button>

    <!-- Authenticated: user dropdown -->
    <div v-else ref="menuRef" class="relative flex items-center">
        <button
            class="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            :class="open ? 'bg-muted text-foreground' : 'text-muted-foreground'"
            @click="open = !open"
        >
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {{ initials }}
            </span>
            <span class="hidden max-w-[140px] truncate sm:block">{{ displayName }}</span>
            <ChevronDown class="h-3 w-3 opacity-50 transition-transform" :class="open ? 'rotate-180' : ''" />
        </button>

        <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-if="open"
                class="absolute right-0 top-full mt-1 w-60 rounded-md border bg-popover p-1 shadow-md"
            >
                <div class="border-b px-3 py-2">
                    <p class="truncate text-sm font-medium text-foreground">{{ displayName }}</p>
                    <p class="truncate text-xs text-muted-foreground">{{ user?.email }}</p>
                    <p class="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {{ isAdmin ? $t('auth.roleAdmin') : $t('auth.roleUser') }}
                    </p>
                </div>

                <!-- API Keys live inside View Profile, so no separate entry here. -->
                <button
                    class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="go('/account')"
                >
                    <UserCircle class="h-4 w-4" />
                    <span class="flex-1 text-left">{{ $t('auth.viewProfile') }}</span>
                </button>

                <button
                    v-if="isAdmin"
                    class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="go('/admin/users')"
                >
                    <Users class="h-4 w-4" />
                    <span class="flex-1 text-left">{{ $t('auth.userManagement') }}</span>
                </button>

                <div class="my-1 border-t" />

                <button
                    class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                    @click="onLogout()"
                >
                    <LogOut class="h-4 w-4" />
                    <span class="flex-1 text-left">{{ $t('auth.signOut') }}</span>
                </button>
            </div>
        </Transition>
    </div>
</template>
