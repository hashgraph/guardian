import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ApiModule } from './api.module';
import {
    ensureAllNetworkDatabasesExist,
    ensureSystemDatabaseExists,
    getConfiguredNetworks,
} from '@shared/config/database.config';
import { resolveNestLogLevels } from '@shared/config/log-level';
import { bootstrapSystemDatabase, seedInitialAdmin } from '@shared/database/schema-bootstrap';
import { ROLES_KEY } from './auth/decorators/roles.decorator';
import { TokenService } from './auth/token.service';
import {
    TAG_DESCRIPTIONS,
    buildAdminOverview,
    buildPublicOverview,
    details,
    RateLimitDocsConfig,
} from './swagger/swagger-docs';
import { SWAGGER_UI_OPTIONS } from './swagger/swagger-theme';

const HTTP_METHOD_KEYS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

/**
 * Walks every controller class registered anywhere in the module graph (the
 * same set `SwaggerModule.createDocument()` itself scans — including
 * AuthModule/AdminModule/AccountModule/NotificationsModule, not just
 * ApiModule's own flat `controllers` list) and returns the operationIds of
 * every method carrying `@Roles('admin')` metadata (applied via
 * `AdminWrite()`/`AdminRead()`). Reuses `@nestjs/swagger`'s own default
 * `${ControllerClassName}_${methodName}` operationId format so the result
 * lines up exactly with `document.paths[...][...].operationId` — this is the
 * same private `app.container` access `@nestjs/swagger`'s own
 * `SwaggerScanner` uses internally, not a new pattern.
 */
function collectAdminOperationIds(app: INestApplication): Set<string> {
    const ids = new Set<string>();
    const container = (app as unknown as {
        container: { getModules(): Map<unknown, { controllers: Map<unknown, { metatype?: { new (...args: unknown[]): unknown; name: string; prototype: object } }> }> };
    }).container;

    for (const module of container.getModules().values()) {
        for (const wrapper of module.controllers.values()) {
            const ctor = wrapper.metatype;
            if (!ctor?.prototype) continue;
            // Some controllers (AdminUsersController, RateLimitAdminController,
            // GuardianSyncController) apply @Roles('admin') at the CLASS level rather
            // than per-method — mirror RolesGuard's own precedence
            // (`reflector.getAllAndOverride(ROLES_KEY, [handler, class])`): a
            // method-level @Roles wins when present, else fall back to the class.
            const classRoles = Reflect.getMetadata(ROLES_KEY, ctor) as string[] | undefined;
            for (const methodName of Object.getOwnPropertyNames(ctor.prototype)) {
                if (methodName === 'constructor') continue;
                const handler = (ctor.prototype as Record<string, unknown>)[methodName];
                if (typeof handler !== 'function') continue;
                const methodRoles = Reflect.getMetadata(ROLES_KEY, handler) as string[] | undefined;
                const roles = methodRoles ?? classRoles;
                if (roles?.includes('admin')) {
                    ids.add(`${ctor.name}_${methodName}`);
                }
            }
        }
    }
    return ids;
}

/**
 * Deep-clones `fullDocument` and keeps only operations for which `keep(operationId)`
 * is true, dropping any path left with zero remaining HTTP methods — e.g. a
 * controller that's entirely on one side of the split. Metadata-reflection-based
 * (not tag- or controller-based) because several controllers (methodologies,
 * policies, project, queue-status) mix public and admin-only routes in the
 * same class, and `adminOperationIds` (built from the identical `@Roles`
 * metadata `RolesGuard` reads) is the only signal accurate at route
 * granularity. Used both directions: the public doc keeps everything NOT in
 * `adminOperationIds`, the admin doc keeps ONLY what's in it — admins can
 * already use the public data-fetching endpoints via the public doc, so the
 * admin doc isn't a superset, it's just the admin-only actions.
 */
