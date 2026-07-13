import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Regression test for the unhandled-rejection hardening: the global
 * error-handler import must not run before configuration is loaded.
 *
 * `./helpers/register-global-error-handlers.js` imports `@guardian/common`,
 * whose module-scope config reads `process.env` *at import time* - notably
 * COMMON_CONNECTION_CONFIG in common/src/helpers/db-helper.ts, whose dbName is
 * composed from GUARDIAN_ENV / HEDERA_NET / DB_DATABASE and whose clientUrl
 * comes from DB_HOST. If that import is evaluated before `./config.js` runs
 * `dotenv.config()`, the DB connection config freezes to `undefined`
 * ("mongodb://undefined") for any run that sources configuration from a .env
 * file. Containerized deployments inject real env vars before Node starts and
 * are unaffected, which is why this ordering bug is easy to miss.
 *
 * Required side-effect import order in index.ts:
 *   1. ./config.js                               (dotenv.config() -> populates process.env)
 *   2. ./helpers/register-global-error-handlers  (imports @guardian/common; reads env)
 *   3. ./app.js                                  (async bootstrap; the source of the
 *                                                 unhandled rejections the handlers guard)
 *
 * config.js is synchronous and cannot emit an unhandled promise rejection, so
 * moving it ahead of the handler registration preserves the guarantee that the
 * handlers are armed before the async bootstrap in app.js.
 */
describe('index.ts side-effect import order', () => {
    const indexPath = fileURLToPath(new URL('../../src/index.ts', import.meta.url));
    const source = readFileSync(indexPath, 'utf8');

    // Ordered list of bare side-effect import specifiers, e.g. "./config.js".
    const importOrder = source
        .split('\n')
        .map((line) => line.match(/^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/))
        .filter(Boolean)
        .map((m) => m[1]);

    const posOf = (spec) => importOrder.indexOf(spec);

    it('imports ./config.js (dotenv) before the global error handlers', () => {
        const config = posOf('./config.js');
        const handlers = posOf('./helpers/register-global-error-handlers.js');

        expect(config, './config.js must be a side-effect import').to.be.greaterThan(-1);
        expect(handlers, 'register-global-error-handlers.js must be a side-effect import').to.be.greaterThan(-1);
        expect(
            config,
            'config.js (dotenv) must load before register-global-error-handlers.js, which imports ' +
                '@guardian/common and reads process.env at module-load time'
        ).to.be.lessThan(handlers);
    });

    it('registers the global error handlers before ./app.js bootstraps', () => {
        const handlers = posOf('./helpers/register-global-error-handlers.js');
        const app = posOf('./app.js');

        expect(app, './app.js must be a side-effect import').to.be.greaterThan(-1);
        expect(
            handlers,
            'error handlers must be armed before app.js, the async bootstrap that can emit unhandled rejections'
        ).to.be.lessThan(app);
    });
});
