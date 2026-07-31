import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { scalarCustomCss, scalarFavicon } from './scalar-theme.js';

/**
 * Serves the Scalar API reference UI at `/api-docs` and keeps the raw OpenAPI
 * spec available at `/api-docs-json` and `/api-docs-yaml`.
 *
 * The default Swagger UI is disabled (`swaggerUiEnabled: false`) so Scalar can
 * own the `/api-docs` route, while the JSON/YAML spec endpoints are preserved
 * unchanged for the documentation pipeline that curls `/api-docs-yaml` to
 * refresh the committed swagger files.
 */
export function setupApiDocs(app: INestApplication, document: OpenAPIObject, pageTitle: string): void {
    SwaggerModule.setup('api-docs', app, document, {
        swaggerUiEnabled: false,
        jsonDocumentUrl: 'api-docs-json',
        yamlDocumentUrl: 'api-docs-yaml',
    });

    // Point Scalar at the JSON spec route above instead of embedding the
    // document: `apiReference` rebuilds the page on every request, so embedding
    // the multi-MB spec via `content` would re-serialize it on each hit. A
    // relative URL also survives a path-prefixing reverse proxy.
    app.use(
        '/api-docs',
        apiReference({
            url: 'api-docs-json',
            pageTitle,
            layout: 'modern',
            theme: 'default',
            darkMode: false,
            favicon: scalarFavicon,
            customCss: scalarCustomCss,
        })
    );
}
