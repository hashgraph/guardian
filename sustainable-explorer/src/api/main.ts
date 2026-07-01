import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ApiModule } from './api.module';
import {
    ensureAllNetworkDatabasesExist,
    ensureSystemDatabaseExists,
    getConfiguredNetworks,
} from '@shared/config/database.config';
import { resolveNestLogLevels } from '@shared/config/log-level';
import { bootstrapSystemDatabase, seedInitialAdmin } from '@shared/database/schema-bootstrap';

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

    // Swagger / OpenAPI
    const apiPort = parseInt(process.env.API_PORT || '3030', 10);
    const directApiUrl = `http://localhost:${apiPort}`;
    const corsOrigin = (process.env.API_CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)[0];
    const swaggerBuilder = new DocumentBuilder()
        .setTitle('Sustainable Explorer API')
        .setDescription('REST API for querying indexed Hedera Guardian sustainability data')
        .setVersion('1.0')
        .addTag('registries', 'Standard Registries')
        // Lets you paste an API key (se_...) into Swagger's "Authorize" dialog so the
        // X-API-Key header is sent on "Try it out" — the programmatic access path when
        // DATA_ACCESS_ENFORCE=true. Cookie-authed routes work via the browser session.
        .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header', description: 'Programmatic access key (se_…)' }, 'api-key')
        // Swagger UI is served BY the API, so the default server must be the API's own
        // origin — otherwise "Try it out" makes a cross-origin call (CORS "Failed to
        // fetch"). The proxied frontend URL is offered as a secondary server option.
        .addServer(directApiUrl, 'Direct API');
    if (corsOrigin && corsOrigin !== directApiUrl) {
        swaggerBuilder.addServer(corsOrigin, 'Via frontend proxy');
    }
    const swaggerConfig = swaggerBuilder.build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    // Offer the api-key on every operation so any endpoint can be tried with a key
    // from the UI. It's only SENT when you've authorized — public routes still work
    // without it; it's required only for programmatic data access under enforcement.
    document.security = [{ 'api-key': [] }];
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    });

    const port = parseInt(process.env.API_PORT || '3030', 10);
    await app.listen(port);

    logger.log(`API server running on http://localhost:${port}`);
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
    logger.log(`Example: http://localhost:${port}/api/v1/${networks[0]}/registries`);
}

bootstrap();
