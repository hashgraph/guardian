<script setup lang="ts">
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps<{
    points: { lat: number; lng: number; name: string }[];
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;

const icon = L.divIcon({
    className: '',
    html: '<div style="width:12px;height:12px;background:#1a9850;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
});

function applyPoints(points: { lat: number; lng: number; name: string }[]) {
    if (!map) return;
    markerLayer?.clearLayers();

    const valid = points.filter(p => p.lat !== 0 || p.lng !== 0);
    if (valid.length === 0) {
        map.setView([20, 0], 2);
        return;
    }

    const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng] as [number, number]));
    valid.forEach(p => {
        L.marker([p.lat, p.lng], { icon })
            .bindPopup(`<strong style="font-size:12px">${p.name}</strong>`)
            .addTo(markerLayer!);
    });
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
}

onMounted(async () => {
    if (!mapContainer.value) return;

    map = L.map(mapContainer.value, {
        zoom: 2,
        center: [20, 0],
        zoomControl: true,
        scrollWheelZoom: false,
        minZoom: 2,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
        noWrap: true,
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);

    // Force Leaflet to recalculate container dimensions after the DOM settles.
    // Without this the map renders blank on hard reload (hydration timing issue).
    await nextTick();
    map.invalidateSize();

    applyPoints(props.points);
});

// Re-render markers when points change (e.g. data arrives after map mounts).
watch(() => props.points, (pts) => applyPoints(pts), { deep: true });

onUnmounted(() => {
    map?.remove();
    map = null;
    markerLayer = null;
});
</script>


<template>
    <div ref="mapContainer" class="h-full w-full rounded-lg" />
</template>
