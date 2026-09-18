import { MAX_PAGE_SIZE } from '../dto/pagination.dto';

export interface RateLimitDocsConfig {
    guestPerHour: number;
    systemUserPerHour: number;
    adminPerHour: number;
    maxQuota: number;
    apiKeyMaxActivePerUser: number;
}

const lines = (...parts: string[]): string => parts.join('\n');

/** Collapsible block. The blank lines let Swagger UI's Markdown renderer parse the body inside it. */
export const details = (title: string, body: string): string =>
    lines('<details>', `<summary>${title}</summary>`, '', body, '', '</details>');

const NETWORK_LABELS: Record<string, string> = {
    mainnet: 'live data',
    testnet: 'test data',
    previewnet: 'preview data',
};

const formatNumber = (value: number): string => value.toLocaleString('en-US');

/** Keyed by the exact `@ApiTags()` names. Insertion order is the order groups appear on the page. */
export const TAG_DESCRIPTIONS: Record<string, string> = {
    'Projects': 'Carbon and sustainability projects. Search them, open one, and follow its credits from issuance to retirement.',
    'Credit issuances': 'Each time a project receives credits: how many were issued, their serial numbers, and what happened to them next.',
    'Credits': 'Credits across all projects, with totals for any set you filter.',
    'Registries': 'The standard registries that certify projects and issue their credits.',
    'Methodologies': 'The rulebooks projects follow to measure and verify their impact.',
    'Methodology schemas': 'The document templates a methodology uses to collect project data.',
    'Project developers': 'The organisations behind the projects, with their project counts and credits.',
    'Sustainable Development Goals': 'Projects grouped by the UN Sustainable Development Goals they support.',
    'Dashboard': 'Headline numbers and the latest activity across the whole network.',
    'Impact summary': 'An overall impact summary, ready to download as CSV, Excel or PDF.',
    'Portfolio': 'Totals and recent activity for a set of projects you are watching.',
    'Data exports': 'Download filtered data as CSV, Excel or PDF.',
    'IPFS files': 'Download the original files behind Guardian records. Requires sign-in.',
    'Sign-in and profile': 'Create an account, sign in and out, reset a password and update your profile.',
    'My account': 'Your API keys, request limit, saved searches and Portfolio layout.',
    'Notifications': 'Updates about the projects on your watchlist.',
    'Policy maintenance': 'Re-read policies from their source and rebuild their projects.',
    'Data pipeline': 'Keep data flowing: sync progress, processing queues, failed jobs and file downloads.',
    'Guardian live sync': 'The optional service that picks up Guardian changes as they happen.',
    'User management': 'Add users, change roles, deactivate accounts and set request limits.',
    'Request limit reviews': 'Approve, adjust or decline requests for higher request limits.',
};

