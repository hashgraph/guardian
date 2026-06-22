<script setup lang="ts">
import L from 'leaflet';

const props = defineProps<{
    lat: number;
    lng: number;
    name: string;
    approximate?: boolean;
    hasLocation: boolean;
}>();

const mapContainer = ref<HTMLElement | null>(null);
// mapReady is reactive so watchEffect re-evaluates its guard when initMap completes
const mapReady = ref(false);
let map: L.Map | null = null;
let resizeObserver: ResizeObserver | null = null;
let initializing = false;

async function initMap() {
    // Guard against concurrent or duplicate calls during the async rAF gap
    if (initializing || mapReady.value || !mapContainer.value) return;
    initializing = true;

    // Capture prop values before yielding — props could change across the await
    const lat = props.lat;
    const lng = props.lng;
    const approximate = props.approximate ?? false;
    const name = props.name;

    // Double-rAF: wait for the browser to complete a full layout+paint cycle so
    // Leaflet reads the container's final dimensions, not its mid-update values.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    if (!mapContainer.value || mapReady.value) { initializing = false; return; }

    map = L.map(mapContainer.value, {
        center: [lat, lng],
        zoom: approximate ? 5 : 8,
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 2,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
        noWrap: true,
    }).addTo(map);

    const icon = L.divIcon({
        className: '',
        html: '<div style="width:12px;height:12px;background:#1a9850;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
    });

    L.marker([lat, lng], { icon })
        .bindPopup(`<strong style="font-size:12px">${name}</strong>`)
        .addTo(map);

    map.invalidateSize();
    setTimeout(() => { map?.invalidateSize(); }, 300);

    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => { map?.invalidateSize(); });
        resizeObserver.observe(mapContainer.value);
    }

    mapReady.value = true;
    initializing = false;
}

// watchEffect with flush:'post' runs after every DOM commit (including first
// mount) and re-runs when any tracked reactive dependency changes.
// mapReady is reactive so the guard short-circuits on subsequent firings once
// the map is initialised — no duplicate L.map() calls.
//
// For Miller Mountain (hasLocation always true):  fires on first mount → initMap ✓
// For Rajasthan (hasLocation starts false, Nominatim arrives later):
//   fires on mount (false → no-op), fires again when hasLocation flips true → initMap ✓
watchEffect(() => {
    if (props.hasLocation && !mapReady.value) initMap();
}, { flush: 'post' });

onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    map?.remove();
    map = null;
    mapReady.value = false;
    initializing = false;
});
</script>


<template>
    <div class="relative h-full w-full">
        <div ref="mapContainer" class="h-full w-full rounded-lg" />
        <!-- Overlay shown while Nominatim geocoding is still in flight -->
        <div
            v-if="!hasLocation"
            class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
        >
            Location data unavailable
        </div>
        <div
            v-if="hasLocation && approximate"
            class="absolute bottom-2 left-2 z-[1000] rounded bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm"
        >
            Approximate location
        </div>
    </div>
</template>
