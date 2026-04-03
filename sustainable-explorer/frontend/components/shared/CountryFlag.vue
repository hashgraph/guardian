<script setup lang="ts">
const props = defineProps<{
    code: string;
    size?: 'sm' | 'md' | 'lg';
}>();

const sizeClass: Record<string, string> = {
    sm: 'h-4 w-5',
    md: 'h-5 w-6',
    lg: 'h-6 w-8',
};

const cls = sizeClass[props.size || 'md'];

// Convert 3-letter (ISO 3166-1 alpha-3) to 2-letter (alpha-2) for the CDN
const alpha3to2: Record<string, string> = {
    KEN: 'ke', BRA: 'br', RWA: 'rw', IDN: 'id', IND: 'in', COL: 'co',
    MOZ: 'mz', UGA: 'ug', NPL: 'np', VNM: 'vn', MEX: 'mx', GHA: 'gh',
    ETH: 'et', COD: 'cd', KHM: 'kh', MWI: 'mw', ISL: 'is', PER: 'pe',
    BGD: 'bd', CHE: 'ch', GBR: 'gb', USA: 'us', FRA: 'fr', DEU: 'de',
    AUS: 'au', CAN: 'ca', ZAF: 'za', NGA: 'ng', TZA: 'tz', MMR: 'mm',
    THA: 'th', PHL: 'ph', LKA: 'lk', PAK: 'pk', AFG: 'af', ARG: 'ar',
    CHL: 'cl', ECU: 'ec', BOL: 'bo', PRY: 'py', URY: 'uy', VEN: 've',
    CRI: 'cr', PAN: 'pa', GTM: 'gt', HND: 'hn', SLV: 'sv', NIC: 'ni',
    DOM: 'do', HTI: 'ht', CUB: 'cu', JAM: 'jm', TTO: 'tt', BLZ: 'bz',
    CHN: 'cn', JPN: 'jp', KOR: 'kr', TWN: 'tw', MYS: 'my', SGP: 'sg',
};

const alpha2 = computed(() => {
    const code = props.code.toUpperCase();
    if (code.length === 2) return code.toLowerCase();
    return alpha3to2[code] || code.substring(0, 2).toLowerCase();
});

const src = computed(() => `https://flagcdn.com/w40/${alpha2.value}.png`);
</script>

<template>
    <img
        :src="src"
        :alt="code"
        :class="[cls, 'inline-block rounded-sm object-cover']"
        loading="lazy"
    />
</template>
