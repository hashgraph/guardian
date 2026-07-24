<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>

<template>
    <div class="flex min-h-screen">
        <AppSidebar />
        <div class="flex flex-1 flex-col min-w-0">
            <AppTopbar />
            <AccountBanner />
            <main class="flex-1 pb-24">
                <slot />
            </main>
        </div>
        <FeedbackWidget />
        <AuthModals />
        <ForcePasswordChangeModal />
        <Toaster position="bottom-right" rich-colors />
    </div>
</template>
