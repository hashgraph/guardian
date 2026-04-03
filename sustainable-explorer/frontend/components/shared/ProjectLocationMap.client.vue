<script setup lang="ts">
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps<{
    lat: number;
    lng: number;
    name: string;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;

onMounted(() => {
    if (!mapContainer.value) return;

    map = L.map(mapContainer.value, {
        center: [props.lat, props.lng],
        zoom: 8,
        zoomControl: true,
        scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
    }).addTo(map);

    const icon = L.divIcon({
        className: '',
        html: '<div style="width:12px;height:12px;background:#1a9850;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
    });

    L.marker([props.lat, props.lng], { icon })
        .bindPopup(`<strong style="font-size:12px">${props.name}</strong>`)
        .addTo(map);
});

onUnmounted(() => {
    map?.remove();
    map = null;
});
</script>

<template>
    <div ref="mapContainer" class="h-full w-full rounded-lg" />
</template>
