#!/usr/bin/env node
/**
 * Readiness gates for the Guardian stack, replacing the fixed `sleep`s the CI
 * workflow used to rely on. Every gate checks a condition and reports what was
 * actually missing when it times out.
 *
 *   node wait-for-guardian.mjs nats <CLIENT_NAME>...
 *       Waits until each named NATS client connection exists. Every service calls
 *       MessageBrokerChannel.connect(<name>) (common/src/mq/message-broker-channel.ts),
 *       which sets the NATS client name, so the monitoring endpoint lists one entry
 *       per running process.
 *
 *   node wait-for-guardian.mjs ready
 *       The gate that replaces `sleep 15`:
 *         1. GET /metrics on the gateway  -> the HTTP server is accepting requests
 *         2. WebSocket GET_STATUS         -> every service reports ApplicationStates.READY
 *         3. POST /accounts/login         -> the whole gateway -> NATS -> auth-service ->
 *                                            MongoDB path works and the demo fixtures exist
 *
 * Environment:
 *   NATS_MONITOR      default http://127.0.0.1:8222
 *   GUARDIAN_GATEWAY  default http://127.0.0.1:3002
 *   GUARDIAN_LOG_DIR  where Start Guardian wrote <service>-<n>.log and `pids`
 *   WORKER_COUNT      default 5, how many worker-service processes to expect
 *   WAIT_TIMEOUT      per-gate timeout in seconds, default 300
 */
import fs from 'node:fs';
import path from 'node:path';

const NATS_MONITOR = process.env.NATS_MONITOR || 'http://127.0.0.1:8222';
const GATEWAY = process.env.GUARDIAN_GATEWAY || 'http://127.0.0.1:3002';
const LOG_DIR = process.env.GUARDIAN_LOG_DIR || '';
const WORKER_COUNT = Number(process.env.WORKER_COUNT || 5);
const TIMEOUT_MS = Number(process.env.WAIT_TIMEOUT || 300) * 1000;
const POLL_MS = 2000;

// NatsService.sendMessage (common/src/mq/nats-service.ts) waits on its reply map with
// no timeout at all, so a request issued before the backend has subscribed hangs
// forever instead of failing. Every fetch here must carry its own deadline.
const HTTP_TIMEOUT_MS = 10_000;

/** NATS client name -> the directory whose log to show when it never turns up. */
const SERVICE_BY_CLIENT_NAME = {
    LOGGER_SERVICE: 'logger-service',
    NOTIFICATION_SERVICE: 'notification-service',
    AUTH_SERVICE: 'auth-service',
    QUEUE_SERVICE: 'queue-service',
    'policy-service': 'policy-service',
    LISTENER_SERVICE: 'topic-listener-service',
    WORKERS_SERVICE: 'worker-service',
    GUARDIANS_SERVICE: 'guardian-service',
    API_GATEWAY: 'api-gateway',
};

/**
 * The services api-gateway seeds into its status map
 * (api-gateway/src/api/service/websockets.ts, getStatusesHandler).
 *
 * WORKER is deliberately not counted: worker-service never assigns
 * process.env.SERVICE_CHANNEL (worker-service/src/app.ts:17 keeps the generated
 * channel name local), so the gateway keys all worker processes under the single
 * `WORKER` entry. Worker multiplicity is asserted through NATS `connz` instead.
 */
const REQUIRED_STATUS_SERVICES = [
    'GUARDIAN_SERVICE',
    'AUTH_SERVICE',
    'POLICY_SERVICE',
    'NOTIFICATION_SERVICE',
    'WORKER',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(message) {
    console.log(message);
}

function fail(message, details = []) {
    console.log(`::error::${message}`);
    for (const line of details) {
        console.log(line);
    }
    process.exit(1);
}

async function getJson(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (!response.ok) {
        throw new Error(`${url} -> HTTP ${response.status}`);
    }
    return response.json();
}

/* ------------------------------------------------------------------ diagnostics */

function trackedProcesses() {
    if (!LOG_DIR) {
        return [];
    }
    const pidFile = path.join(LOG_DIR, 'pids');
    if (!fs.existsSync(pidFile)) {
        return [];
    }
    return fs.readFileSync(pidFile, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [pid, label] = line.split(/\s+/);
            return { pid: Number(pid), label };
        });
}

function isAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

