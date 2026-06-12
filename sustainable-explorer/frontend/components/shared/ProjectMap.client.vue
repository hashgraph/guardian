<script setup lang="ts">
import L from 'leaflet';

export interface CountryData {
    country: string;
    countryCode: string;
    projects: number;
    credits: string;
}

export interface ProjectPoint {
    name: string;
    lat: number;
    lng: number;
    credits?: string;
}

const props = defineProps<{
    countries: CountryData[];
    points?: ProjectPoint[];
    autoFit?: boolean;
}>();

const emit = defineEmits<{
    'country-click': [countryCode: string];
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let geoLayer: L.GeoJSON | null = null;
let pointsLayer: L.LayerGroup | null = null;

const maxProjects = computed(() => Math.max(...props.countries.map(c => c.projects), 1));

function getColor(projects: number): string {
    const ratio = projects / maxProjects.value;
    if (ratio > 0.7) return '#0f6b3a';
    if (ratio > 0.5) return '#1a9850';
    if (ratio > 0.3) return '#66bd63';
    if (ratio > 0.15) return '#a6d96a';
    if (ratio > 0) return '#d9ef8b';
    return 'transparent';
}

function getFillOpacity(projects: number): number {
    if (projects === 0) return 0;
    const ratio = projects / maxProjects.value;
    return 0.4 + ratio * 0.5;
}

function getCountryData(code: string): CountryData | undefined {
    return props.countries.find(c => c.countryCode === code);
}

async function initMap() {
    if (!mapContainer.value) return;

    map = L.map(mapContainer.value, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 2,
        maxZoom: 10,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
        noWrap: true,
    }).addTo(map);

    try {
        const response = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
        const geojson = await response.json();

        geoLayer = L.geoJSON(geojson, {
            style: (feature) => {
                const code = feature?.properties?.['ISO3166-1-Alpha-3'] || '';
                const data = getCountryData(code);
                const projects = data?.projects ?? 0;

                return {
                    fillColor: projects > 0 ? getColor(projects) : 'transparent',
                    fillOpacity: getFillOpacity(projects),
                    color: projects > 0 ? '#2d6a4f' : '#ddd',
                    weight: projects > 0 ? 1.5 : 0.5,
                };
            },
            onEachFeature: (feature, layer) => {
                const code = feature?.properties?.['ISO3166-1-Alpha-3'] || '';
                if (!code) return;
                // Attach handlers unconditionally. `onEachFeature` runs only at
                // layer creation — props.countries is typically still empty at
                // that moment, so a check-at-attach gate would skip every
                // country forever. Instead, gate at click/hover *time* so the
                // handler picks up data once it arrives.
                layer.on('click', () => {
                    if (getCountryData(code)) emit('country-click', code);
                });
                layer.on('mouseover', function () {
                    if (getCountryData(code)) {
                        (layer as any).setStyle({ fillOpacity: 0.85, weight: 2.5 });
                    }
                });
                layer.on('mouseout', function () {
                    if (getCountryData(code)) geoLayer?.resetStyle(layer);
                });
            },
        }).addTo(map);
    } catch {
        // GeoJSON failed — silent
    }

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        pane: 'overlayPane',
        noWrap: true,
    }).addTo(map);

    pointsLayer = L.layerGroup().addTo(map);
    renderPoints();
}

function renderPoints() {
    if (!map || !pointsLayer) return;
    pointsLayer.clearLayers();
    if (!props.points?.length) return;
    for (const pt of props.points) {
        L.circleMarker([pt.lat, pt.lng], {
            radius: 4,
            fillColor: '#1a9850',
            fillOpacity: 0.9,
            color: '#fff',
            weight: 1.5,
        })
            .bindPopup(`
                <div style="font-size:12px;line-height:1.6">
                    <strong>${pt.name}</strong>
                    ${pt.credits ? `<br><span style="color:#666">Issuances:</span> <strong>${pt.credits}</strong>` : ''}
                </div>
            `)
            .addTo(pointsLayer);
    }
}

function fitPoints() {
    const pts = props.points?.filter(p => p.lat !== 0 || p.lng !== 0);
    if (!pts?.length || !map) return;
    if (pts.length === 1) {
        map.setView([pts[0].lat, pts[0].lng], 5, { animate: false });
    } else {
        const bounds = L.latLngBounds(pts.map(p => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6, animate: false });
    }
}

let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
    await nextTick();
    await initMap();
    // Leaflet needs a size recalc after the container is laid out.
    // autoFit is called after invalidateSize so the container has real pixel
    // dimensions — fitBounds reads container height to compute zoom, which is
    // NaN if called before the layout pass.
    setTimeout(() => {
        map?.invalidateSize();
        if (props.autoFit) fitPoints();
    }, 100);

    // Re-invalidate on parent resize. The dashboard's side panel slides in/out
    // and changes the map area's width; without this, tiles render offset and
    // the country shapes appear in the wrong place until the next interaction.
    if (mapContainer.value && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
            map?.invalidateSize();
        });
        resizeObserver.observe(mapContainer.value);
    }
});
onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    map?.remove();
    map = null;
    geoLayer = null;
    pointsLayer = null;
});

// Re-style country shapes when the data arrives or changes after initial mount.
// Without this, the map paints countries with `projects = 0` (transparent) on
// first load — switching tabs and back used to be the workaround because it
// re-mounted the component.
watch(() => props.countries, () => {
    geoLayer?.resetStyle();
}, { deep: true });

watch(() => props.points, () => {
    renderPoints();
    if (props.autoFit) fitPoints();
}, { deep: true });
</script>


<template>
    <div ref="mapContainer" class="h-full w-full" />
</template>
