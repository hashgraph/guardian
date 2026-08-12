export const CACHE = {
  SHORT_TTL: 30,
  DEFAULT_TTL: 600,
  LONG_TTL: 3600,
}

export const PREFIXES = {
  CACHE: 'cache',
  TAG: 'tag'
}

/**
 * Prefixes of the cache tags a mutation invalidates in bulk.
 *
 * A tag is `<TAG prefix><request path without query>:<user hash>`, so a prefix
 * has to carry the `tag` part to match anything at all.
 */
export const TAG_PREFIXES = {
  SCHEMAS: `${PREFIXES.TAG}/schemas`,
}