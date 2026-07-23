<script setup lang="ts">
import type { RouteLocation, RouteLocationRaw } from 'vue-router';

// Drop-in replacement for <NuxtLink> for every *internal* link in the app.
//
// middleware/network.global.ts stamps the active `network` (mainnet/testnet)
// onto the URL, but it only runs on in-app navigation. A plain <NuxtLink
// :to="`/projects/${id}`"> renders an <a href="/projects/123"> with no
// network in it — fine for a normal click (the middleware patches the query
// before the route resolves), but "open in new tab" / "copy link" bypass
// Vue Router entirely and hit the server with exactly that href, which the
// server then treats as the default network (mainnet), breaking testnet-only
// records. Resolving `to` here and injecting the current `network` query
// param means the rendered <a href> is always correct on its own, regardless
// of how it's opened.
const props = defineProps<{
    to?: RouteLocationRaw;
    // Forwarded to NuxtLink: renders no wrapping <a>, exposing { navigate,
    // href, ... } via the default slot instead — needed when the link
    // behavior has to sit on a non-<a> element (e.g. a whole <tr>, which
    // can't legally nest inside an <a>).
    custom?: boolean;
}>();

defineSlots<{
    default(props: {
        href: string;
        navigate: (e?: MouseEvent) => Promise<void>;
        route: (RouteLocation & { href: string }) | undefined;
        isActive: boolean;
        isExactActive: boolean;
    }): any;
}>();

const route = useRoute();
const router = useRouter();

const isExternal = (to: RouteLocationRaw) =>
    typeof to === 'string' && /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(to);

const resolvedTo = computed<RouteLocationRaw | undefined>(() => {
    const to = props.to;
    const network = route.query.network;
    if (!to || !network || isExternal(to)) return to;

    const resolved = router.resolve(to);
    if (resolved.query.network) return to;

    return { path: resolved.path, query: { ...resolved.query, network }, hash: resolved.hash || undefined };
});
</script>

<template>
    <NuxtLink :to="resolvedTo" :custom="custom" v-slot="slotProps">
        <slot v-bind="slotProps" />
    </NuxtLink>
</template>
