# Returns Token Mints (Carbon Credits)

Search and filter tokenized carbon credit mints with support for filtering by token, policy, amount range, geography, date range, and more. Returns paginated results along with the aggregate `totalAmount` of all matching mints.

## Query Parameters

| Parameter    | Type   | Description                                      |
| ------------ | ------ | ------------------------------------------------ |
| tokenId      | string | Filter by Hedera token ID                        |
| policyId     | string | Filter by policy consensus timestamp             |
| minAmount    | number | Minimum token amount                             |
| maxAmount    | number | Maximum token amount                             |
| geography    | string | Filter by geography / project location           |
| schemaName   | string | Filter by schema name of the underlying VC       |
| issuer       | string | Filter by issuer DID                             |
| startDate    | string | Start of date range (ISO 8601)                   |
| endDate      | string | End of date range (ISO 8601)                     |
| keywords     | string | Comma-separated keywords for full-text search    |
| orderField   | string | Field to sort by (e.g. `consensusTimestamp`)      |
| orderDir     | string | Sort direction: `asc` or `desc`                  |
| pageIndex    | number | Page index (0-based)                             |
| pageSize     | number | Number of items per page                         |

## Response

The response includes the standard paginated fields (`items`, `pageIndex`, `pageSize`, `total`) plus an additional `totalAmount` field representing the sum of all matching mint amounts across all pages.

{% swagger src="../../../.gitbook/assets/swagger-indexer.yaml" path="/entities/token-mints" method="get" %}
[swagger-indexer.yaml](../../../.gitbook/assets/swagger-indexer.yaml)
{% endswagger %}
