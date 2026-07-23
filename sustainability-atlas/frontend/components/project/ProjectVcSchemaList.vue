<script setup lang="ts">
import { ChevronDown, Database, FileText, Layers, Loader2, Search, X } from 'lucide-vue-next';
import type { LinkedSchema, VcDocData, VcField, VcGroup } from '~/types/models';
import InfoTooltip from '~/components/shared/InfoTooltip.vue';

const props = withDefaults(defineProps<{
    schemas: LinkedSchema[];
    dataBySchema: Record<string, VcDocData[]>;
    pending: Record<string, boolean>;
    openSchema: Record<string, boolean>;
    openRecord: Record<string, boolean>;
    emptyMessage: string;
    searchPlaceholder?: string;
}>(), {
    searchPlaceholder: 'Search fields, values, tables...',
});

const emit = defineEmits<{
    'toggle-schema': [schemaUuid: string];
    'toggle-record': [key: string];
}>();

const searchQuery = defineModel<string>('searchQuery', { default: '' });

function humanizeKey(key: string): string {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Description reads as the actual business meaning of a field ("Unique ID for
 * the project"); label is often just the raw schema field key ("projectId")
 * re-cased, which is far less useful as the primary heading. Show the
 * description as the heading when one exists, and move the technical label
 * into the tooltip instead of hiding the more meaningful text there.
 */
function fieldHeading(f: VcField): string {
    return f.description || f.label;
}
function fieldTooltip(f: VcField): string | undefined {
    return f.description ? f.label : undefined;
}

function filterDoc(doc: VcDocData, q: string): VcDocData | null {
    if (!q) return doc;
    const fieldMatches = (f: VcField) =>
        f.label.toLowerCase().includes(q)
        || f.value.toLowerCase().includes(q)
        || (f.description?.toLowerCase().includes(q) ?? false);
    const fields = doc.fields.filter(fieldMatches);
    const tables = doc.tables.filter(t =>
        t.label.toLowerCase().includes(q)
        || t.columns.some(c => humanizeKey(c).toLowerCase().includes(q))
        || t.rows.some(r => Object.values(r).some(v => v.toLowerCase().includes(q))),
    );
    const groups = doc.groups
        .map(g => {
            const gf = g.fields.filter(fieldMatches);
            const gt = g.tables.filter(t =>
                t.label.toLowerCase().includes(q)
                || t.rows.some(r => Object.values(r).some(v => v.toLowerCase().includes(q))),
            );
            if (gf.length === 0 && gt.length === 0 && !g.title.toLowerCase().includes(q)) return null;
            return { ...g, fields: gf.length > 0 || g.title.toLowerCase().includes(q) ? (gf.length > 0 ? gf : g.fields) : gf, tables: gt.length > 0 || g.title.toLowerCase().includes(q) ? (gt.length > 0 ? gt : g.tables) : gt };
        })
        .filter((g): g is VcGroup => g !== null);
    if (fields.length === 0 && tables.length === 0 && groups.length === 0) return null;
    return { fields, tables, groups };
}

function getFilteredDocs(schemaUuid: string): VcDocData[] {
    const docs = props.dataBySchema[schemaUuid];
    if (!docs) return [];
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return docs;
    return docs.map(d => filterDoc(d, q)).filter((d): d is VcDocData => d !== null);
}
</script>

<template>
    <div class="space-y-4">
        <!-- Search filter -->
        <div class="relative">
            <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
                v-model="searchQuery"
                type="text"
                :placeholder="searchPlaceholder"
                class="w-full h-9 rounded-lg border border-input bg-card pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
                v-if="searchQuery"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                @click="searchQuery = ''"
            >
                <X class="h-3.5 w-3.5" />
            </button>
        </div>

        <template v-if="schemas.length">
            <div
                v-for="schema in schemas"
                :key="schema.schemaUuid"
                class="rounded-xl border overflow-hidden"
                :class="schema.vcCount === 0 ? 'bg-muted/30 opacity-60' : 'bg-card'"
            >
                <!-- Schema header -->
                <button
                    class="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors"
                    :class="schema.vcCount === 0 ? 'cursor-default' : 'hover:bg-muted/30'"
                    :disabled="schema.vcCount === 0"
                    @click="schema.vcCount > 0 && emit('toggle-schema', schema.schemaUuid)"
                >
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div
                            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            :class="schema.vcCount > 0 ? 'bg-primary/10' : 'bg-muted'"
                        >
                            <FileText class="h-3.5 w-3.5" :class="schema.vcCount > 0 ? 'text-primary' : 'text-muted-foreground'" />
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-sm font-semibold truncate" :class="schema.vcCount > 0 ? 'text-foreground' : 'text-muted-foreground'">
                                {{ schema.schemaName || schema.schemaUuid }}
                            </h3>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span
                                    v-if="schema.isProjectSchema"
                                    class="text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5"
                                >Project Schema</span>
                                <span
                                    class="text-[10px] font-medium rounded-full px-2 py-0.5"
                                    :class="schema.vcCount > 0
                                        ? 'bg-stat-green/10 text-stat-green'
                                        : 'bg-muted text-muted-foreground'"
                                >
                                    {{ schema.vcCount }} record{{ schema.vcCount !== 1 ? 's' : '' }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <ChevronDown
                        v-if="schema.vcCount > 0"
                        class="h-4 w-4 text-muted-foreground transition-transform shrink-0"
                        :class="openSchema[schema.schemaUuid] ? 'rotate-180' : ''"
                    />
                </button>

                <!-- Schema VC data (grouped, leveled view) -->
                <template v-if="!openSchema[schema.schemaUuid]" />
                <template v-else-if="pending[schema.schemaUuid]">
                    <div class="border-t px-5 py-6 text-center">
                        <div class="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 class="h-3.5 w-3.5 animate-spin" />
                            Loading document data...
                        </div>
                    </div>
                </template>
                <template v-else-if="dataBySchema[schema.schemaUuid]">
                    <!-- No search results for this schema -->
                    <div
                        v-if="getFilteredDocs(schema.schemaUuid).length === 0 && searchQuery.trim()"
                        class="border-t px-5 py-6 text-center text-xs text-muted-foreground"
                    >
                        No matching fields found in this schema.
                    </div>
                    <div
                        v-for="(doc, vcIdx) in getFilteredDocs(schema.schemaUuid)"
                        :key="vcIdx"
                    >
                        <!-- Record header (collapsible when multiple) -->
                        <button
                            v-if="getFilteredDocs(schema.schemaUuid).length > 1"
                            class="w-full border-t px-5 py-3 bg-primary/8 flex items-center gap-2 hover:bg-primary/12 transition-colors text-left"
                            @click="emit('toggle-record', `${schema.schemaUuid}-${vcIdx}`)"
                        >
                            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">
                                {{ vcIdx + 1 }}
                            </div>
                            <span class="text-sm font-semibold text-foreground flex-1">Record {{ vcIdx + 1 }}</span>
                            <span class="text-[10px] text-muted-foreground mr-2">{{ doc.fields.length + doc.groups.reduce((s, g) => s + g.fields.length, 0) }} fields</span>
                            <ChevronDown
                                class="h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0"
                                :class="(openRecord[`${schema.schemaUuid}-${vcIdx}`] ?? true) ? 'rotate-180' : ''"
                            />
                        </button>
                        <div v-else class="border-t" />

                        <!-- Record content (collapsible) -->
                        <template v-if="getFilteredDocs(schema.schemaUuid).length <= 1 || (openRecord[`${schema.schemaUuid}-${vcIdx}`] ?? true)">
                            <!-- Top-level fields -->
                            <div v-if="doc.fields.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                                <div
                                    v-for="f in doc.fields"
                                    :key="f.label"
                                    class="bg-card px-5 py-3"
                                >
                                    <div class="flex items-center gap-1 mb-0.5">
                                        <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ fieldHeading(f) }}</span>
                                        <InfoTooltip v-if="fieldTooltip(f)" :text="fieldTooltip(f)!" />
                                    </div>
                                    <div class="text-sm text-foreground break-words">{{ f.value }}</div>
                                </div>
                                <div v-if="doc.fields.length % 2 === 1" class="hidden sm:block bg-card" />
                            </div>

                            <!-- Top-level tables (arrays of objects) -->
                            <div v-for="tbl in doc.tables" :key="tbl.label" class="border-t">
                                <div class="px-5 py-2.5 bg-muted/40 flex items-center gap-2 border-b">
                                    <Database class="h-3.5 w-3.5 text-primary/60" />
                                    <span class="text-xs font-semibold text-foreground">{{ tbl.label }}</span>
                                    <span class="text-[10px] text-muted-foreground">{{ tbl.rows.length }} entries</span>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-sm">
                                        <thead>
                                            <tr class="bg-muted/20 border-b">
                                                <th
                                                    v-for="col in tbl.columns"
                                                    :key="col"
                                                    class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                                                >{{ humanizeKey(col) }}</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y">
                                            <tr v-for="(row, rIdx) in tbl.rows" :key="rIdx" class="hover:bg-muted/20">
                                                <td
                                                    v-for="col in tbl.columns"
                                                    :key="col"
                                                    class="py-2 px-4 text-foreground tabular-nums max-w-[300px]"
                                                    :title="row[col]"
                                                >
                                                    <span class="block truncate">{{ row[col] }}</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Nested groups (sub-schemas) -->
                            <div
                                v-for="group in doc.groups"
                                :key="group.title"
                                class="border-t"
                            >
                                <div class="px-5 py-2.5 bg-muted/40 flex items-center gap-2 border-b">
                                    <Layers class="h-3.5 w-3.5 text-primary/60" />
                                    <span class="text-xs font-semibold text-foreground">{{ group.title }}</span>
                                    <span class="text-[10px] text-muted-foreground">{{ group.fields.length }} fields</span>
                                </div>
                                <div v-if="group.fields.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
                                    <div
                                        v-for="f in group.fields"
                                        :key="f.label"
                                        class="bg-card px-5 py-3"
                                    >
                                        <div class="flex items-center gap-1 mb-0.5">
                                            <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ fieldHeading(f) }}</span>
                                            <InfoTooltip v-if="fieldTooltip(f)" :text="fieldTooltip(f)!" />
                                        </div>
                                        <div class="text-sm text-foreground break-words tabular-nums">{{ f.value }}</div>
                                    </div>
                                    <template v-for="_ in (3 - (group.fields.length % 3)) % 3" :key="'pad-' + _">
                                        <div class="hidden lg:block bg-card" />
                                    </template>
                                    <div v-if="group.fields.length % 2 === 1" class="hidden sm:block lg:hidden bg-card" />
                                </div>
                                <!-- Tables inside groups -->
                                <div v-for="tbl in group.tables" :key="tbl.label" class="border-t">
                                    <div class="px-5 py-2 bg-muted/20 flex items-center gap-2 border-b">
                                        <Database class="h-3 w-3 text-muted-foreground" />
                                        <span class="text-[11px] font-medium text-foreground">{{ tbl.label }}</span>
                                        <span class="text-[10px] text-muted-foreground">{{ tbl.rows.length }} entries</span>
                                    </div>
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-sm">
                                            <thead>
                                                <tr class="bg-muted/10 border-b">
                                                    <th
                                                        v-for="col in tbl.columns"
                                                        :key="col"
                                                        class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                                                    >{{ humanizeKey(col) }}</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y">
                                                <tr v-for="(row, rIdx) in tbl.rows" :key="rIdx" class="hover:bg-muted/20">
                                                    <td
                                                        v-for="col in tbl.columns"
                                                        :key="col"
                                                        class="py-2 px-4 text-foreground tabular-nums whitespace-nowrap"
                                                    >{{ row[col] }}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div v-if="doc.fields.length === 0 && doc.groups.length === 0 && doc.tables.length === 0" class="px-5 py-6 text-center text-xs text-muted-foreground">
                                No fields available.
                            </div>
                        </template>
                    </div>
                </template>
            </div>
        </template>
        <div v-else class="rounded-xl border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            {{ emptyMessage }}
        </div>
    </div>
</template>
