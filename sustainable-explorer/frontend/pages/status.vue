<script setup lang="ts">
import { Activity, CheckCircle2, Clock, AlertCircle } from 'lucide-vue-next';

const queues = [
    { name: 'mirror-node-topics', waiting: 3, active: 2, completed: 1247, failed: 0 },
    { name: 'mirror-node-messages', waiting: 45, active: 10, completed: 52340, failed: 12 },
    { name: 'mirror-node-tokens', waiting: 0, active: 1, completed: 890, failed: 0 },
    { name: 'ipfs-files', waiting: 18, active: 3, completed: 8920, failed: 45 },
    { name: 'guardian-api-sync', waiting: 0, active: 0, completed: 340, failed: 2 },
    { name: 'maintenance-refresh-mvs', waiting: 0, active: 0, completed: 1440, failed: 0 },
];

const syncDate = new Date(Date.now() - 15 * 60 * 1000);
const syncDateFormatted = syncDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const syncTimeFormatted = syncDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-5">
            <h1 class="text-2xl font-bold text-foreground">Sync Status</h1>
            <p class="text-sm text-muted-foreground mt-1">Data pipeline and worker queue metrics</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 pb-6">
            <div class="rounded-xl border bg-card p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Synced Up To</span>
                <div class="text-lg font-bold text-foreground mt-2">{{ syncDateFormatted }}</div>
                <div class="flex items-center gap-1.5 mt-1">
                    <CheckCircle2 class="h-3.5 w-3.5 text-stat-green" />
                    <span class="text-xs text-muted-foreground">{{ syncTimeFormatted }}</span>
                </div>
            </div>
            <div class="rounded-xl border bg-card p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Topics Indexed</span>
                <div class="text-2xl font-bold text-foreground mt-2">1,247</div>
                <p class="text-xs text-muted-foreground mt-1">of ~1,700 discovered</p>
            </div>
            <div class="rounded-xl border bg-card p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Messages Processed</span>
                <div class="text-2xl font-bold text-foreground mt-2">52,340</div>
                <p class="text-xs text-muted-foreground mt-1">45 pending in queue</p>
            </div>
        </div>

        <div class="border-t">
            <div class="px-6 py-4">
                <h2 class="text-base font-semibold text-foreground">Queue Status</h2>
                <p class="text-xs text-muted-foreground mt-0.5">BullMQ worker queues</p>
            </div>
            <div class="px-6 pb-6">
                <div class="rounded-xl border bg-card overflow-hidden">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b bg-muted/30">
                                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Queue</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Waiting</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</th>
                                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr v-for="q in queues" :key="q.name" class="hover:bg-muted/30 transition-colors">
                                <td class="py-2.5 px-4 font-mono text-xs text-foreground">{{ q.name }}</td>
                                <td class="py-2.5 px-4 text-right tabular-nums">
                                    <span v-if="q.waiting" class="text-stat-amber font-medium">{{ q.waiting }}</span>
                                    <span v-else class="text-muted-foreground">0</span>
                                </td>
                                <td class="py-2.5 px-4 text-right tabular-nums">
                                    <span v-if="q.active" class="text-stat-blue font-medium">{{ q.active }}</span>
                                    <span v-else class="text-muted-foreground">0</span>
                                </td>
                                <td class="py-2.5 px-4 text-right tabular-nums text-stat-green">{{ q.completed.toLocaleString() }}</td>
                                <td class="py-2.5 px-4 text-right tabular-nums">
                                    <span v-if="q.failed" class="text-stat-rose font-medium">{{ q.failed }}</span>
                                    <span v-else class="text-muted-foreground">0</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
