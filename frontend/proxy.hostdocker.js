// Dev-server proxy for running the UI where the Guardian backend does not listen on
// localhost (for example from the e2e-tests container, which reaches the host stack
// through the docker host alias). Set UI_GATEWAY_ORIGIN to point at a different
// gateway, e.g. http://10.0.0.5:3002/.
const GATEWAY = process.env.UI_GATEWAY_ORIGIN || 'http://host.docker.internal:3002/';

// The Angular dev server does not log proxied requests even at logLevel "debug", which
// makes it impossible to tell from its output whether the browser even issued a request
// (a dead WebSocket or a swallowed 401 look identical). Log every proxied request to
// stderr instead, with the auth header's presence so tokenless calls stand out.
function proxyRequestLogger() {
    return function configure(proxyServer) {
        proxyServer.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers.authorization ? 'auth' : 'NO-AUTH';
            console.error(`[proxy] ${req.method} ${req.url} (${auth})`);
        });
        proxyServer.on('proxyReqWs', (proxyReq, req) => {
            const auth = req.headers.authorization ? 'auth' : 'NO-AUTH';
            console.error(`[proxy] WS-UPGRADE ${req.url} (${auth})`);
        });
        proxyServer.on('proxyRes', (proxyRes, req) => {
            console.error(`[proxy] ${req.method} ${req.url} <- ${proxyRes.statusCode}`);
        });
    };
}

console.error(`[proxy] config loaded: ${GATEWAY}`);

const base = {
    target: GATEWAY,
    secure: false,
    logLevel: 'debug',
    changeOrigin: true,
    configure: proxyRequestLogger(),
};

module.exports = {
    '/api-docs': {
        ...base,
        ws: false,
    },
    '/api/v1/': {
        ...base,
        ws: false,
        pathRewrite: {
            '/api/v1': '',
        },
    },
    '/ws/': {
        ...base,
        ws: true,
        pathRewrite: {
            '/ws': '',
        },
    },
    '/openai/': {
        ...base,
        ws: true,
    },
};