export function buildPublicOverview(networks: string[], limits: RateLimitDocsConfig): string {
    const networkNames = networks
        .map((network) => `\`${network}\` (${NETWORK_LABELS[network] ?? 'Hedera network'})`)
        .join(' or ');
    const exampleNetwork = networks[0] ?? 'mainnet';

    return lines(
        'Bring Sustainability Atlas data into your own reports, dashboards and tools. You get the same projects, ' +
            'credits, registries and methodologies you see in the Atlas, sourced from the Hedera Guardian network.',
        '',
        '### What you can do',
        '',
        '- **Find projects** by country, registry, methodology, vintage or status',
        '- **Track credits** and see how many were issued, retired and transferred',
        '- **Explore** registries, methodologies, developers and the UN Sustainable Development Goals',
        '- **Download data** as CSV, Excel or PDF',
        '',
        '### Get started',
        '',
        '1. **Sign in** to the Sustainability Atlas, or create a free account.',
        '2. **Create an API key** under *Account Settings → API Keys*. Copy it straight away, as it is only shown once.',
        '3. **Try it here.** Select **Authorize**, paste your key, then open any request below and select **Try it out**.',
        '',
        '### Good to know',
        '',
        `- **Choose a network.** Every data address includes one: ${networkNames}. For example, ` +
            `\`/api/v1/${exampleNetwork}/projects\`.`,
        `- **Request limits.** Up to ${formatNumber(limits.systemUserPerHour)} requests an hour with an account ` +
            `(${formatNumber(limits.guestPerHour)} without). Need more? Ask for an increase in *Account Settings*.`,
        `- **Results come in pages** of 20 by default, up to ${MAX_PAGE_SIZE}. Use \`page\` and \`limit\` to move ` +
            'through them.',
        '- **Administrators** have their own guide at [/api/docs/admin](/api/docs/admin).',
        '',
        details('Technical reference for developers', lines(
            '#### Authentication',
            '',
            '| Caller | How to authenticate |',
            '|---|---|',
            '| The Sustainability Atlas web app | Nothing extra. |',
            '| Scripts and integrations | An API key in the `X-API-Key` header. Data requests may return `401` without one. |',
            '| Account requests (`/api/v1/me/…`) | A signed-in session (cookies set by `POST /api/v1/auth/login`). Requests that change something also need the `X-CSRF-Token` header. |',
            '',
            'API keys look like `se_<prefix>_<secret>`. Each account can hold up to ' +
                `${limits.apiKeyMaxActivePerUser} active keys, and revoking one disables it immediately.`,
            '',
            '#### Request limits',
            '',
            '| Caller | Requests per hour |',
            '|---|---|',
            `| Anonymous (counted per IP address) | ${formatNumber(limits.guestPerHour)} |`,
            `| Signed-in user or API key | ${formatNumber(limits.systemUserPerHour)} |`,
            `| Administrator | ${formatNumber(limits.adminPerHour)} |`,
            '',
            'Requests from the Atlas web app are not counted. Counted responses include `X-RateLimit-Limit`, ' +
                '`X-RateLimit-Remaining` and `X-RateLimit-Reset` (seconds). Going over the limit returns ' +
                '`429 Too Many Requests` with a `Retry-After` header (seconds). Increases can be requested up to ' +
                `${formatNumber(limits.maxQuota)} requests an hour (\`POST /api/v1/me/rate-limit-requests\`).`,
            '',
            '#### Networks',
            '',
            'Data addresses have the form `/api/v1/{network}/…`, and each network is kept in its own database. Networks ' +
                'this server does not offer return `404`. Sign-in, account, notification and IPFS addresses have no network.',
            '',
            '#### Identifiers',
            '',
            '| Identifier | Meaning |',
            '|---|---|',
            '| `sourceTimestamp` | Hedera consensus timestamp of the message a record was built from, e.g. `1712345678.123456789`. The main ID of most records. |',
            '| `projectKey` | Alternative project ID, accepted wherever a project `id` is. |',
            '| `mintTimestamp` | Consensus timestamp of the credential that records an issuance. |',
            '| DID | Decentralized identifier of a registry, e.g. `did:hedera:mainnet:…`. |',
            '| Topic or token ID | Hedera IDs in `0.0.N` form. |',
            '',
            '#### Pages and sorting',
            '',
            'Lists accept `page` and `limit`, plus `search`, `sortBy` and `sortDir` (`asc` or `desc`) where supported, ' +
                'and return:',
            '',
            '```json',
            '{ "data": [ … ], "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } }',
            '```',
            '',
            'Notifications page with an opaque `cursor` instead, and serial number requests page through ranges of ' +
                'serials. Each request\'s response schema is authoritative.',
            '',
            '#### Credit data',
            '',
            '- **Declared vs minted.** A credential declares an amount and the on-chain mint can differ, so both are ' +
                'returned. Only a `mintMatchStatus` of `verified` means they match exactly.',
            '- **Serial numbers come as ranges** of `{ from, to, count, deleted, accountId }`. A range never spans two ' +
                'holders. `accountId` is null for retired credits and while ownership is still syncing. Fungible ' +
                'tokens have no serials.',
            '- **Retirements** come from Guardian\'s retirement contract. **Transfers** are read from the Hedera ' +
                'transaction itself, and only the first hop from the registry to its first holder is tracked.',
            '- `/projects/{id}/issuances/{mintTimestamp}/…` checks the issuance belongs to that project, while ' +
                '`/issuances/{mintTimestamp}/…` addresses it directly.',
            '',
            '#### Errors',
            '',
            'Errors are JSON, for example `{ "statusCode": 400, "message": "…", "error": "Bad Request" }`. The ' +
                '`message` field can be a list of validation messages. Unknown query or body fields are rejected with `400`.',
        )),
    );
}

