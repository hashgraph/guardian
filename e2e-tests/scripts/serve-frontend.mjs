// Serves the frontend's production build for the UI specs, behind the gateway proxy of frontend/proxy.hostdocker.js.
// `ng serve` adds an inline source map of about 75 MB to main.js on every load, and Cypress 16 cannot hand a
// response that large back to Chrome through CDP; the static build is 17 MB and needs no dev-server transform.
//
//   (cd frontend && npx ng build --configuration production)
//   node scripts/serve-frontend.mjs        # http://127.0.0.1:4200; UI_GATEWAY_ORIGIN and UI_PROXY_LOG as for ng serve
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FRONTEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend');
const frontendRequire = createRequire(path.join(FRONTEND_DIR, 'package.json'));

// The Angular proxy format names the path rewrite `pathRewrite` (regex -> replacement); Vite takes a function.
function viteProxyFrom(angularProxy) {
    return Object.fromEntries(Object.entries(angularProxy).map(([context, { pathRewrite, ...options }]) => [context, {
        ...options,
        ...(pathRewrite && {
            rewrite: (requestPath) => Object.entries(pathRewrite)
                .reduce((rewritten, [pattern, replacement]) => rewritten.replace(new RegExp(pattern), replacement), requestPath),
        }),
    }]));
}

// Resolves with the Vite preview server (`resolvedUrls`, `close()`); client routes get index.html.
export async function startFrontendServer({ distDir, angularProxy, host = '127.0.0.1', port = 4200 }) {
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
        throw new Error(`no index.html in ${distDir}: run \`npx ng build --configuration production\` in frontend first`);
    }
    const { preview } = await import(pathToFileURL(frontendRequire.resolve('vite')).href);
    return preview({
        configFile: false,
        logLevel: 'warn',
        root: path.dirname(distDir),
        build: { outDir: distDir },
        preview: { host, port, strictPort: true, proxy: viteProxyFrom(angularProxy) },
    });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const server = await startFrontendServer({
        distDir: path.join(FRONTEND_DIR, 'dist', 'guardian', 'browser'),
        angularProxy: frontendRequire('./proxy.hostdocker.js'),
    });
    console.log(`frontend production build on ${server.resolvedUrls.local[0]}`);
}