function filterDocument(fullDocument: OpenAPIObject, keep: (operationId: string) => boolean): OpenAPIObject {
    const filtered: OpenAPIObject = JSON.parse(JSON.stringify(fullDocument));
    const usedTags = new Set<string>();

    for (const [path, pathItem] of Object.entries(filtered.paths)) {
        const item = pathItem as Record<string, { operationId?: string; tags?: string[] } | unknown>;
        for (const method of HTTP_METHOD_KEYS) {
            const operation = item[method] as { operationId?: string; tags?: string[] } | undefined;
            if (operation?.operationId && !keep(operation.operationId)) {
                delete item[method];
                continue;
            }
            operation?.tags?.forEach((tag) => usedTags.add(tag));
        }
        const hasAnyMethod = HTTP_METHOD_KEYS.some((method) => item[method] !== undefined);
        if (!hasAnyMethod) {
            delete filtered.paths[path];
        }
    }

    // Tag descriptions are declared once for the full scan; without this, admin-only
    // groups would render as empty sections in the public doc and vice versa.
    filtered.tags = filtered.tags?.filter((tag) => usedTags.has(tag.name));

    return filtered;
}

const RATE_LIMITED_RESPONSE = {
    description: 'Hourly rate limit exceeded. Wait `Retry-After` seconds before retrying.',
    headers: {
        'Retry-After': { description: 'Seconds until the quota window resets', schema: { type: 'integer' } },
        'X-RateLimit-Limit': { description: 'Quota for the current window', schema: { type: 'integer' } },
        'X-RateLimit-Remaining': { description: 'Requests left in the current window', schema: { type: 'integer' } },
        'X-RateLimit-Reset': { description: 'Seconds until the window resets', schema: { type: 'integer' } },
    },
};

/**
 * Adds responses produced by globally registered guards (DataAccessGuard,
 * RateLimitGuard), which no controller declares itself. A response an operation
 * already documents is never overwritten.
 */
function addGuardResponses(document: OpenAPIObject, responsesFor: (path: string) => Record<string, unknown>): void {
    for (const [path, pathItem] of Object.entries(document.paths)) {
        const additions = responsesFor(path);
        const item = pathItem as Record<string, { responses?: Record<string, unknown> } | undefined>;
        for (const method of HTTP_METHOD_KEYS) {
            const operation = item[method];
            if (!operation) continue;
            operation.responses ??= {};
            for (const [status, response] of Object.entries(additions)) {
                operation.responses[status] ??= response;
            }
        }
    }
}

/** Puts each operation's (often technical) description behind a "More details" toggle so its plain-language summary leads. */
function collapseDescriptions(document: OpenAPIObject): void {
    for (const pathItem of Object.values(document.paths)) {
        const item = pathItem as Record<string, { description?: string } | undefined>;
        for (const method of HTTP_METHOD_KEYS) {
            const operation = item[method];
            if (operation?.description) {
                operation.description = details('More details', operation.description);
            }
        }
    }
}

/**
 * Express-level gate for `/api/docs/admin`: `SwaggerModule.setup()` mounts a
 * raw swagger-ui-express router that Nest guards/decorators can't reach, so
 * the admin doc is protected by a plain middleware registered on the same
 * path prefix ahead of it, reusing `TokenService.verifyAccessToken()` (the
 * same verification `JwtAuthGuard` performs) plus a live role check.
 * `cookieParser()` runs earlier in bootstrap, so `req.cookies` is already
 * parsed by the time this executes.
 */
function createAdminDocsGate(tokenService: TokenService) {
    return async (
        req: { cookies?: Record<string, string> },
        res: { status(code: number): { json(body: unknown): void } },
        next: () => void,
    ): Promise<void> => {
        try {
            const token = req.cookies?.['access'];
            if (!token) throw new Error('missing token');
            const payload = await tokenService.verifyAccessToken(token);
            if (!payload.isActive || payload.role !== 'admin') throw new Error('not admin');
            next();
        } catch {
            res.status(401).json({
                statusCode: 401,
                message: 'An active admin session is required to view this documentation.',
            });
        }
    };
}

