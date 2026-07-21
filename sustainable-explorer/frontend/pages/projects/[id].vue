<script setup lang="ts">
import {
    BookOpen, Coins, Layers, Shield,
    Globe, MapPin,
    Network, FileText, ChevronDown,
    FolderKanban, BarChart3, RotateCcw, CloudDownload, Download,
    ListChecks, TrendingUp, GitBranch, ArrowRight, Radio,
} from 'lucide-vue-next';
import type { Component } from 'vue';
import type { Credit, VcDocData } from '~/types/models';
import { formatCredits } from '~/lib/format';
import { exportProject, type ExportFormat } from '~/lib/project-export';
import { getSDG } from '~/lib/sdgs';
import { useDecodedMethodologyApi } from '~/composables/api/useDecodedMethodologyApi';
import { COUNTRY_ALPHA3 } from '~/composables/useProjects';
import { nominatimReverse, nominatimCountryCenter } from '~/composables/useNominatim';

const route = useRoute();
const { network } = useNetwork();
const projectId = computed(() => route.params.id as string);
const { project, pending } = useProjectDetail(projectId);

// When the API returns no country (UNK) but we have valid coordinates, fall back
// to a Nominatim reverse-geocode lookup so the correct flag is shown.
const geocodedCountry = ref<{ code: string; name: string } | null>(null);
watch(project, async (p) => {
    geocodedCountry.value = null;
    if (!p || p.countryCode !== 'UNK' || !p.lat || !p.lng) return;
    geocodedCountry.value = await nominatimReverse(p.lat, p.lng, n => COUNTRY_ALPHA3[n] ?? 'UNK');
}, { immediate: true });

