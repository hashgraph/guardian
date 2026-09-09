/**
 * Strip the Mongo `_id` mirror from an Organization record before it leaves the gateway.
 *
 * Every organization entity extends `BaseEntity`, which declares both `@PrimaryKey() _id`
 * (an ObjectId) and `@SerializedPrimaryKey() id` (its string form), and whose `toJSON()`
 * emits both. auth-service returns those entities to the gateway verbatim over NATS, where
 * the ObjectId serializes to the same hex string as `id` — so the response carries the same
 * identifier twice. The organization response DTOs declare only `id`, so `_id` is an
 * undocumented duplicate on the wire.
 *
 * Applied at the REST boundary rather than at the record layer, so the payloads that
 * auth-service hands to internal NATS consumers (policy-service, guardian-service) are
 * unchanged.
 *
 * Copies rather than mutating: the input may be an entity-shaped object another caller still
 * holds. Only the top level is copied — organization records are flat, and no nested value
 * carries an `_id`.
 *
 * @param value An organization record, an array of them, or `null` / `undefined` when the
 * handler found nothing.
 * @returns The same value with every top-level `_id` removed.
 */
export function toOrgResponse<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => toOrgResponse(item)) as unknown as T;
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    const { _id, ...rest } = value as Record<string, unknown>;
    return rest as unknown as T;
}