async function bootstrap() {
    const logger = new Logger('SustainableExplorer:API');
    const networks = getConfiguredNetworks();

    logger.log(`Configured networks: ${networks.join(', ')}`);

    // Ensure every network's database exists before starting NestJS
    await ensureAllNetworkDatabasesExist();

    // Ensure the system (auth/identity) database exists, bootstrap its schema
    // (idempotent CREATE TABLE/INDEX IF NOT EXISTS), and seed the break-glass
    // initial admin. All idempotent. Must run BEFORE NestFactory.create so the
    // app never boots on a half-created schema. Mirrors the worker's
    // ensureDatabaseExists + bootstrapSchema startup pattern.
    await ensureSystemDatabaseExists();
    await bootstrapSystemDatabase();
    await seedInitialAdmin();

    const app = await NestFactory.create(ApiModule, {
        logger: resolveNestLogLevels(),
    });

    // Security headers. CSP is disabled because the Nuxt SSR frontend sets its own
    // (helmet's default CSP would block Nuxt's inline scripts/hydration);
    // crossOriginResourcePolicy:'cross-origin' lets the SSR frontend on another
    // origin consume API responses.
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));

    // gzip response bodies. Some responses (e.g. the methodology decoded-mapping
    // endpoint) run into multiple MB of JSON; without this they were shipped
    // uncompressed and dominated by transfer time rather than server processing.
    // SSE streams (@Sse routes, e.g. /queues/events, /me/notifications/events) are
    // excluded: compression buffers writes inside a zlib stream until enough data
    // accumulates to flush, which would delay live events indefinitely since
    // Nest's SSE implementation never calls the res.flush() this module exposes —
    // silently defeating the real-time delivery the nginx proxy_buffering:off
    // config (see README) exists to guarantee at the proxy layer.
    app.use(compression({
        filter: (req, res) => {
            if (res.getHeader('Content-Type') === 'text/event-stream') return false;
            return compression.filter(req, res);
        },
    }));

    // cookie-parser populates req.cookies so JwtAuthGuard and CsrfGuard can read
    // the httpOnly access cookie and csrf double-submit cookie by name rather than
    // parsing the raw Cookie header string. Must be registered after helmet/CORS
    // and before ValidationPipe / route handlers.
    app.use(cookieParser());

    // credentials:true is required for httpOnly auth cookies to be sent cross-origin.
    // IMPORTANT: credentials:true is incompatible with origin:'*' — the origin list
    // MUST be an explicit allowlist (never a wildcard). Setting API_CORS_ORIGINS='*'
    // would cause browsers to reject the preflight. Always use an explicit comma-
    // separated list of allowed origins.
    app.enableCors({
        origin: (process.env.API_CORS_ORIGINS || 'http://localhost:3000')
            .split(',')
            .map(o => o.trim()),
        credentials: true,
    });

    // forbidNonWhitelisted + forbidUnknownValues close the mass-assignment attack
    // surface: any extra field in the request body causes a 400 rather than being
    // silently stripped. Combined with separate SignUpDto / AdminCreateUserDto
    // (added in a later phase) this prevents role mass-assignment at signup.
    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
    }));

    // Swagger / OpenAPI — one full scan, split into two disjoint documents: PUBLIC
    // gets every data-fetching endpoint (everything NOT @Roles('admin')); ADMIN
    // gets ONLY the admin-only actions (re-decode, re-parse, queue control, user
    // administration, rate limits) — not a superset of the public doc, since an
    // admin can already reach every public query endpoint via the public doc and
    // doesn't need it duplicated alongside the actions that are actually
    // restricted to them.
    const apiPort = parseInt(process.env.API_PORT || '3030', 10);
    const directApiUrl = `http://localhost:${apiPort}`;
    const corsOrigin = (process.env.API_CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)[0];
    const buildSwaggerConfig = (title: string) => {
        const builder = new DocumentBuilder()
            .setTitle(title)
            .setVersion('1.0')
            // Lets you paste an API key (se_...) into Swagger's "Authorize" dialog so the
            // X-API-Key header is sent on "Try it out" — the programmatic access path when
            // DATA_ACCESS_ENFORCE=true. Cookie-authed routes work via the browser session.
            .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header', description: 'Programmatic access key (se_…)' }, 'api-key')
            // Swagger UI is served BY the API, so the default server must be the API's own
            // origin — otherwise "Try it out" makes a cross-origin call (CORS "Failed to
            // fetch"). The proxied frontend URL is offered as a secondary server option.
            .addServer(directApiUrl, 'Direct API');
        if (corsOrigin && corsOrigin !== directApiUrl) {
            builder.addServer(corsOrigin, 'Via frontend proxy');
        }
        for (const [name, tagDescription] of Object.entries(TAG_DESCRIPTIONS)) {
            builder.addTag(name, tagDescription);
        }
        return builder.build();
    };

    const fullDocument = SwaggerModule.createDocument(app, buildSwaggerConfig('Sustainability Atlas API'));
    collapseDescriptions(fullDocument);

    const adminOperationIds = collectAdminOperationIds(app);
    const publicDocument = filterDocument(fullDocument, (id) => !adminOperationIds.has(id));
    // Offer the api-key on every public operation so any endpoint can be tried with a
    // key from the UI. It's only SENT when you've authorized — routes still work
    // without it; it's required only for programmatic data access under enforcement.
    // Admin actions are cookie/session-only, so this is public-doc-only.
    publicDocument.security = [{ 'api-key': [] }];
    publicDocument.info.description = buildPublicOverview(
        networks,
        app.get(ConfigService).getOrThrow<RateLimitDocsConfig>('app.rateLimit'),
    );
    addGuardResponses(publicDocument, (path) => ({
        ...(path.includes('{network}')
            ? { 401: { description: 'API key missing or invalid. Programmatic access to data endpoints may require `X-API-Key`.' } }
            : {}),
        429: RATE_LIMITED_RESPONSE,
    }));

    const adminDocument = filterDocument(fullDocument, (id) => adminOperationIds.has(id));
    adminDocument.info.title = 'Sustainability Atlas API — Admin';
    adminDocument.info.description = buildAdminOverview();
    addGuardResponses(adminDocument, () => ({
        401: { description: 'No valid session' },
        403: { description: 'Administrator role required' },
        429: RATE_LIMITED_RESPONSE,
    }));

    SwaggerModule.setup('api/docs', app, publicDocument, {
        ...SWAGGER_UI_OPTIONS,
        customSiteTitle: 'Sustainability Atlas API Docs',
    });

    // Admin doc mounted at a new path so the existing /api/docs link keeps working
    // unchanged; gated by a plain middleware ahead of swagger-ui-express's own router,
    // since SwaggerModule.setup() doesn't accept Nest guards. Listed explicitly rather
    // than as a single path prefix: swagger-ui-express registers '-json'/'-yaml' as
    // SIBLING paths (not sub-paths) of the UI mount point, e.g. '/api/docs/admin-json' —
    // Express's use('/api/docs/admin', ...) does NOT match that (correctly, since it
    // only matches on a '/' segment boundary), so it would otherwise serve the full
    // admin spec, unauthenticated, at the JSON/YAML URLs.
    const adminDocsGate = createAdminDocsGate(app.get(TokenService));
    app.use([
        '/api/docs/admin',
        '/api/docs/admin/',
        '/api/docs/admin/index.html',
        '/api/docs/admin-json',
        '/api/docs/admin-yaml',
    ], adminDocsGate);
    SwaggerModule.setup('api/docs/admin', app, adminDocument, {
        ...SWAGGER_UI_OPTIONS,
        customSiteTitle: 'Sustainability Atlas API Docs — Admin',
    });

    // Without this the API never runs onModuleDestroy, so QueueRegistry's own
    // (correct) teardown never fires and its Queue/QueueEvents connections — the
    // bulk of this process's Redict clients, most of them parked on a blocking
    // XREAD — are only closed by the socket dying with the process. Redict then
    // carries them until its own timeout notices.
    //
    // This registers Nest's own SIGTERM/SIGINT handling, so do NOT also add
    // manual signal handlers that call app.close(): both would fire on one
    // signal, running every onModuleDestroy twice (closing already-closed
    // queues, disconnecting the shared client twice), and a manual process.exit
    // would cut Nest's shutdown short — defeating the point of adding it.
    app.enableShutdownHooks();

    const port = parseInt(process.env.API_PORT || '3030', 10);
    await app.listen(port);

    logger.log(`API server running on http://localhost:${port}`);
    logger.log(`Swagger docs (public): http://localhost:${port}/api/docs`);
    logger.log(`Swagger docs (admin): http://localhost:${port}/api/docs/admin`);
    logger.log(`Example: http://localhost:${port}/api/v1/${networks[0]}/registries`);
}

bootstrap();