const INVALID_COUNTRY = new Set([
    'not applicable', 'not specified', 'n/a', 'na', 'none', 'not stated',
    'not available', 'not provided', 'unknown',
    'point', 'multipoint', 'linestring', 'multilinestring',
    'polygon', 'multipolygon', 'geometrycollection',
]);
const displayCountryCode = computed(() => geocodedCountry.value?.code ?? project.value?.countryCode ?? 'UNK');
const displayCountry = computed(() => {
    const raw = (geocodedCountry.value?.name ?? project.value?.country ?? '').trim();
    if (!raw || INVALID_COUNTRY.has(raw.toLowerCase())) return '';
    // Never show a URL / IPFS-or-file URI / raw CID as a location.
    if (/:\/\//.test(raw) || /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{20,})$/i.test(raw)) return '';
    return raw;
});

// ─── Tabs (synced with URL hash) ──────────────────────────────────────────────

type TabKey = 'summary' | 'issuances' | 'documents' | 'mrv' | 'advanced';
const VALID_TABS = new Set<TabKey>(['summary', 'issuances', 'documents', 'mrv', 'advanced']);

const router = useRouter();
// Always start with 'summary' — route.hash is empty on the server (browsers strip fragments
// before sending HTTP requests), so initializing from it creates an SSR/client mismatch that
// corrupts hydration. The hash is applied client-side in onMounted after hydration completes.
const activeTab = ref<TabKey>('summary');
const tabReady = ref(false);
onMounted(() => {
    const h = (route.hash?.replace('#', '') ?? '') as TabKey;
    if (VALID_TABS.has(h)) activeTab.value = h;
    tabReady.value = true;
});

function setTab(key: TabKey) {
    activeTab.value = key;
    router.replace({ hash: key === 'summary' ? '' : `#${key}` });
}

const tabs = computed(() => {
    const list: { key: TabKey; label: string; icon: Component }[] = [
        { key: 'summary',   label: 'Summary',              icon: FolderKanban },
        { key: 'documents', label: 'Detailed Information',  icon: FileText },
        { key: 'issuances', label: 'Issuances & Credits',  icon: Coins },
    ];
    if (project.value?.hasMrvData) {
        list.push({ key: 'mrv', label: 'MRV External Data', icon: CloudDownload });
    }
    list.push({ key: 'advanced', label: 'Advanced', icon: Shield });
    return list;
});

// ─── VC business data (lazy-loaded per schema) ───────────────────────────────

// Shape of GET /projects/:id/additional-details — the backend now decodes the
// VC "Detailed Information" once (at ingestion) and returns it grouped by schema.
// Powers the Documents tab only — the MRV tab uses ProjectMrvDataExplorer's own
// server-paginated GET /projects/:id/mrv-data/:schemaUuid instead (MRV datasets
// can run to hundreds of thousands of records, too large to decode in one payload).
interface AdditionalDetailsSchema { schemaUuid: string; schemaName: string | null; docType: string; records: VcDocData[] }

const vcDataBySchema = ref<Record<string, VcDocData[]>>({});
const vcDataPending = ref<Record<string, boolean>>({});
const vcSchemaOpen = ref<Record<string, boolean>>({});
const vcRecordOpen = ref<Record<string, boolean>>({});
const docSearchQuery = ref('');
// Cache of the full additional-details payload — fetched once, sliced per schema.
const allAdditionalDetails = ref<AdditionalDetailsSchema[] | null>(null);

const mrvTotalRecords = computed(() => (project.value?.mrvSchemas ?? []).reduce((s, sch) => s + sch.vcCount, 0));

function bareUuid(schemaId: string): string {
    return schemaId.replace(/^#/, '').replace(/&.*$/, '');
}

function toggleSchema(schemaUuid: string) {
    if (vcDataBySchema.value[schemaUuid]) {
        vcSchemaOpen.value = { ...vcSchemaOpen.value, [schemaUuid]: !vcSchemaOpen.value[schemaUuid] };
    } else {
        vcSchemaOpen.value = { ...vcSchemaOpen.value, [schemaUuid]: true };
        loadSchemaVcData(schemaUuid);
    }
}

async function loadSchemaVcData(schemaUuid: string) {
    if (vcDataBySchema.value[schemaUuid] || vcDataPending.value[schemaUuid]) return;
    if (!project.value || !import.meta.client) return;
    const schema = project.value.linkedSchemas?.find(s => s.schemaUuid === schemaUuid)
        ?? project.value.mrvSchemas?.find(s => s.schemaUuid === schemaUuid);
    if (!schema?.linkedVcs.length) return;

    vcDataPending.value[schemaUuid] = true;
    try {
        // The detail payload is precomputed server-side and returned for every
        // schema in one call — fetch it once, then slice the records for the
        // requested schema on each toggle.
        if (!allAdditionalDetails.value) {
            const config = useRuntimeConfig();
            const baseURL = config.public.apiBaseUrl as string;
            allAdditionalDetails.value = await $fetch<AdditionalDetailsSchema[]>(
                `/api/v1/${network.value}/projects/${projectId.value}/additional-details`,
                { baseURL },
            );
        }
        const entry = allAdditionalDetails.value?.find(
            s => bareUuid(s.schemaUuid) === bareUuid(schemaUuid),
        );
        vcDataBySchema.value = { ...vcDataBySchema.value, [schemaUuid]: entry?.records ?? [] };
    } catch {
        vcDataBySchema.value = { ...vcDataBySchema.value, [schemaUuid]: [] };
    } finally {
        vcDataPending.value[schemaUuid] = false;
    }
}

// ─── VC JSON Viewer modal ──────────────────────────────────────────────────────

const vcViewerOpen = ref(false);
const vcViewerTitle = ref('');
const vcViewerData = ref<Record<string, any> | null>(null);

// "View Raw Data" — show the project's anchor VC document.
async function viewProjectVc() {
    if (!project.value) return;
    const schemas = project.value.linkedSchemas ?? [];
    const projectSchema = schemas.find(s => s.isProjectSchema && s.linkedVcs.length > 0);
    const fallback = schemas.find(s => s.schemaUuid !== 'MintToken' && s.linkedVcs.length > 0);
    const pick = projectSchema ?? fallback;
    const anchor = pick?.linkedVcs[0];

    if (anchor) {
        await handleViewVcJson(anchor.consensusTimestamp);
        vcViewerTitle.value = `${project.value.name} — ${pick!.schemaName ?? pick!.schemaUuid}`;
        return;
    }

    vcViewerTitle.value = project.value.name;
    vcViewerData.value = project.value as unknown as Record<string, any>;
    vcViewerOpen.value = true;
}

function handleViewVc(c: Credit) {
    vcViewerTitle.value = c.name;
    const issuance = project.value?.issuances?.find(i => i.tokenId === c.tokenId);
    vcViewerData.value = issuance?.rawVc ?? c.rawVc ?? null;
    vcViewerOpen.value = true;
}

async function handleViewVcJson(consensusTimestamp: string) {
    if (!project.value) return;
    if (!import.meta.client) return;
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    try {
        const data = await $fetch<Record<string, any>>(
            `/api/v1/${network.value}/projects/${projectId.value}/linked-vcs/${consensusTimestamp}`,
            { baseURL },
        );
        vcViewerTitle.value = consensusTimestamp;
        vcViewerData.value = data;
        vcViewerOpen.value = true;
    } catch {
        const { toast } = await import('vue-sonner');
        toast.error('Failed to load VC document');
    }
}

// ─── Re-extract action ────────────────────────────────────────────────────────

const { t } = useI18n();
// Re-extract / refresh-IPFS are admin-only maintenance actions (spec).
const { isAdmin } = useAuth();
const { header: csrfHeader } = useCsrf();
const reextractPending = ref(false);

async function triggerReextract() {
    if (!import.meta.client) return;
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    reextractPending.value = true;
    try {
        const res = await $fetch<{ enqueued: number }>(
            `/api/v1/${network.value}/projects/${projectId.value}/re-extract`,
            { method: 'POST', baseURL, credentials: 'include', headers: csrfHeader() },
        );
        const { toast } = await import('vue-sonner');
        if (res.enqueued === 0) {
            toast.info(t('projects.detail.actions.reextractEmpty'));
        } else {
            toast.success(t('projects.detail.actions.reextractSuccess', { count: res.enqueued }));
        }
    } catch {
        const { toast } = await import('vue-sonner');
        toast.error(t('projects.detail.actions.reextractError'));
    } finally {
        reextractPending.value = false;
    }
}

// ─── Refresh IPFS + reparse action ────────────────────────────────────────────

const refreshIpfsPending = ref(false);

async function triggerRefreshIpfs() {
    if (!import.meta.client) return;
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    refreshIpfsPending.value = true;
    try {
        const res = await $fetch<{ refreshed: number; reparseEnqueued: number }>(
            `/api/v1/${network.value}/projects/${projectId.value}/refresh-ipfs`,
            { method: 'POST', baseURL, credentials: 'include', headers: csrfHeader() },
        );
        const { toast } = await import('vue-sonner');
        const total = res.refreshed + res.reparseEnqueued;
        if (total === 0) {
            toast.info(t('projects.detail.actions.refreshIpfsEmpty'));
        } else {
            toast.success(t('projects.detail.actions.refreshIpfsSuccess', {
                refreshed: res.refreshed,
                reparse: res.reparseEnqueued,
            }));
        }
    } catch {
        const { toast } = await import('vue-sonner');
        toast.error(t('projects.detail.actions.refreshIpfsError'));
    } finally {
        refreshIpfsPending.value = false;
    }
}

// ─── Hashscan URL ──────────────────────────────────────────────────────────────

const hashscanTopicUrl = computed(() => {
    if (!project.value?.topicId) return '';
    return `https://hashscan.io/${network.value}/topic/${project.value.topicId}`;
});

// ─── Methodology name ──────────────────────────────────────────────────────────

const fullMethodologyName = computed(() => {
    if (!project.value) return '';
    return project.value.methodology || project.value.methodologyId || '';
});

// ─── Methodology field mapping (Advanced tab, lazy-loaded) ────────────────────

const methodologyMappingOpen = ref(false);
const methodologyMappingId = computed(() => project.value?.instanceTopicId ?? '');
const decodedMethodology = useDecodedMethodologyApi({
    id: methodologyMappingId,
    network: computed(() => network.value as string),
});
const methodologyMappingRows = computed(() => {
    const ps = decodedMethodology.data.value?.projectSchema;
    if (!ps) return [];
    const rf = ps.resolvedFields;
    return [
        { label: 'Project Title',         field: rf.name },
        { label: 'Country',               field: rf.country },
        { label: 'Developer',             field: rf.developer },
        { label: 'Category',              field: rf.category },
        { label: 'Scale',                 field: rf.scale },
        { label: 'Sector',                field: rf.sector },
        { label: 'Vintage / Start Date',  field: rf.vintageRaw },
        { label: 'Crediting Period',      field: rf.creditingPeriod },
        { label: 'SDGs / Co-benefits',    field: rf.sdgOrCobenefits },
        {
            label: 'Project Location',
            field: ps.geoKey
                ? { fieldKey: ps.geoKey, title: ps.geoFieldTitle ?? ps.geoKey, description: '' }
                : null,
        },
    ];
});

watch(methodologyMappingOpen, (open) => {
    if (open && methodologyMappingId.value && !decodedMethodology.loaded.value) {
        decodedMethodology.fetch();
    }
});

// ─── Effective map location (falls back to Nominatim country center when no coordinates) ──

const countryCenterCoords = ref<{ lat: number; lng: number } | null>(null);

watch(project, async (p) => {
    if (!p) return;
    const hasCoords = p.lat !== 0 || p.lng !== 0;
    if (hasCoords) { countryCenterCoords.value = null; return; }
    if (!p.country) return;
    countryCenterCoords.value = await nominatimCountryCenter(p.country);
}, { immediate: true });

// effectiveLocation is null while Nominatim is still fetching for zero-coord
// projects.  The map component handles this "not yet ready" state internally
// rather than relying on v-if to mount/unmount it — avoiding a Leaflet
// initialisation race when the component mounts mid-hydration.
const effectiveLocation = computed(() => {
    if (!project.value) return null;
    const hasCoords = project.value.lat !== 0 || project.value.lng !== 0;
    if (hasCoords) return { lat: project.value.lat, lng: project.value.lng, approximate: false };
    if (countryCenterCoords.value) return { ...countryCenterCoords.value, approximate: true };
    return null;
});

// ─── Emission data (currently all dashes) ─────────────────────────────────────

const emissions = computed(() => {
    if (!project.value) return null;
    // Show only if at least one field is not a dash
    const data = { baseline: '-', project: '-', leakage: '-', baselineEmissionFactor: '-' };
    const hasData = Object.values(data).some(v => v !== '-');
    return hasData ? data : null;
});
</script>

<template>
    <!-- Page-wide skeleton — shown while data is fetching OR while the tab hash is being resolved from the URL -->
    <div v-if="pending || !tabReady" class="space-y-6 p-6">
        <div class="space-y-3">
            <Skeleton class="h-4 w-36" />
            <Skeleton class="h-8 w-2/3" />
            <Skeleton class="h-4 w-1/2" />
        </div>
        <div class="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton class="h-4 w-1/4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-32 w-full" />
        </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!project" class="p-6">
        <h1 class="text-xl font-bold text-foreground">{{ $t('projects.notFound') }}</h1>
    </div>

    <!-- Project detail — rendered only after the correct tab is known -->
    <div v-else class="space-y-6 p-6">
        <ProjectHeader
            :project="project"
            :network="network"
            :display-country="displayCountry"
            :display-country-code="displayCountryCode"
            :hashscan-topic-url="hashscanTopicUrl"
            @view-raw-data="viewProjectVc"
        />

        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="border-b">
                <nav class="flex gap-0 -mb-px overflow-x-auto">
                    <button
                        v-for="tab in tabs"
                        :key="tab.key"
                        :class="[
                            activeTab === tab.key
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                        ]"
                        @click="setTab(tab.key)"
                    >
                        <component :is="tab.icon" class="h-4 w-4" />
                        {{ tab.label }}
                    </button>
                </nav>
            </div>

            <div>
            <!-- ── Tab: Summary ───────────────────────────────────────────────── -->
            <div v-if="activeTab === 'summary'" class="p-6 space-y-6">
                <!-- Key Facts -->
                <ProjectKeyFacts
                    :project="project"
                    :display-country="displayCountry"
                    :display-country-code="displayCountryCode"
                />

                <!-- Milestone Tracker (Registration → Validation → MRV Submission → Verification → Issuance) -->
                <div v-if="project.milestones?.length" class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <ListChecks class="h-4 w-4 text-primary" />
                            {{ $t('projects.milestones.title') }}
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('projects.milestones.subtitle') }}</p>
                    </div>
                    <div class="px-5 py-6 overflow-x-auto">
                        <MilestoneTracker :milestones="project.milestones" />
                    </div>
                </div>

                <!-- SDG Icons -->
                <div v-if="project.sdgs?.length" class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Globe class="h-4 w-4 text-primary" />
                            Sustainable Development Goals
                        </h2>
                    </div>
                    <div class="px-5 py-5">
                        <div class="flex flex-wrap gap-3">
                            <div
                                v-for="sdgId in project.sdgs"
                                :key="sdgId"
                                class="group relative flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors"
                            >
                                <img
                                    :src="`/sdgs/E-WEB-Goal-${String(sdgId).padStart(2, '0')}.png`"
                                    :alt="`SDG ${sdgId}`"
                                    class="h-10 w-10 rounded"
                                />
                                <div>
                                    <div class="text-xs font-semibold text-foreground">SDG {{ sdgId }}</div>
                                    <div class="text-[11px] text-muted-foreground">{{ getSDG(sdgId)?.name }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Project Location Map -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <MapPin class="h-4 w-4 text-primary" />
                            Project Location
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">
                            <template v-if="effectiveLocation && !effectiveLocation.approximate">{{ effectiveLocation.lat.toFixed(4) }}, {{ effectiveLocation.lng.toFixed(4) }}</template>
                            <template v-else-if="effectiveLocation?.approximate">Country-level location</template>
                            <span v-if="displayCountry"> · {{ displayCountry }}</span>
                        </p>
                    </div>
                    <div class="h-[320px]">
                        <ClientOnly>
                            <!--
                                Mount on project (not effectiveLocation) so the component exists
                                when ClientOnly activates.  It watches hasLocation internally and
                                initialises Leaflet only once coordinates arrive — no mount/unmount
                                cycle, no Leaflet size-detection race on reload.
                            -->
                            <ProjectLocationMap
                                :lat="effectiveLocation?.lat ?? 0"
                                :lng="effectiveLocation?.lng ?? 0"
                                :name="project.name"
                                :approximate="effectiveLocation?.approximate ?? false"
                                :has-location="!!effectiveLocation"
                            />
                        </ClientOnly>
                    </div>
                </div>
            </div>

            <!-- ── Tab: Issuances & Credits ────────────────────────────────────── -->
            <div v-else-if="activeTab === 'issuances'" class="p-6 space-y-6">
                <CreditLifecycle :project="project" />

                <!-- Projected Issuance (pipeline projects only — issued projects show actuals above) -->
                <div v-if="project.lifecycleStage !== 'Issued'" class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <TrendingUp class="h-4 w-4 text-primary" />
                            {{ $t('projects.projectedEstimate.title') }}
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('projects.projectedEstimate.subtitle') }}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-px bg-border">
                        <div class="bg-card px-5 py-4 text-center">
                            <div class="text-lg font-semibold text-foreground tabular-nums">
                                {{ project.projectedVolume != null ? formatCredits(project.projectedVolume) : $t('projects.notEstimated') }}
                            </div>
                            <div class="text-[11px] text-muted-foreground">{{ $t('projects.columns.projectedVolume') }}</div>
                        </div>
                        <div class="bg-card px-5 py-4 text-center">
                            <div class="text-lg font-semibold text-foreground tabular-nums">
                                {{ project.expectedIssuanceYear ?? $t('projects.tbd') }}
                            </div>
                            <div class="text-[11px] text-muted-foreground">{{ $t('projects.columns.expectedIssuanceYear') }}</div>
                        </div>
                    </div>
                </div>

                <IssuancesTable
                    :project="project"
                    @view-vc="handleViewVc"
                />
            </div>

            <!-- ── Tab: Documents (VC business data grouped by schema) ────────── -->
            <div v-else-if="activeTab === 'documents'" class="p-6">
                <ProjectVcSchemaList
                    v-model:search-query="docSearchQuery"
                    :schemas="project.linkedSchemas?.filter(s => s.schemaUuid !== 'MintToken') ?? []"
                    :data-by-schema="vcDataBySchema"
                    :pending="vcDataPending"
                    :open-schema="vcSchemaOpen"
                    :open-record="vcRecordOpen"
                    empty-message="No linked documents found for this project."
                    @toggle-schema="toggleSchema"
                    @toggle-record="(key) => vcRecordOpen[key] = !(vcRecordOpen[key] ?? true)"
                />
            </div>

            <!-- ── Tab: MRV External Data (VCs from externalDataBlock-bound schemas) ── -->
            <div v-else-if="activeTab === 'mrv'" class="p-6 space-y-4">
                <p class="text-xs text-muted-foreground">
                    Records submitted through this methodology's external/IoT data-ingestion mechanism (dMRV), separate from human-submitted documents.
                </p>

                <!-- Data Flow — honest project-level summary, not a fabricated per-record trace -->
                <div v-if="mrvTotalRecords > 0" class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <GitBranch class="h-4 w-4 text-primary" />
                            Data Flow
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">
                            A snapshot of this project's monitoring activity and credit issuance so far — click through for the full issuance history.
                        </p>
                    </div>
                    <div class="px-5 py-5 flex items-center gap-3 flex-wrap">
                        <div class="flex items-center gap-2.5 rounded-lg border bg-muted/20 px-3.5 py-2.5">
                            <Radio class="h-4 w-4 text-primary shrink-0" />
                            <div>
                                <div class="text-xs font-semibold text-foreground">MRV Data</div>
                                <div class="text-[11px] text-muted-foreground">{{ mrvTotalRecords }} record{{ mrvTotalRecords !== 1 ? 's' : '' }}</div>
                            </div>
                        </div>
                        <ArrowRight class="h-4 w-4 text-muted-foreground shrink-0" />
                        <button
                            class="flex items-center gap-2.5 rounded-lg border bg-muted/20 px-3.5 py-2.5 hover:bg-muted/40 transition-colors text-left"
                            @click="setTab('issuances')"
                        >
                            <Coins class="h-4 w-4 text-primary shrink-0" />
                            <div>
                                <div class="text-xs font-semibold text-foreground">Credits Issued</div>
                                <div class="text-[11px] text-muted-foreground">{{ project.totalIssued ?? 0 }} issued &middot; {{ project.issuanceCount ?? 0 }} issuance(s)</div>
                            </div>
                        </button>
                    </div>
                </div>

                <template v-if="project.mrvSchemas?.length">
                    <ProjectMrvDataExplorer
                        v-for="schema in project.mrvSchemas.filter(s => s.schemaUuid !== 'MintToken')"
                        :key="schema.schemaUuid"
                        :project-id="projectId"
                        :schema="schema"
                        @view-record="handleViewVcJson"
                    />
                </template>
                <div v-else class="rounded-xl border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                    No MRV external data submissions found for this project.
                </div>
            </div>

            <!-- ── Tab: Advanced ───────────────────────────────────────────────── -->
            <div v-else-if="activeTab === 'advanced'" class="p-6 space-y-6">
                <!-- Actions (re-extract / refresh-IPFS are admin-only) -->
                <div class="flex items-center gap-2 flex-wrap">
                    <template v-if="isAdmin">
                        <button
                            :disabled="reextractPending"
                            class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="triggerReextract"
                        >
                            <RotateCcw :class="['h-4 w-4 text-primary', reextractPending ? 'animate-spin' : '']" />
                            Re-extract
                        </button>
                        <button
                            :disabled="refreshIpfsPending"
                            class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="triggerRefreshIpfs"
                        >
                            <CloudDownload :class="['h-4 w-4 text-primary', refreshIpfsPending ? 'animate-spin' : '']" />
                            Refresh IPFS
                        </button>
                        <div class="w-px h-6 bg-border" />
                    </template>
                    <button
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        @click="exportProject(project!, 'iwa', network)"
                    >
                        <Download class="h-4 w-4 text-primary" />
                        Export as IWA
                    </button>
                    <button
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        @click="exportProject(project!, 'cadtrust', network)"
                    >
                        <Download class="h-4 w-4 text-primary" />
                        Export as CADTrust
                    </button>
                    <button
                        class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        @click="exportProject(project!, 'cdop', network)"
                    >
                        <Download class="h-4 w-4 text-primary" />
                        Export as CDOP
                    </button>
                </div>

                <!-- Pipeline (moved from the former Pipeline tab) -->
                <ClientOnly>
                    <ProjectPolicyCanvas :project="project" />
                </ClientOnly>
                <ProjectPipeline :project="project" />

                <!-- Linked VCs (raw) -->
                <LinkedVcsPanel
                    :project="project"
                    :network="network"
                    @view-vc-json="handleViewVcJson"
                />

                <!-- Trust Chain (moved from Pipeline tab) -->
                <ProjectTrustChain :project="project" />

                <!-- Methodology Field Mapping (lazy) -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div
                        class="w-full px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                        @click="methodologyMappingOpen = !methodologyMappingOpen"
                    >
                        <div class="min-w-0">
                            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Layers class="h-4 w-4 text-primary" />
                                Methodology Field Mapping
                            </h2>
                            <p class="text-[11px] text-muted-foreground mt-0.5">
                                <AppLink
                                    v-if="project.instanceTopicId"
                                    :to="`/methodologies/${project.instanceTopicId}`"
                                    class="text-primary hover:underline transition-colors inline-flex items-center gap-1"
                                    @click.stop
                                >
                                    {{ fullMethodologyName }}
                                </AppLink>
                                <span v-else>{{ fullMethodologyName }}</span>
                                — how project fields map to schema fields
                            </p>
                        </div>
                        <ChevronDown
                            class="h-4 w-4 text-muted-foreground transition-transform shrink-0"
                            :class="methodologyMappingOpen ? 'rotate-180' : ''"
                        />
                    </div>
                    <div v-if="methodologyMappingOpen">
                        <div v-if="decodedMethodology.pending.value" class="px-5 py-6 text-center text-xs text-muted-foreground">
                            Loading mapping…
                        </div>
                        <div v-else-if="!project.instanceTopicId" class="px-5 py-6 text-xs text-muted-foreground">
                            Methodology version is not linked to this project yet. Click <strong class="text-foreground">Re-extract</strong> above (or re-parse the methodology) to populate it.
                        </div>
                        <div v-else-if="decodedMethodology.error.value" class="px-5 py-6 text-xs text-destructive">
                            Failed to load methodology mapping.
                        </div>
                        <div v-else-if="!decodedMethodology.data.value?.projectSchema" class="px-5 py-6 text-xs text-muted-foreground">
                            No project schema has been confirmed for this methodology yet.
                        </div>
                        <table v-else class="w-full text-sm">
                            <thead>
                                <tr class="bg-muted/20 border-b">
                                    <th class="text-left py-2.5 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-1/3">Project Field</th>
                                    <th class="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Schema Field</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                <tr v-for="row in methodologyMappingRows" :key="row.label" class="hover:bg-muted/30 align-top">
                                    <td class="py-3 px-5 font-medium text-foreground">{{ row.label }}</td>
                                    <td class="py-3 px-4">
                                        <template v-if="row.field">
                                            <div class="text-foreground font-medium">
                                                {{ row.field.title || row.field.fieldKey }}
                                                <span class="text-muted-foreground font-normal">({{ row.field.fieldKey }})</span>
                                            </div>
                                            <div v-if="row.field.description" class="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                {{ row.field.description }}
                                            </div>
                                        </template>
                                        <span v-else class="text-muted-foreground">—</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Relationships Diagram -->
                <div class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Network class="h-4 w-4 text-primary" />
                            Relationships
                        </h2>
                        <p class="text-[11px] text-muted-foreground mt-0.5">Entity relationships between Registry, Policy, Schema, Role, Raw Data, VP, and Token</p>
                    </div>
                    <div class="px-5 py-5">
                        <ClientOnly>
                            <RelationshipDiagram
                                :project="project"
                                :network="network"
                                @view-vc="({ title, vc }) => { vcViewerTitle = title; vcViewerData = vc; vcViewerOpen = true; }"
                            />
                        </ClientOnly>
                    </div>
                </div>

                <!-- Emission Parameters (only shown when real data is available) -->
                <div v-if="emissions" class="rounded-xl border bg-card overflow-hidden">
                    <div class="px-5 py-3.5 border-b bg-muted/30">
                        <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                            <BarChart3 class="h-4 w-4 text-primary" />
                            Emission Parameters
                        </h2>
                    </div>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
                        <div class="bg-card px-5 py-5">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Baseline Emissions</div>
                            <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.baseline }}</div>
                        </div>
                        <div class="bg-card px-5 py-5">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Project Emissions</div>
                            <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.project }}</div>
                        </div>
                        <div class="bg-card px-5 py-5">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Leakage Emissions</div>
                            <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.leakage }}</div>
                        </div>
                        <div class="bg-card px-5 py-5">
                            <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Baseline Emission Factor</div>
                            <div class="text-lg font-semibold text-foreground tabular-nums">{{ emissions.baselineEmissionFactor }}</div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div><!-- end tab card -->

        <!-- Raw Data Viewer Modal -->
        <VcJsonViewer :open="vcViewerOpen" :title="vcViewerTitle" :data="vcViewerData" @close="vcViewerOpen = false" />
    </div>
</template>
