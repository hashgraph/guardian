<script setup lang="ts">
import { Toaster } from 'vue-sonner';
</script>

<template>
    <div class="flex min-h-screen">
        <AppSidebar />
        <div class="flex flex-1 flex-col overflow-auto">
            <AppTopbar />
            <main class="flex-1">
                <slot />
            </main>
        </div>
        <FeedbackWidget />
        <Toaster position="bottom-right" rich-colors />
    </div>
</template>