export function buildAdminOverview(): string {
    return lines(
        'Tools for **administrators** to keep Atlas data accurate and manage users. Every request here needs you to be ' +
            'signed in as an administrator. Everyday data requests are in the main guide at [/api/docs](/api/docs).',
        '',
        '### Common tasks',
        '',
        '- **A project shows wrong or missing details?** Fix the field mapping, then rebuild (steps below).',
        '- **Data looks out of date?** Check *Data pipeline* for sync progress and failed jobs, and retry them.',
        '- **Someone needs a higher request limit?** Review it under *Request limit reviews*.',
        '- **Managing people?** Add users, change roles or deactivate accounts under *User management*.',
        '',
        '### Fix a project\'s details',
        '',
        '1. **Edit the mapping** in *Methodologies → Edit a methodology\'s field mapping*.',
        '2. **Rebuild** with *Rebuild a methodology\'s projects using its current mapping*, or use *Rebuild one project ' +
            'from its stored documents* for a single project.',
        '3. **Wait a minute or two.** Project pages update as soon as the work finishes, and methodology statistics ' +
            'refresh about once a minute.',
        '',
        '> **Careful:** *Re-read a methodology from its source* throws away manual mapping edits. After editing a ' +
            'mapping, rebuild instead.',
        '',
        details('Technical reference', lines(
            '#### Signing in',
            '',
            'Every request needs an administrator session, using the cookies set by `POST /api/v1/auth/login` or ' +
                '`Authorization: Bearer <access token>`. API keys are not accepted. Requests that change something ' +
                '(`POST`, `PUT`, `PATCH`, `DELETE`) also need an `X-CSRF-Token` header matching the CSRF cookie from ' +
                'sign-in. **Try it out** uses your browser session, so it works for read-only requests.',
            '',
            '#### Rebuild vs re-read',
            '',
            'Rebuilding (*re-parse*) replays documents already stored in the database through the current field ' +
                'mapping, so nothing is downloaded again. Re-reading (*re-decode*) rebuilds the mapping from the policy ' +
                'source and discards manual edits. Both only queue the work and return straight away. Methodology ' +
                'statistics refresh on `MV_REFRESH_INTERVAL` (default 60 s). Linking documents to projects improves ' +
                'over repeated passes, so a single rebuild is not always enough.',
            '',
            '#### Queue operations',
            '',
            '| Request | Effect |',
            '|---|---|',
            '| `POST /api/v1/{network}/queues/{baseName}/pause` and `/resume` | Stops or restarts workers taking new jobs. Running jobs finish, and new jobs can still be added. |',
            '| `POST /api/v1/{network}/queues/{baseName}/clean` | Deletes finished jobs to free Redis memory. Waiting, delayed and active jobs are never touched. |',
            '| `POST /api/v1/{network}/queues/{baseName}/retry-all-failed` | Re-queues failed jobs, respecting each job\'s manual retry budget. |',
            '| `GET /api/v1/{network}/queues/redis-health` | Memory used vs `maxmemory`, eviction policy and client count. |',
            '',
            'Watch `redis-health` alongside queue depth. At `maxmemory` Redis refuses writes, so new jobs fail outright. ' +
                'The `…/events` requests are Server-Sent Events streams. Behind a reverse proxy, turn off response ' +
                'buffering for them (nginx: `proxy_buffering off;`) or events arrive late.',
        )),
    );
}
