/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Multi-gateway IPFS reachability probe.
//
// A CID's "is it actually retrievable?" answer depends on which gateway you
// ask. We probe a configurable list of gateways and return the first one that
// gives a healthy response, plus a breakdown of which gateways did or didn't
// have the content. This mirrors the same fallback strategy proposed for the
// upstream Guardian fix to ipfs-client-class.ts so the validator's view of
// "reachable" matches what a fixed Guardian deployment would experience.

// Default gateway probe list. Operators should override this with
// --gateways (CLI flag) or by passing a custom list to probeCid() so the
// "local" entry points at their own Kubo node. With no override the local
// slot is omitted and only public gateways are checked.
const DEFAULT_GATEWAYS = [
  { name: 'ipfs.io', url: 'https://ipfs.io/ipfs/${cid}', kind: 'public' },
  { name: 'dweb.link', url: 'https://${cid}.ipfs.dweb.link/', kind: 'public' },
  { name: 'gateway.pinata.cloud', url: 'https://gateway.pinata.cloud/ipfs/${cid}', kind: 'public' },
  { name: 'w3s.link', url: 'https://${cid}.ipfs.w3s.link/', kind: 'public' },
];

export function gatewayUrl(template, cid) {
  return template.replace('${cid}', cid);
}

// Probe one gateway for one CID. Treats any 2xx as ok, anything else
// (timeouts, 4xx, 5xx, network errors) as not-ok. We do a GET with a small
// Range header so most gateways stream just a few bytes back instead of the
// whole file — this keeps the validator cheap even when files are large.
export async function probeGateway(gateway, cid, { timeoutMs = 10000 } = {}) {
  const url = gatewayUrl(gateway.url, cid);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      method: 'GET',
      headers: { accept: 'application/octet-stream', range: 'bytes=0-127' },
      redirect: 'follow',
    });
    const elapsedMs = Date.now() - startedAt;
    if (!res.ok && res.status !== 206 /* partial content */) {
      // Drain to release the connection; ignore content
      await res.body?.cancel?.();
      return { gateway: gateway.name, kind: gateway.kind, ok: false, status: `http-${res.status}`, elapsedMs };
    }
    // Read a few bytes to confirm there's actually content coming through.
    const reader = res.body?.getReader?.();
    if (reader) {
      const { value } = await reader.read();
      await reader.cancel().catch(() => {});
      if (!value || value.length === 0) {
        return { gateway: gateway.name, kind: gateway.kind, ok: false, status: 'empty-body', elapsedMs };
      }
    }
    return { gateway: gateway.name, kind: gateway.kind, ok: true, status: `http-${res.status}`, elapsedMs };
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    const status = err.name === 'AbortError' ? 'timeout' : `error: ${err.message}`;
    return { gateway: gateway.name, kind: gateway.kind, ok: false, status, elapsedMs };
  } finally {
    clearTimeout(timer);
  }
}

// Probe all gateways in parallel for one CID. Returns aggregate status:
//   ipfs-ok-local     — at least one local gateway has it (Healthy)
//   ipfs-resilient    — no local hit, but ≥2 independent public gateways have
//                       it. Safe — any one of them can fail without breaking
//                       consumers. Ideal for the upstream methodology library
//                       where there's no single operator-controlled Kubo.
//   ipfs-fragile      — exactly one public gateway has it. Works today, but
//                       single point of failure.
//   ipfs-unreachable  — no gateway returned content (Broken).
// Plus the full per-gateway breakdown so the report can show where it's pinned.
export async function probeCid(cid, { gateways = DEFAULT_GATEWAYS, timeoutMs = 10000 } = {}) {
  if (!cid) return { status: 'no-cid', gateways: [] };
  const results = await Promise.all(gateways.map((gw) => probeGateway(gw, cid, { timeoutMs })));
  const okLocal = results.some((r) => r.ok && r.kind === 'local');
  const publicHits = results.filter((r) => r.ok && r.kind === 'public').length;
  let status;
  if (okLocal) status = 'ipfs-ok-local';
  else if (publicHits >= 2) status = 'ipfs-resilient';
  else if (publicHits === 1) status = 'ipfs-fragile';
  else status = 'ipfs-unreachable';
  return { status, gateways: results, publicHits };
}

export { DEFAULT_GATEWAYS };
