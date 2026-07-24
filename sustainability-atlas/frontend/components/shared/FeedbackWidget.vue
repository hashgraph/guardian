<script setup lang="ts">
import { ref } from 'vue';
import { MessageSquarePlus, X, Send, Camera, Loader2, Trash2 } from 'lucide-vue-next';

const { t } = useI18n();
const config = useRuntimeConfig();

// Opt-in: the widget only renders when a webhook URL is configured.
const webhookUrl = (config.public.feedbackWebhookUrl as string) || '';
const feedbackToken = (config.public.feedbackToken as string) || '';

const open = ref(false);
const description = ref('');
const email = ref('');
const screenshot = ref<string | null>(null);
const capturing = ref(false);
const submitting = ref(false);
const error = ref('');

function openForm() {
    open.value = true;
}

function closeForm() {
    open.value = false;
    description.value = '';
    email.value = '';
    screenshot.value = null;
    error.value = '';
}

async function captureScreenshot() {
    if (!import.meta.client) return;
    capturing.value = true;
    error.value = '';
    try {
        // html2canvas-pro: drop-in fork that understands modern CSS color
        // functions (color-mix/oklch/lab) emitted by Tailwind v4, which the
        // original html2canvas chokes on.
        const html2canvas = (await import('html2canvas-pro')).default;
        const canvas = await html2canvas(document.body, {
            logging: false,
            useCORS: true,
            scale: Math.min(window.devicePixelRatio || 1, 1),
            // Exclude the feedback widget itself (FAB + modal) from the snapshot.
            ignoreElements: (el: Element) =>
                el instanceof HTMLElement && el.hasAttribute('data-feedback-ignore'),
        });
        // JPEG @ 0.7 keeps the payload small enough for the Apps Script POST.
        screenshot.value = canvas.toDataURL('image/jpeg', 0.7);
    } catch (e) {
        // Surface the real cause in the console; show a friendly message in the UI.
        console.error('[feedback] screenshot capture failed:', e);
        error.value = t('feedback.screenshotError');
    } finally {
        capturing.value = false;
    }
}

function removeScreenshot() {
    screenshot.value = null;
}

async function submit() {
    if (!description.value.trim()) {
        error.value = t('feedback.descriptionRequired');
        return;
    }
    const trimmedEmail = email.value.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        error.value = t('feedback.emailInvalid');
        return;
    }
    submitting.value = true;
    error.value = '';
    try {
        await $fetch(webhookUrl, {
            method: 'POST',
            // text/plain is a "simple" content type, so the browser skips the
            // CORS preflight that the Apps Script endpoint can't answer.
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                token: feedbackToken,
                url: window.location.href,
                description: description.value.trim(),
                email: trimmedEmail,
                screenshot: screenshot.value ?? '',
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
            }),
        });
        const { toast } = await import('vue-sonner');
        toast.success(t('feedback.success'));
        closeForm();
    } catch {
        error.value = t('feedback.error');
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
    <div v-if="webhookUrl" data-feedback-ignore>
        <!-- Floating action button -->
        <button
            v-if="!open"
            type="button"
            class="fixed bottom-5 right-5 z-[1100] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            :title="t('feedback.button')"
            @click="openForm"
        >
            <MessageSquarePlus class="h-4 w-4" />
            <span class="hidden sm:inline">{{ t('feedback.button') }}</span>
        </button>

        <!-- Modal -->
        <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-if="open"
                class="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/30"
                @click.self="closeForm"
            >
                <div class="bg-card rounded-xl border shadow-xl p-5 w-full max-w-md space-y-4 mx-4 mb-4 sm:mb-0">
                    <!-- Header -->
                    <div class="flex items-center justify-between">
                        <h3 class="font-semibold text-foreground">{{ t('feedback.title') }}</h3>
                        <button
                            type="button"
                            class="text-muted-foreground hover:text-foreground transition-colors"
                            :title="t('feedback.close')"
                            @click="closeForm"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <!-- Current page URL (informational) -->
                    <p class="text-xs text-muted-foreground truncate">
                        {{ t('feedback.page') }}: <span class="font-mono">{{ $route.fullPath }}</span>
                    </p>

                    <!-- Description (required) -->
                    <div class="space-y-1">
                        <label class="text-sm font-medium text-foreground">
                            {{ t('feedback.descriptionLabel') }} <span class="text-destructive">*</span>
                        </label>
                        <textarea
                            v-model="description"
                            rows="4"
                            :placeholder="t('feedback.placeholder')"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                        />
                    </div>

                    <!-- Email (optional) -->
                    <div class="space-y-1">
                        <label class="text-sm font-medium text-foreground">
                            {{ t('feedback.emailLabel') }}
                            <span class="font-normal text-muted-foreground">({{ t('feedback.optional') }})</span>
                        </label>
                        <input
                            v-model="email"
                            type="email"
                            :placeholder="t('feedback.emailPlaceholder')"
                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <p class="text-xs text-muted-foreground">{{ t('feedback.emailHint') }}</p>
                    </div>

                    <!-- Screenshot -->
                    <div class="space-y-2">
                        <div v-if="!screenshot" class="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                :disabled="capturing"
                                @click="captureScreenshot"
                            >
                                <Loader2 v-if="capturing" class="h-3.5 w-3.5 animate-spin" />
                                <Camera v-else class="h-3.5 w-3.5" />
                                {{ t('feedback.attachScreenshot') }}
                            </Button>
                            <span class="text-xs text-muted-foreground">{{ t('feedback.optional') }}</span>
                        </div>
                        <div v-else class="relative inline-block">
                            <img
                                :src="screenshot"
                                alt="screenshot preview"
                                class="max-h-40 rounded-md border"
                            />
                            <button
                                type="button"
                                class="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                                :title="t('feedback.removeScreenshot')"
                                @click="removeScreenshot"
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <!-- Error -->
                    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>

                    <!-- Footer -->
                    <div class="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" :disabled="submitting" @click="closeForm">
                            {{ t('feedback.cancel') }}
                        </Button>
                        <Button
                            size="sm"
                            :disabled="submitting || !description.trim()"
                            @click="submit"
                        >
                            <Loader2 v-if="submitting" class="h-3.5 w-3.5 animate-spin" />
                            <Send v-else class="h-3.5 w-3.5" />
                            {{ t('feedback.submit') }}
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>
