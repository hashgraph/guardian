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
    // A
    AFG: 'af', ALB: 'al', DZA: 'dz', AND: 'ad', AGO: 'ao', ATG: 'ag',
    ARG: 'ar', ARM: 'am', AUS: 'au', AUT: 'at', AZE: 'az',
    // B
    BHS: 'bs', BHR: 'bh', BGD: 'bd', BRB: 'bb', BLR: 'by', BEL: 'be',
    BLZ: 'bz', BEN: 'bj', BTN: 'bt', BOL: 'bo', BIH: 'ba', BWA: 'bw',
    BRA: 'br', BRN: 'bn', BGR: 'bg', BFA: 'bf', BDI: 'bi',
    // C
    CPV: 'cv', KHM: 'kh', CMR: 'cm', CAN: 'ca', CAF: 'cf', TCD: 'td',
    CHL: 'cl', CHN: 'cn', COL: 'co', COM: 'km', COG: 'cg', CIV: 'ci',
    HRV: 'hr', CUB: 'cu', CYP: 'cy', CZE: 'cz',
    // D
    DNK: 'dk', DJI: 'dj', DMA: 'dm', DOM: 'do', COD: 'cd',
    // E
    ECU: 'ec', EGY: 'eg', SLV: 'sv', GNQ: 'gq', ERI: 'er', EST: 'ee',
    SWZ: 'sz', ETH: 'et',
    // F
    FJI: 'fj', FIN: 'fi', FRA: 'fr',
    // G
    GAB: 'ga', GMB: 'gm', GEO: 'ge', DEU: 'de', GHA: 'gh', GRC: 'gr',
    GRD: 'gd', GTM: 'gt', GIN: 'gn', GNB: 'gw', GUY: 'gy',
    // H
    HTI: 'ht', HND: 'hn', HUN: 'hu',
    // I
    ISL: 'is', IND: 'in', IDN: 'id', IRN: 'ir', IRQ: 'iq', IRL: 'ie',
    ISR: 'il', ITA: 'it',
    // J
    JAM: 'jm', JPN: 'jp', JOR: 'jo',
    // K
    KAZ: 'kz', KEN: 'ke', KIR: 'ki', KWT: 'kw', KGZ: 'kg',
    // L
    LAO: 'la', LVA: 'lv', LBN: 'lb', LSO: 'ls', LBR: 'lr', LBY: 'ly',
    LIE: 'li', LTU: 'lt', LUX: 'lu',
    // M
    MDG: 'mg', MWI: 'mw', MYS: 'my', MDV: 'mv', MLI: 'ml', MLT: 'mt',
    MHL: 'mh', MRT: 'mr', MUS: 'mu', MEX: 'mx', FSM: 'fm', MDA: 'md',
    MCO: 'mc', MNG: 'mn', MNE: 'me', MAR: 'ma', MOZ: 'mz', MMR: 'mm',
    // N
    NAM: 'na', NRU: 'nr', NPL: 'np', NLD: 'nl', NZL: 'nz', NIC: 'ni',
    NER: 'ne', NGA: 'ng', PRK: 'kp', MKD: 'mk', NOR: 'no',
    // O
    OMN: 'om',
    // P
    PAK: 'pk', PLW: 'pw', PSE: 'ps', PAN: 'pa', PNG: 'pg', PRY: 'py',
    PER: 'pe', PHL: 'ph', POL: 'pl', PRT: 'pt',
    // Q
    QAT: 'qa',
    // R
    ROU: 'ro', RUS: 'ru', RWA: 'rw',
    // S
    KNA: 'kn', LCA: 'lc', VCT: 'vc', WSM: 'ws', SMR: 'sm', STP: 'st',
    SAU: 'sa', SEN: 'sn', SRB: 'rs', SYC: 'sc', SLE: 'sl', SGP: 'sg',
    SVK: 'sk', SVN: 'si', SLB: 'sb', SOM: 'so', ZAF: 'za', KOR: 'kr',
    SSD: 'ss', ESP: 'es', LKA: 'lk', SDN: 'sd', SUR: 'sr', SWE: 'se',
    CHE: 'ch', SYR: 'sy',
    // T
    TWN: 'tw', TJK: 'tj', TZA: 'tz', THA: 'th', TLS: 'tl', TGO: 'tg',
    TON: 'to', TTO: 'tt', TUN: 'tn', TUR: 'tr', TKM: 'tm', TUV: 'tv',
    // U
    UGA: 'ug', UKR: 'ua', ARE: 'ae', GBR: 'gb', USA: 'us', URY: 'uy',
    UZB: 'uz',
    // V
    VUT: 'vu', VAT: 'va', VEN: 've', VNM: 'vn',
    // Y
    YEM: 'ye',
    // Z
    ZMB: 'zm', ZWE: 'zw',
};

// 'UNK' indicates an unknown / unrecognized country. Without this guard the
// substring fallback below would resolve to 'un' (the UN flag), which would
// mislabel every empty-country project with a real-looking flag.
const hasFlag = computed(() => props.code.toUpperCase() !== 'UNK');

const alpha2 = computed(() => {
    const code = props.code.toUpperCase();
    if (code.length === 2) return code.toLowerCase();
    return alpha3to2[code] || code.substring(0, 2).toLowerCase();
});

const src = computed(() => `https://flagcdn.com/w40/${alpha2.value}.png`);
</script>

<template>
    <img
        v-if="hasFlag"
        :src="src"
        :alt="code"
        :class="[cls, 'inline-block rounded-sm object-cover']"
        loading="lazy"
    />
    <span
        v-else
        :class="[cls, 'inline-block rounded-sm bg-muted/40']"
        aria-hidden="true"
    />
</template>