/** A service that died at boot should fail the gate now, not 5 minutes from now. */
function assertProcessesAlive() {
    const dead = trackedProcesses().filter(({ pid }) => !isAlive(pid));
    if (dead.length === 0) {
        return;
    }
    const details = [];
    for (const { label } of dead) {
        details.push(...tailLog(label.split('#')[0]));
    }
    fail(`Guardian process(es) exited during startup: ${dead.map((d) => d.label).join(', ')}`, details);
}

function tailLog(service, lines = 40) {
    if (!LOG_DIR || !fs.existsSync(LOG_DIR)) {
        return [];
    }
    const matches = fs.readdirSync(LOG_DIR).filter((f) => f.startsWith(`${service}-`) && f.endsWith('.log'));
    const out = [];
    for (const file of matches.slice(0, 2)) {
        const content = fs.readFileSync(path.join(LOG_DIR, file), 'utf8').split('\n');
        out.push(`::group::last ${lines} lines of ${file}`);
        out.push(...content.slice(-lines));
        out.push('::endgroup::');
    }
    return out;
}

/* -------------------------------------------------------------------- nats gate */

async function natsClientNames() {
    const data = await getJson(`${NATS_MONITOR}/connz?limit=1024`);
    return (data.connections || []).map((c) => c.name).filter(Boolean);
}

async function waitForNatsClients(expected) {
    // Several worker-service processes share the WORKERS_SERVICE client name, so the
    // requirement is a count rather than mere presence.
    const required = new Map();
    for (const name of expected) {
        required.set(name, name === 'WORKERS_SERVICE' ? WORKER_COUNT : 1);
    }

    log(`Waiting for NATS clients: ${[...required].map(([n, c]) => (c > 1 ? `${n} x${c}` : n)).join(', ')}`);

    const deadline = Date.now() + TIMEOUT_MS;
    let seen = [];
    let lastError = '';

    while (Date.now() < deadline) {
        assertProcessesAlive();
        try {
            seen = await natsClientNames();
            const missing = [...required].filter(([name, count]) =>
                seen.filter((n) => n === name).length < count);
            if (missing.length === 0) {
                log(`All expected NATS clients are connected (${seen.length} connections total).`);
                return;
            }
        } catch (error) {
            lastError = error.message;
        }
        await sleep(POLL_MS);
    }

    const missing = [...required].filter(([name, count]) =>
        seen.filter((n) => n === name).length < count);
    const details = [`connected clients: ${seen.join(', ') || '(none)'}`];
    if (lastError) {
        details.push(`last NATS monitoring error: ${lastError}`);
    }
    for (const [name] of missing) {
        const service = SERVICE_BY_CLIENT_NAME[name];
        if (service) {
            details.push(...tailLog(service));
        }
    }
    fail(
        `Timed out after ${TIMEOUT_MS / 1000}s waiting for NATS client(s): ` +
        missing.map(([n, c]) => `${n} (need ${c}, saw ${seen.filter((x) => x === n).length})`).join(', '),
        details,
    );
}

/* ------------------------------------------------------------------- ready gate */

