/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Thin wrapper around the Hedera mirror node REST API for validating
// tool-publish message references.
//
// A Guardian tool's "where do I live on Hedera" identity is the pair
// (topicId, messageId). messageId is a consensus timestamp string of the form
// "<seconds>.<nanos>". When testnet resets, the topic + messages are wiped and
// queries for that timestamp return an empty `messages` array (HTTP 200 with
// no rows), not a 404. We treat empty as "missing".

const ENDPOINTS = {
  testnet: 'https://testnet.mirrornode.hedera.com',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

export function mirrorBaseUrl(network) {
  const url = ENDPOINTS[network];
  if (!url) throw new Error(`Unknown network: ${network}. Use one of: ${Object.keys(ENDPOINTS).join(', ')}`);
  return url;
}

// Look up a single message by its consensus timestamp on a topic.
// Returns { found: true, message } if it exists, { found: false, status } otherwise.
// Network or HTTP failures throw so the caller can decide retry policy.
export async function lookupMessage(network, topicId, messageId, { timeoutMs = 10000 } = {}) {
  if (!topicId) {
    return { found: false, status: 'no-topic-id' };
  }
  const base = mirrorBaseUrl(network);
  const url = `${base}/api/v1/topics/${encodeURIComponent(topicId)}/messages?timestamp=eq:${encodeURIComponent(messageId)}&limit=1`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 404) return { found: false, status: 'topic-not-found' };
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Mirror error ${res.status} for ${topicId}/${messageId}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.messages) || data.messages.length === 0) {
    return { found: false, status: 'message-missing' };
  }
  return { found: true, message: data.messages[0] };
}

// Look up a message when we only have its consensus timestamp (no topicId).
// README-extracted entries don't carry a topicId — we have to discover it
// first via the transactions endpoint, then resolve the message normally.
// Returns the same shape as lookupMessage plus the discovered topicId.
export async function findMessageByTimestamp(network, messageId, { timeoutMs = 10000 } = {}) {
  const base = mirrorBaseUrl(network);
  const txUrl = `${base}/api/v1/transactions?timestamp=eq:${encodeURIComponent(messageId)}&limit=1`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(txUrl, { signal: ctrl.signal, headers: { accept: 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Mirror tx lookup error ${res.status} for ${messageId}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const tx = (data.transactions || [])[0];
  if (!tx) return { found: false, status: 'message-missing', topicId: null };

  // entity_id on a CONSENSUSSUBMITMESSAGE transaction is the topic the message
  // was submitted to.
  const topicId = tx.entity_id;
  if (!topicId) return { found: false, status: 'no-topic-id', topicId: null };

  // Now fetch the actual message (we need its payload to extract the CID).
  const inner = await lookupMessage(network, topicId, messageId, { timeoutMs });
  return { ...inner, topicId };
}

// Pull the IPFS CID out of a Guardian publish message. Guardian wraps the
// methodology/tool zip in IPFS and writes the CID into the consensus message.
// Single-chunk messages are the common case; multi-chunk messages need all
// chunks concatenated before parsing the JSON payload (handled here as
// best-effort: if we only see one chunk, parse it; if multi-chunk and we have
// chunk_info.total > 1, we currently return cid=null with a note so the
// caller can decide whether to handle it).
export function extractCidFromMessage(message) {
  if (!message || !message.message) return { cid: null, reason: 'no-message' };
  const chunkInfo = message.chunk_info;
  if (chunkInfo && chunkInfo.total && chunkInfo.total > 1 && chunkInfo.number === 1) {
    // First chunk of a multi-chunk message — payload alone won't parse as JSON.
    // For now we report this as multi-chunk so the validator can decide if it
    // wants to fetch the remaining chunks. The mirror REST API can return the
    // full set via the initial_transaction_id; left as a TODO until we see one.
    return { cid: null, reason: 'multi-chunk-message' };
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(message.message, 'base64').toString('utf8'));
  } catch (err) {
    return { cid: null, reason: `payload-parse-error: ${err.message}` };
  }
  if (payload && typeof payload.cid === 'string' && payload.cid.length > 0) {
    return { cid: payload.cid, payload };
  }
  if (payload && typeof payload.uri === 'string') {
    const match = payload.uri.match(/ipfs:\/\/([^/?#]+)/);
    if (match) return { cid: match[1], payload };
  }
  return { cid: null, reason: 'no-cid-in-payload', payload };
}
