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
  // Schemas are served by three controllers: `/schemas/...`, the single
  // schema route of `@Controller('schema')` and the tag schema listing of
  // `@Controller('tags')`, which schema mutations (e.g. the editor creating a
  // tag schema) have to refresh too.
  SCHEMAS: [`${PREFIXES.TAG}/schemas`, `${PREFIXES.TAG}/schema/`, `${PREFIXES.TAG}/tags/schemas`],
  // Every cached route of `@Controller('accounts')`: the listing, the session,
  // the standard registries and the balance.
  ACCOUNTS: [`${PREFIXES.TAG}/accounts`],
}