async function waitForGatewayHttp() {
    log(`Waiting for the API gateway HTTP server on ${GATEWAY} ...`);
    const deadline = Date.now() + TIMEOUT_MS;
    let last = '';

    while (Date.now() < deadline) {
        assertProcessesAlive();
        try {
            // /metrics is the only unauthenticated route that does not round-trip
            // through NATS (api-gateway/src/api/service/metrics.ts), so it isolates
            // "HTTP is up" from "the backend answers".
            const response = await fetch(`${GATEWAY}/metrics`, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
            if (response.ok) {
                log('API gateway is accepting HTTP requests.');
                return;
            }
            last = `HTTP ${response.status}`;
        } catch (error) {
            last = error.message;
        }
        await sleep(POLL_MS);
    }
    fail(`Timed out waiting for ${GATEWAY}/metrics (last: ${last})`, tailLog('api-gateway'));
}

/**
 * api-gateway answers an unauthenticated {"type":"GET_STATUS"} frame with the
 * ApplicationState of every service it has heard from. This is the only real
 * readiness surface the product exposes -- there is no HTTP health endpoint.
 */
async function waitForServicesReady() {
    if (typeof WebSocket === 'undefined') {
        log('::warning::global WebSocket is unavailable in this Node build; skipping the GET_STATUS gate.');
        return;
    }

    const wsUrl = `${GATEWAY.replace(/^http/, 'ws')}/ws`;
    log(`Waiting for ${REQUIRED_STATUS_SERVICES.join(', ')} to report READY via ${wsUrl} ...`);

    const deadline = Date.now() + TIMEOUT_MS;
    let latest = {};

    while (Date.now() < deadline) {
        assertProcessesAlive();
        try {
            latest = await pollStatusOnce(wsUrl);
            const notReady = REQUIRED_STATUS_SERVICES.filter((name) => {
                const states = latest[name];
                return !Array.isArray(states) || states.length === 0 || states.some((s) => s !== 'READY');
            });
            if (notReady.length === 0) {
                log('All services report READY.');
                return;
            }
        } catch {
            // the gateway may still be wiring up its WebSocket server; keep polling
        }
        await sleep(POLL_MS);
    }

    const details = [`last reported statuses: ${JSON.stringify(latest)}`];
    for (const name of REQUIRED_STATUS_SERVICES) {
        const states = latest[name];
        if (!Array.isArray(states) || states.length === 0 || states.some((s) => s !== 'READY')) {
            const service = name === 'WORKER' ? 'worker-service'
                : name === 'GUARDIAN_SERVICE' ? 'guardian-service'
                : name === 'AUTH_SERVICE' ? 'auth-service'
                : name === 'POLICY_SERVICE' ? 'policy-service'
                : 'notification-service';
            details.push(...tailLog(service));
        }
    }
    fail(`Timed out after ${TIMEOUT_MS / 1000}s waiting for all services to report READY`, details);
}

function pollStatusOnce(wsUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        // getStatusesHandler publishes GET_STATUS and waits STATUS_POLL_WAIT (500ms)
        // before broadcasting, so a single round-trip needs a few seconds of slack.
        const timer = setTimeout(() => {
            ws.close();
            reject(new Error('GET_STATUS round-trip timed out'));
        }, 8000);

        ws.onopen = () => ws.send(JSON.stringify({ type: 'GET_STATUS' }));
        ws.onerror = () => {
            clearTimeout(timer);
            reject(new Error('WebSocket error'));
        };
        ws.onmessage = (event) => {
            let frame;
            try {
                frame = JSON.parse(typeof event.data === 'string' ? event.data : '');
            } catch {
                return;
            }
            if (frame?.type === 'GET_STATUS' || frame?.type === 'UPDATE_STATUS') {
                clearTimeout(timer);
                ws.close();
                resolve(frame.data || {});
            }
        };
    });
}

/**
 * Final assertion: the demo Standard Registry can actually log in. A 200 proves the
 * gateway, NATS, auth-service's config validation and its demo fixtures
 * (auth-service/src/helpers/fixtures.demo.ts) are all done -- which is what creates
 * the users the Cypress suite logs in as.
 */
async function waitForDemoLogin() {
    const credentials = readDemoCredentials();
    if (!credentials) {
        log('::warning::could not read SRUser/Password from cypress.env.json; skipping the login gate.');
        return;
    }

    log(`Waiting for POST ${GATEWAY}/accounts/login to succeed ...`);
    const deadline = Date.now() + TIMEOUT_MS;
    let last = '';

    while (Date.now() < deadline) {
        assertProcessesAlive();
        try {
            const response = await fetch(`${GATEWAY}/accounts/login`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(credentials),
                signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
            });
            // Only ever report the status: the body carries a refreshToken.
            if (response.ok) {
                const body = await response.json();
                if (body?.refreshToken) {
                    log('Demo Standard Registry login succeeded; the stack is ready.');
                    return;
                }
                last = 'HTTP 200 without a refreshToken';
            } else {
                last = `HTTP ${response.status}`;
            }
        } catch (error) {
            last = error.message;
        }
        await sleep(POLL_MS);
    }
    fail(`Timed out waiting for the demo login (last: ${last})`, tailLog('auth-service'));
}

function readDemoCredentials() {
    const file = process.env.E2E_ENV_FILE
        || path.join(process.env.GITHUB_WORKSPACE || process.cwd(), 'e2e-tests', 'cypress.env.json');
    try {
        const env = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (env.SRUser && env.Password) {
            return { username: env.SRUser, password: env.Password };
        }
    } catch {
        return null;
    }
    return null;
}

/* -------------------------------------------------------------------------- main */

const [mode, ...args] = process.argv.slice(2);

switch (mode) {
    case 'nats':
        if (args.length === 0) {
            fail('usage: wait-for-guardian.mjs nats <CLIENT_NAME>...');
        }
        await waitForNatsClients(args);
        break;
    case 'ready':
        await waitForGatewayHttp();
        await waitForServicesReady();
        await waitForDemoLogin();
        break;
    default:
        fail(`unknown mode '${mode ?? ''}'; expected 'nats' or 'ready'`);
}
